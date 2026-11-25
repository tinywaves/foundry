import { parseProviderInput } from '../features/providers/contracts';
import { normalizeSettings } from '../features/settings/contracts';
import { STORAGE_FORMAT_VERSION } from './models';
import type { StorageSnapshot } from './models';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}
function isNullableString(value: unknown): boolean {
  return value === null || typeof value === 'string';
}
export function validateSnapshot(value: unknown): asserts value is StorageSnapshot {
  assert(isRecord(value) && value.formatVersion === STORAGE_FORMAT_VERSION, 'Unsupported Foundry JSON data format');
  assert(isRecord(value.settings), 'Invalid settings');
  normalizeSettings(value.settings);
  for (const collection of ['providers', 'captures', 'fetchJobs']) {
    const rows = value[collection];
    assert(Array.isArray(rows), 'Invalid storage collection');
    const ids = new Set();
    for (const row of rows) {
      assert(isRecord(row) && typeof row.id === 'string' && row.id.length > 0 && row.id.length <= 200 && !ids.has(row.id), 'Invalid or duplicate record ID');
      ids.add(row.id);
      assert(typeof row.createdAt === 'string' && Number.isFinite(Date.parse(row.createdAt)) && typeof row.updatedAt === 'string' && Number.isFinite(Date.parse(row.updatedAt)), 'Invalid record timestamp');
      assert(row.deletedAt === null || (typeof row.deletedAt === 'string' && Number.isFinite(Date.parse(row.deletedAt))), 'Invalid deletion timestamp');
    }
  }
  const snapshot = value as unknown as StorageSnapshot;
  for (const provider of snapshot.providers) {
    try {
      assert(['active', 'disabled', 'deleted'].includes(provider.status), 'Invalid status');
      assert(typeof provider.apiKey === 'string', 'Invalid API key');
      parseProviderInput(provider);
    } catch {
      throw new Error('A provider record is invalid');
    }
  }
  const urls = new Set<string>();
  const captures = new Map(snapshot.captures.map((row) => [row.id, row]));
  const jobs = new Map(snapshot.fetchJobs.map((row) => [row.id, row]));
  for (const capture of snapshot.captures) {
    try {
      assert(['http:', 'https:'].includes(new URL(capture.url).protocol), 'Invalid protocol');
    } catch {
      throw new Error('A capture URL is invalid');
    }
    assert(isNullableString(capture.title) && isNullableString(capture.userNote) && isNullableString(capture.latestSuccessfulJobId), 'A capture record is invalid');
    if (capture.deletedAt) {
      continue;
    }
    assert(!urls.has(capture.url), 'Duplicate active capture URL');
    urls.add(capture.url);
    if (!capture.latestSuccessfulJobId) {
      continue;
    }
    const job = jobs.get(capture.latestSuccessfulJobId);
    assert(job?.captureId === capture.id && job.status === 'succeeded' && !job.deletedAt, 'A capture points to an invalid successful fetch job');
  }
  const activeJobs = new Set<string>();
  for (const job of snapshot.fetchJobs) {
    assert(captures.has(job.captureId) && ['pending', 'running', 'succeeded', 'failed'].includes(job.status) && job.fetcher === 'firecrawl', 'A fetch job record is invalid');
    assert(isRecord(job.configSnapshot), 'A fetch job configuration is invalid');
    assert(job.creditsUsed === null || (typeof job.creditsUsed === 'number' && Number.isFinite(job.creditsUsed)), 'A fetch job credit value is invalid');
    assert(isNullableString(job.errorCode) && isNullableString(job.errorMessage), 'A fetch job record is invalid');
    if (job.deletedAt || !['pending', 'running'].includes(job.status)) {
      continue;
    }
    assert(!activeJobs.has(job.captureId), 'Duplicate active fetch jobs');
    activeJobs.add(job.captureId);
  }
}
