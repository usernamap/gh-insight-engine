/**
 * Rate Limit Handler - Intelligent GitHub API Throttling
 *
 * Prevents rate limit errors by:
 * 1. Limiting concurrent requests (semaphore)
 * 2. Enforcing minimum interval between requests
 * 3. Parsing X-RateLimit-* headers
 * 4. Implementing exponential backoff with jitter
 * 5. Detecting secondary rate limits
 */

import { Semaphore } from './semaphore.js';
import { PriorityQueue, Priority } from './priority-queue.js';
import baseLogger from './logger.js';

const logger = baseLogger.child({ module: 'RateLimitHandler' });

// Configuration constants
const DEFAULT_CONFIG = {
    maxConcurrent: 3,
    minIntervalMs: 200, // 5 requests/second
    threshold: 100, // Reserve 100 requests as buffer
    maxRetries: 5,
    initialBackoffMs: 1000,
    maxBackoffMs: 16000,
    backoffMultiplier: 2,
    jitterFactor: 0.1,
    maxQueueSize: 500000, // Increased to prevent queue overflow errors
    waitOnFullQueue: true, // Backpressure: wait instead of throw
    fullQueueWaitMs: 500, // How long to wait before retry when queue is full
};

// Header names
const HEADERS = {
    REMAINING: 'x-ratelimit-remaining',
    RESET: 'x-ratelimit-reset',
    LIMIT: 'x-ratelimit-limit',
    RETRY_AFTER: 'retry-after',
};

// Secondary rate limit patterns
const SECONDARY_RATE_LIMIT_PATTERNS = [
    'secondary rate limit',
    'abuse detection',
    'you have exceeded a secondary rate limit',
    'too many requests',
];

export interface RateLimitState {
    remaining: number;
    reset: number; // Unix timestamp in seconds
    limit: number;
    lastUpdated: number;
}

export interface RateLimitConfig {
    maxConcurrent?: number;
    minIntervalMs?: number;
    threshold?: number;
    maxRetries?: number;
    initialBackoffMs?: number;
    maxBackoffMs?: number;
    backoffMultiplier?: number;
    jitterFactor?: number;
    maxQueueSize?: number;
    waitOnFullQueue?: boolean;
    fullQueueWaitMs?: number;
}

export interface RequestOptions {
    priority?: Priority;
    retries?: number;
    skipQueue?: boolean;
}

interface QueuedRequest<T> {
    fn: () => Promise<T>;
    // eslint-disable-next-line no-unused-vars
    resolve: (_result: T) => void;
    // eslint-disable-next-line no-unused-vars
    reject: (_reason: Error) => void;
    options: RequestOptions;
    attempts: number;
}

export class RateLimitHandler {
    private readonly config: Required<RateLimitConfig>;
    private readonly semaphore: Semaphore;
    private readonly queue: PriorityQueue<QueuedRequest<unknown>>;
    private state: RateLimitState;
    private lastRequestTime = 0;
    private processing = false;

    constructor(config: RateLimitConfig = {}) {
        this.config = { ...DEFAULT_CONFIG, ...config };
        this.semaphore = new Semaphore(this.config.maxConcurrent);
        this.queue = new PriorityQueue<QueuedRequest<unknown>>();
        this.state = {
            remaining: 5000, // GitHub default
            reset: 0,
            limit: 5000,
            lastUpdated: 0,
        };
    }

    /**
     * Execute a request with rate limiting.
     */
    async execute<T>(
        fn: () => Promise<T>,
        options: RequestOptions = {}
    ): Promise<T> {
        const priority = options.priority ?? 'normal';

        // Implement backpressure: wait for queue capacity instead of throwing
        while (this.queue.size() >= this.config.maxQueueSize) {
            if (this.config.waitOnFullQueue) {
                logger.debug('Rate limit queue full, waiting for capacity', {
                    queueSize: this.queue.size(),
                    maxQueueSize: this.config.maxQueueSize,
                });
                await this.waitForQueueCapacity();
            } else {
                throw new Error('Rate limit queue full - too many pending requests');
            }
        }

        return new Promise<T>((resolve, reject) => {
            const request: QueuedRequest<T> = {
                fn,
                resolve,
                reject,
                options,
                attempts: 0,
            };

            this.queue.enqueue(request as QueuedRequest<unknown>, priority);
            this.processQueue();
        });
    }

    /**
     * Wait for queue to have capacity (backpressure mechanism).
     */
    private async waitForQueueCapacity(): Promise<void> {
        const waitTime = this.config.fullQueueWaitMs;
        await new Promise(resolve => setTimeout(resolve, waitTime));
    }

    /**
     * Process queued requests respecting rate limits.
     */
    private async processQueue(): Promise<void> {
        if (this.processing) return;
        this.processing = true;

        try {
            while (!this.queue.isEmpty()) {
                const request = this.queue.dequeue() as QueuedRequest<unknown> | undefined;
                if (!request) break;

                // Wait for rate limit slot
                await this.waitForSlot();

                // Acquire semaphore permit
                await this.semaphore.acquire();

                try {
                    const result = await this.executeWithRetry(request);
                    request.resolve(result);
                } catch (error) {
                    request.reject(error as Error);
                } finally {
                    this.semaphore.release();
                }
            }
        } finally {
            this.processing = false;
        }
    }

