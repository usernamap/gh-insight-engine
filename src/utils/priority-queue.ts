/**
 * Priority Queue - Request Ordering Utility
 *
 * Orders requests by priority (high > normal > low) and timestamp (FIFO within priority).
 * Used by RateLimitHandler to ensure critical requests are processed first.
 */

export type Priority = 'high' | 'normal' | 'low';

interface QueueItem<T> {
    item: T;
    priority: Priority;
    timestamp: number;
}

const PRIORITY_VALUES: Record<Priority, number> = {
    high: 3,
    normal: 2,
    low: 1,
};

export class PriorityQueue<T> {
    private items: QueueItem<T>[] = [];

    /**
     * Add an item to the queue with the given priority.
     */
    enqueue(item: T, priority: Priority = 'normal'): void {
        const queueItem: QueueItem<T> = {
            item,
            priority,
            timestamp: Date.now(),
        };

        // Find insertion point to maintain sorted order
        let insertIndex = this.items.length;
        for (let i = 0; i < this.items.length; i++) {
            const existing = this.items[i];
            const existingPriority = PRIORITY_VALUES[existing.priority];
            const newPriority = PRIORITY_VALUES[priority];

            // Insert before items with lower priority
            // For same priority, maintain FIFO (insert at end of same-priority group)
            if (newPriority > existingPriority) {
                insertIndex = i;
                break;
            }
        }

        this.items.splice(insertIndex, 0, queueItem);
    }

    /**
     * Remove and return the highest priority item.
     */
    dequeue(): T | undefined {
        const item = this.items.shift();
        return item?.item;
    }

    /**
     * Peek at the highest priority item without removing it.
     */
    peek(): T | undefined {
        return this.items[0]?.item;
    }

    /**
     * Get the number of items in the queue.
     */
    size(): number {
        return this.items.length;
    }

    /**
     * Check if the queue is empty.
     */
    isEmpty(): boolean {
        return this.items.length === 0;
    }

    /**
     * Clear all items from the queue.
     */
    clear(): void {
        this.items = [];
    }

    /**
     * Get counts by priority level.
     */
    countByPriority(): Record<Priority, number> {
        return {
            high: this.items.filter((i) => i.priority === 'high').length,
            normal: this.items.filter((i) => i.priority === 'normal').length,
            low: this.items.filter((i) => i.priority === 'low').length,
        };
    }
}

export default PriorityQueue;
