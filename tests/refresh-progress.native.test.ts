import assert from 'node:assert/strict';
import { test } from 'node:test';
import mongoose from 'mongoose';
import {
  RefreshProgressService,
  type RefreshProgress,
} from '../src/services/RefreshProgressService';

const databaseUrl = process.env.REFRESH_PROGRESS_FIXTURE_DB;
if (databaseUrl == null || !/^mongodb:\/\/127\.0\.0\.1:\d{1,5}\/refresh_progress_fixture_[a-f0-9]{12}$/.test(databaseUrl)) {
  throw new Error('The refresh progress test requires an isolated local MongoDB fixture');
}

function initial(now: number): RefreshProgress {
  return {
    status: 'in_progress',
    progressPercentage: 0,
    startedAt: new Date(now),
    currentStep: 1,
    totalSteps: 3,
    steps: [],
  };
}

test('refresh status survives a connection replacement and stale callbacks cannot replace it', async () => {
  let now = Date.now();
  const writerConnection = await mongoose.createConnection(databaseUrl, { serverSelectionTimeoutMS: 3_000 }).asPromise();
  const readerConnection = await mongoose.createConnection(databaseUrl, { serverSelectionTimeoutMS: 3_000 }).asPromise();
  const writer = new RefreshProgressService(() => writerConnection.db, () => now);
  const reader = new RefreshProgressService(() => readerConnection.db, () => now);
  try {
    assert.equal(await reader.read('unrelated-user'), null);
    const older = await writer.begin('owner', initial(now));
    now += 5;
    const current = await reader.begin('owner', initial(now));
    assert.notEqual(current.generation, older.generation);
    assert.equal(await writer.renew('owner', older), false);
    await writer.update('owner', older, { ...initial(now), status: 'completed' });
    await writerConnection.close();
    const live = await reader.read('owner');
    assert.equal(live?.status, 'in_progress');
    assert.deepEqual(live?.startedAt, current.startedAt);
    assert.equal(await reader.read('unrelated-user'), null);

    await reader.update('owner', current, {
      ...initial(now + 10),
      status: 'failed',
      completedAt: new Date(now),
      error: 'sensitive provider response from fixture',
    });
    assert.equal(await reader.renew('owner', current), false);
    await reader.update('owner', current, { ...initial(now), status: 'completed' });
    const terminal = await reader.read('owner');
    assert.equal(terminal?.status, 'failed');
    assert.equal(terminal?.error, 'Data refresh failed');
    assert.deepEqual(terminal?.startedAt, current.startedAt);
    const indexes = await readerConnection.db!.collection('refresh_progress').listIndexes().toArray();
    assert.ok(indexes.some(index => index.key.expiresAt === 1 && index.expireAfterSeconds === 0));
    now += 60 * 60 * 1000;
    assert.equal(await reader.read('owner'), null);
  } finally {
    await writerConnection.close();
    await readerConnection.close();
  }
});

test('expired worker lease is reported as interrupted and cannot produce a late success', async () => {
  let now = Date.now();
  const connection = await mongoose.createConnection(databaseUrl, { serverSelectionTimeoutMS: 3_000 }).asPromise();
  const store = new RefreshProgressService(() => connection.db, () => now);
  try {
    const run = await store.begin('interrupted', initial(now));
    now += 30_000;
    assert.equal(await store.renew('interrupted', run), true);
    now += 119_999;
    assert.equal((await store.read('interrupted'))?.status, 'in_progress');
    now++;
    assert.equal(await store.renew('interrupted', run), false);
    await store.update('interrupted', run, { ...initial(now), status: 'completed' });
    const failed = await store.read('interrupted');
    assert.equal(failed?.status, 'failed');
    assert.equal(failed?.error, 'Data refresh was interrupted before completion');
    assert.deepEqual(failed?.completedAt, new Date(now));
  } finally {
    await connection.close();
  }
});

test('concurrent starts for the same account have one current status generation', async () => {
  const connection = await mongoose.createConnection(databaseUrl, { serverSelectionTimeoutMS: 3_000 }).asPromise();
  const store = new RefreshProgressService(() => connection.db);
  try {
    const launches = await Promise.all(Array.from({ length: 12 }, () =>
      store.begin('parallel', initial(Date.now()))));
    assert.equal(new Set(launches.map(run => run.generation)).size, launches.length);
    const current = await Promise.all(launches.map(run => store.renew('parallel', run)));
    assert.equal(current.filter(Boolean).length, 1);
    assert.equal((await store.read('parallel'))?.status, 'in_progress');
    assert.equal(await connection.db!.collection('refresh_progress').countDocuments({ _id: 'parallel' }), 1);
  } finally {
    await connection.close();
  }
});
