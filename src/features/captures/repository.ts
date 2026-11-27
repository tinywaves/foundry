import { randomUUID } from 'node:crypto';
import type { FoundryStorage } from '../../storage/store';
import type { CaptureRecord, FetchJobRecord } from '../../storage/models';
import type { CaptureCounts, CaptureDetail, CaptureFilter, CaptureSummary, FetchJobSummary, StoredJobConfig } from './contracts';
import { CaptureError } from './errors';

export interface JobContext {
  job: FetchJobRecord;
  capture: CaptureRecord;
}
export class CaptureRepository {
  constructor(private readonly storage: FoundryStorage) {}
  private findCapture(id: string): CaptureRecord | null {
    const row = this.storage.get('captures', id);
    return row && !row.deletedAt ? row : null;
  }

  private newJob(captureId: string, config: StoredJobConfig): FetchJobRecord {
    const now = Date.now();
    return {
      id: randomUUID(),
      captureId,
      fetcher: config.fetcher,
      configSnapshot: config,
      rawResponse: null,
      creditsUsed: null,
      status: 'pending',
      errorCode: null,
      errorMessage: null,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    };
  }

  list(filter: CaptureFilter): CaptureSummary[] {
    return this.storage.all('captures').filter((row) => !row.deletedAt && (filter !== 'no-successful' || !row.latestSuccessfulJobId)).toSorted((a, b) => b.createdAt - a.createdAt).map((row) => toCaptureSummary(row));
  }

  counts(): CaptureCounts {
    const rows = this.storage.all('captures').filter((row) => !row.deletedAt);
    return { all: rows.length, noSuccessful: rows.filter((row) => !row.latestSuccessfulJobId).length };
  }

  get(captureId: string): CaptureDetail | null {
    return this.storage.transaction(() => {
      const row = this.findCapture(captureId);
      if (!row) {
        return null;
      }
      const job = row.latestSuccessfulJobId ? this.storage.get('fetchJobs', row.latestSuccessfulJobId) : undefined;
      return {
        capture: toCaptureSummary(row),
        rawResponse: job?.captureId === captureId && !job.deletedAt ? job.rawResponse : null,
      };
    });
  }

  findActiveByURL(url: string): CaptureRecord | null {
    return this.storage.all('captures').find((row) => row.url === url && !row.deletedAt) ?? null;
  }

  createWithJob(url: string, userNote: string | null, config: StoredJobConfig): {
    capture: CaptureSummary;
    jobId: string;
  } {
    return this.storage.transaction(() => {
      if (this.findActiveByURL(url)) {
        throw new CaptureError('CAPTURE_ALREADY_EXISTS', 'This link is already captured');
      }
      const now = Date.now();
      const capture: CaptureRecord = {
        id: randomUUID(),
        url,
        title: null,
        userNote,
        latestSuccessfulJobId: null,
        createdAt: now,
        updatedAt: now,
        deletedAt: null,
      };
      const job = this.newJob(capture.id, config);
      this.storage.put('captures', capture);
      this.storage.put('fetchJobs', job);
      return { capture: toCaptureSummary(capture), jobId: job.id };
    });
  }

  hasActiveJob(captureId: string): boolean {
    return this.storage.all('fetchJobs').some((job) => job.captureId === captureId && !job.deletedAt && ['pending', 'running'].includes(job.status));
  }

  createJob(captureId: string, config: StoredJobConfig): {
    job: FetchJobSummary;
    jobId: string;
  } {
    return this.storage.transaction(() => {
      if (!this.findCapture(captureId)) {
        throw new CaptureError('CAPTURE_NOT_FOUND', 'Capture not found');
      }
      if (this.hasActiveJob(captureId)) {
        throw new CaptureError('ACTIVE_JOB_EXISTS', 'This capture already has an active fetch job');
      }
      const job = this.newJob(captureId, config);
      this.storage.put('fetchJobs', job);
      return { job: toJobSummary(job), jobId: job.id };
    });
  }

