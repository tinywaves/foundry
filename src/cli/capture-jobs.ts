import { setTimeout as sleep } from 'node:timers/promises';
import type {
  CaptureDetail,
  CaptureSummary,
  FetchJobSummary,
} from '../features/captures/contracts';
import type { CaptureService } from '../features/captures/service';
import { CliInputError } from './shared';

export function newestJob(
  service: CaptureService,
  capture: CaptureSummary,
): FetchJobSummary {
  return service.listJobs(capture.id)[0];
}

export async function captureJobResult(
  service: CaptureService,
  capture: CaptureSummary,
  job: FetchJobSummary,
): Promise<{
  capture: CaptureSummary;
  rawResponse: CaptureDetail['rawResponse'];
  job: FetchJobSummary;
}> {
  const finishedJob = await waitForJob(service, capture.id, job.id);
  const detail = service.get(capture.id);

  return {
    capture: detail.capture,
    rawResponse: detail.rawResponse,
    job: finishedJob,
  };
}

export async function waitForJob(
  service: CaptureService,
  captureId: string,
  jobId: string,
): Promise<FetchJobSummary> {
  let job = findJob(service, captureId, jobId);
  while (job.status !== 'succeeded' && job.status !== 'failed') {
    await sleep(250);
    job = findJob(service, captureId, jobId);
  }

  return job;
}

function findJob(
  service: CaptureService,
  captureId: string,
  jobId: string,
): FetchJobSummary {
  const job = service.getJob(captureId, jobId);
  if (!job) {
    throw new CliInputError('JOB_NOT_FOUND', 'Fetch job not found');
  }

  return job;
}
