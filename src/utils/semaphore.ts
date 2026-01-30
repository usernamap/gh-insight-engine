/**
 * Semaphore - Concurrency Control Utility
 *
 * Limits the number of concurrent operations to prevent
 * overwhelming external APIs with parallel requests.
 *
 * @example
 * const sem = new Semaphore(3); // Max 3 concurrent
 * await sem.acquire();
 * try {
 *   await doWork();
 * } finally {
 *   sem.release();
 * }
 */

export class Semaphore {
    private permits: number;
    private readonly maxPermits: number;
    private waitQueue: Array<() => void> = [];

    constructor(permits: number) {
        if (permits < 1) {
            throw new Error('Semaphore must have at least 1 permit');
        }
        this.permits = permits;
        this.maxPermits = permits;
    }

    /**
     * Acquire a permit. If none available, wait until one is released.
     */
    async acquire(): Promise<void> {
        if (this.permits > 0) {
            this.permits--;
            return;
        }

        // No permits available, wait in queue
        return new Promise<void>((resolve) => {
            this.waitQueue.push(resolve);
        });
    }

    /**
     * Release a permit, allowing a waiting operation to proceed.
     */
    release(): void {
        if (this.waitQueue.length > 0) {
            // Someone is waiting, let them proceed
            const next = this.waitQueue.shift();
            if (next) {
                next();
            }
        } else {
            // No one waiting, increment permits
            this.permits = Math.min(this.permits + 1, this.maxPermits);
        }
    }

    /**
     * Get the number of available permits.
     */
    available(): number {
        return this.permits;
    }

    /**
     * Get the number of operations waiting for a permit.
     */
    waiting(): number {
        return this.waitQueue.length;
    }

    /**
     * Execute a function with automatic acquire/release.
     */
    async withPermit<T>(fn: () => Promise<T>): Promise<T> {
        await this.acquire();
        try {
            return await fn();
        } finally {
            this.release();
        }
    }
}

export default Semaphore;