  delete(captureId: string): boolean {
    return this.storage.transaction(() => {
      const row = this.findCapture(captureId);
      if (!row) {
        return false;
      }
      if (this.hasActiveJob(captureId)) {
        throw new CaptureError('ACTIVE_JOB_EXISTS', 'This capture already has an active fetch job');
      }
      const now = Date.now();
      this.storage.put('captures', { ...row, deletedAt: now, updatedAt: now });
      for (const job of this.storage.all('fetchJobs')) {
        if (job.captureId === captureId && !job.deletedAt) {
          this.storage.put('fetchJobs', { ...job, deletedAt: now, updatedAt: now });
        }
      }
      return true;
    });
  }

  updateNote(captureId: string, userNote: string): CaptureSummary | null {
    return this.storage.transaction(() => {
      const row = this.findCapture(captureId);
      if (!row) {
        return null;
      }
      const updated = { ...row, userNote: userNote.trim() || null, updatedAt: Date.now() };
      this.storage.put('captures', updated);
      return toCaptureSummary(updated);
    });
  }

  listJobs(captureId: string): FetchJobSummary[] {
    return this.storage.all('fetchJobs').filter((job) => job.captureId === captureId && !job.deletedAt).toSorted((a, b) => b.createdAt - a.createdAt).map((row) => toJobSummary(row));
  }

  getJob(captureId: string, jobId: string): FetchJobSummary | null {
    const context = this.getJobContext(jobId);
    return context?.capture.id === captureId ? toJobSummary(context.job) : null;
  }

  getJobContext(jobId: string): JobContext | null {
    return this.storage.transaction(() => {
      const job = this.storage.get('fetchJobs', jobId);
      if (!job || job.deletedAt) {
        return null;
      }
      const capture = this.findCapture(job.captureId);
      return capture ? { job, capture } : null;
    });
  }

  markRunning(jobId: string): void {
    this.storage.transaction(() => {
      const job = this.storage.get('fetchJobs', jobId);
      if (job?.status === 'pending') {
        this.storage.put('fetchJobs', { ...job, status: 'running', updatedAt: Date.now() });
      }
    });
  }

  markSucceeded(jobId: string, captureId: string, title: string | null, rawResponse: unknown, creditsUsed: number | null): void {
    this.storage.transaction(() => {
      const job = this.storage.get('fetchJobs', jobId);
      const capture = this.findCapture(captureId);
      if (!job || !capture || job.captureId !== captureId) {
        throw new Error('Invalid capture job');
      }
      const now = Date.now();
      this.storage.put('fetchJobs', {
        ...job,
        status: 'succeeded',
        rawResponse,
        creditsUsed,
        errorCode: null,
        errorMessage: null,
        updatedAt: now,
      });
      this.storage.put('captures', {
        ...capture,
        ...(title && { title }),
        latestSuccessfulJobId: jobId,
        updatedAt: now,
      });
    });
  }

  markFailed(jobId: string, errorCode: string, errorMessage: string): void {
    this.storage.transaction(() => {
      const job = this.storage.get('fetchJobs', jobId);
      if (job) {
        this.storage.put('fetchJobs', {
          ...job,
          status: 'failed',
          creditsUsed: null,
          errorCode,
          errorMessage,
          updatedAt: Date.now(),
        });
      }
    });
  }

  recoverRunningJobs(): number {
    return this.storage.transaction(() => {
      const jobs = this.storage.all('fetchJobs').filter((job) => job.status === 'running' && !job.deletedAt);
      for (const job of jobs) {
        this.storage.put('fetchJobs', { ...job, status: 'pending' });
      }
      return jobs.length;
    });
  }

  pendingJobIDs(): string[] {
    return this.storage.all('fetchJobs').filter((job) => job.status === 'pending' && !job.deletedAt).toSorted((a, b) => a.createdAt - b.createdAt).map((job) => job.id);
  }
}
function toCaptureSummary(row: CaptureRecord): CaptureSummary {
  const { deletedAt: _deletedAt, ...summary } = row;
  return summary;
}
function toJobSummary(row: FetchJobRecord): FetchJobSummary {
  return {
    id: row.id,
    captureId: row.captureId,
    status: row.status as FetchJobSummary['status'],
    fetcher: row.fetcher as FetchJobSummary['fetcher'],
    creditsUsed: row.creditsUsed,
    errorCode: row.errorCode,
    errorMessage: row.errorMessage,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}
