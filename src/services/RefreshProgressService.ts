import { randomUUID } from 'node:crypto';
import type { mongo } from 'mongoose';

export const REFRESH_LEASE_RENEWAL_MS = 30_000;
const LEASE_MS = 120_000;
const VISIBILITY_MS = 60 * 60 * 1000;
const WRITE_OPTIONS = { writeConcern: { w: 'majority' as const } };

export interface RefreshProgress {
  status: 'in_progress' | 'completed' | 'failed';
  progressPercentage: number;
  startedAt: Date;
  completedAt?: Date;
  estimatedCompletion?: Date;
  currentStep: number;
  totalSteps: number;
  error?: string;
  steps?: Array<{
    step: string;
    success: boolean;
    duration: number;
    error?: string;
  }>;
}

export interface RefreshRun {
  generation: string;
  startedAt: Date;
}

interface RefreshDocument {
  _id: string;
  generation: string;
  leaseUntil: Date;
  expiresAt: Date;
  progress: RefreshProgress;
}

function publicFailure(message: string): string {
  return /rate limit/i.test(message)
    ? 'GitHub API rate limit exceeded. Please wait 10-30 minutes and try again.'
    : 'Data refresh failed';
}

function statusToPersist(progress: RefreshProgress): RefreshProgress {
  const { error, steps, ...fields } = progress;
  return {
    ...fields,
    ...(error == null ? {} : { error: publicFailure(error) }),
    ...(steps == null ? {} : {
      steps: steps.map(({ step, success, duration, error: stepError }) => ({
        step,
        success,
        duration,
        ...(stepError == null ? {} : { error: publicFailure(stepError) }),
      })),
    }),
  };
}

export class RefreshProgressService {
  private readonly indexes = new WeakMap<mongo.Db, Promise<unknown>>();
  private readonly database: () => mongo.Db | undefined;
  private readonly now: () => number;

  constructor(
    database: () => mongo.Db | undefined,
    now: () => number = Date.now,
  ) {
    this.database = database;
    this.now = now;
  }

  private async collection(ensureExpiryIndex = false): Promise<mongo.Collection<RefreshDocument>> {
    const database = this.database();
    if (database == null) throw new Error('Refresh status database unavailable');
    const collection = database.collection<RefreshDocument>('refresh_progress');
    if (!ensureExpiryIndex) return collection;
    let index = this.indexes.get(database);
    if (index == null) {
      index = collection.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 })
        .catch((error: unknown) => {
          this.indexes.delete(database);
          throw error;
        });
      this.indexes.set(database, index);
    }
    await index;
    return collection;
  }

  async begin(username: string, progress: RefreshProgress): Promise<RefreshRun> {
    const collection = await this.collection(true);
    const now = this.now();
    const generation = randomUUID();
    const update = {
      $set: {
        generation,
        progress: statusToPersist(progress),
        leaseUntil: new Date(now + LEASE_MS),
        expiresAt: new Date(now + LEASE_MS + VISIBILITY_MS),
      },
    };
    try {
      await collection.updateOne({ _id: username }, update, { ...WRITE_OPTIONS, upsert: true });
    } catch (error: unknown) {
      if (!(error instanceof Error && 'code' in error && error.code === 11000)) throw error;
      // Only an explicit duplicate-key result is safe to reconcile with a second update.
      const result = await collection.updateOne({ _id: username }, update, WRITE_OPTIONS);
      if (result.matchedCount !== 1) throw error;
    }
    return { generation, startedAt: progress.startedAt };
  }

  async renew(username: string, run: RefreshRun): Promise<boolean> {
    const collection = await this.collection();
    const now = this.now();
    const result = await collection.updateOne(
      { _id: username, generation: run.generation, 'progress.status': 'in_progress',
        leaseUntil: { $gt: new Date(now) } },
      { $set: { leaseUntil: new Date(now + LEASE_MS), expiresAt: new Date(now + LEASE_MS + VISIBILITY_MS) } },
      WRITE_OPTIONS,
    );
    return result.matchedCount === 1;
  }

  async update(username: string, run: RefreshRun, progress: RefreshProgress): Promise<void> {
    const collection = await this.collection();
    const now = this.now();
    const lease = progress.status === 'in_progress' ? LEASE_MS : 0;
    await collection.updateOne(
      { _id: username, generation: run.generation, 'progress.status': 'in_progress',
        leaseUntil: { $gt: new Date(now) } },
      { $set: {
        progress: statusToPersist({ ...progress, startedAt: run.startedAt }),
        leaseUntil: new Date(now + lease),
        expiresAt: new Date(now + lease + VISIBILITY_MS),
      } },
      WRITE_OPTIONS,
    );
  }

  async read(username: string): Promise<RefreshProgress | null> {
    const collection = await this.collection();
    const now = this.now();
    const document = await collection.findOne({ _id: username, expiresAt: { $gt: new Date(now) } });
    if (document == null) return null;
    const { progress, leaseUntil } = document;
    if (progress.status === 'in_progress' && leaseUntil.getTime() <= now) {
      return { ...progress, status: 'failed', error: 'Data refresh was interrupted before completion',
        completedAt: leaseUntil };
    }
    return progress;
  }
}