    /**
     * Execute a request with retry logic.
     */
    private async executeWithRetry<T>(request: QueuedRequest<T>): Promise<T> {
        const maxRetries = request.options.retries ?? this.config.maxRetries;

        while (request.attempts <= maxRetries) {
            request.attempts++;

            try {
                const result = await request.fn();
                this.lastRequestTime = Date.now();
                return result;
            } catch (error) {
                const isRateLimit = this.isRateLimitError(error as Error);
                const isSecondary = this.isSecondaryRateLimit(error as Error);

                if (!isRateLimit || request.attempts > maxRetries) {
                    throw error;
                }

                // Calculate backoff
                const backoffMs = this.calculateBackoff(request.attempts, isSecondary);

                logger.warn('Rate limit hit, backing off', {
                    attempt: request.attempts,
                    maxRetries,
                    backoffMs,
                    isSecondary,
                    error: (error as Error).message,
                });

                await this.sleep(backoffMs);
            }
        }

        throw new Error(`Max retries (${maxRetries}) exceeded`);
    }

    /**
     * Wait for a rate limit slot to become available.
     */
    private async waitForSlot(): Promise<void> {
        // Enforce minimum interval between requests
        const elapsed = Date.now() - this.lastRequestTime;
        if (elapsed < this.config.minIntervalMs) {
            await this.sleep(this.config.minIntervalMs - elapsed);
        }

        // Check if we're at the threshold
        if (this.state.remaining <= this.config.threshold && this.state.reset > 0) {
            const now = Math.floor(Date.now() / 1000);
            const waitTime = (this.state.reset - now) * 1000;

            if (waitTime > 0) {
                logger.info('Waiting for rate limit reset', {
                    remaining: this.state.remaining,
                    threshold: this.config.threshold,
                    waitTimeMs: waitTime,
                    resetTime: new Date(this.state.reset * 1000).toISOString(),
                });

                await this.sleep(Math.min(waitTime, 60000)); // Max 60s wait
            }
        }
    }

    /**
     * Update rate limit state from response headers.
     */
    updateFromHeaders(headers: Record<string, string | number | undefined>): void {
        const remaining = headers[HEADERS.REMAINING];
        const reset = headers[HEADERS.RESET];
        const limit = headers[HEADERS.LIMIT];

        if (remaining !== undefined) {
            this.state.remaining = typeof remaining === 'number' ? remaining : parseInt(String(remaining), 10);
        }

        if (reset !== undefined) {
            this.state.reset = typeof reset === 'number' ? reset : parseInt(String(reset), 10);
        }

        if (limit !== undefined) {
            this.state.limit = typeof limit === 'number' ? limit : parseInt(String(limit), 10);
        }

        this.state.lastUpdated = Date.now();

        logger.debug('Rate limit state updated', {
            remaining: this.state.remaining,
            limit: this.state.limit,
            reset: new Date(this.state.reset * 1000).toISOString(),
        });
    }

    /**
     * Parse Retry-After header and wait.
     */
    async handleRetryAfter(headers: Record<string, string | undefined>): Promise<void> {
        const retryAfter = headers[HEADERS.RETRY_AFTER];

        if (retryAfter !== undefined && retryAfter !== '') {
            const seconds = parseInt(retryAfter, 10);
            if (!isNaN(seconds) && seconds > 0) {
                logger.info('Retry-After header present, waiting', { seconds });
                await this.sleep(seconds * 1000);
            }
        }
    }

    /**
     * Check if an error is a rate limit error.
     */
    private isRateLimitError(error: Error): boolean {
        const message = error.message?.toLowerCase() ?? '';
        const status = (error as Error & { status?: number }).status;

        // 429 Too Many Requests or 403 with rate limit message
        if (status === 429) return true;
        if (status === 403 && message.includes('rate limit')) return true;

        return message.includes('rate limit exceeded') || message.includes('api rate limit');
    }

    /**
     * Check if an error is a secondary rate limit error.
     */
    private isSecondaryRateLimit(error: Error): boolean {
        const message = error.message?.toLowerCase() ?? '';
        return SECONDARY_RATE_LIMIT_PATTERNS.some((pattern) =>
            message.includes(pattern.toLowerCase())
        );
    }

    /**
     * Calculate exponential backoff with jitter.
     */
    private calculateBackoff(attempt: number, isSecondary: boolean): number {
        // Secondary rate limits need longer backoff
        const multiplier = isSecondary ? 2 : 1;

        let backoff = this.config.initialBackoffMs * Math.pow(this.config.backoffMultiplier, attempt - 1) * multiplier;
        backoff = Math.min(backoff, this.config.maxBackoffMs);

        // Add jitter (±10%)
        const jitter = backoff * this.config.jitterFactor * (Math.random() * 2 - 1);
        return Math.round(backoff + jitter);
    }

    /**
     * Sleep for the specified duration.
     */
    private sleep(ms: number): Promise<void> {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }

    /**
     * Get current rate limit state.
     */
    getState(): Readonly<RateLimitState> {
        return { ...this.state };
    }

    /**
     * Get queue statistics.
     */
    getStats(): { queueSize: number; available: number; waiting: number } {
        return {
            queueSize: this.queue.size(),
            available: this.semaphore.available(),
            waiting: this.semaphore.waiting(),
        };
    }
}

export default RateLimitHandler;
