import type {
  DataTransferResult,
  DataTransferStatus,
  DataTransferErrorCode,
  ExportDataOutcome,
  ImportCommitOutcome,
  ImportPreview,
} from './types';
import { errorResult, requestJSON, toApiError } from '../../lib/api';

export const dataTransferKeys = {
  all: ['data-transfer'] as const,
  status: () => [...dataTransferKeys.all, 'status'] as const,
};

export function getDataTransferStatus(): Promise<DataTransferStatus> {
  return requestJSON<DataTransferStatus>('/api/data-transfer/status');
}

export async function exportData(
  passphrase: string,
): Promise<DataTransferResult<ExportDataOutcome>> {
  try {
    const response = await fetch('/api/data-transfer/export', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ passphrase }),
    });
    if (!response.ok) {
      throw toApiError(await readErrorPayload(response), response.status);
    }

    const fileName = readExportFileName(response);
    const blob = await response.blob();
    const objectURL = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = objectURL;
    anchor.download = fileName;
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(objectURL), 0);

    return {
      ok: true,
      data: {
        providerCount: readCount(response, 'x-foundry-provider-count'),
        captureCount: readCount(response, 'x-foundry-capture-count'),
        jobCount: readCount(response, 'x-foundry-job-count'),
      },
    };
  } catch (error) {
    return transferFailure(error);
  }
}

export type SelectImportFileOutcome
  = | { status: 'canceled' }
    | { status: 'selected'; file: File; fileName: string };

export function selectImportFile(): Promise<SelectImportFileOutcome> {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.foundry-backup,application/octet-stream';
    input.addEventListener('change', () => {
      const file = input.files?.[0];
      resolve(file
        ? { status: 'selected', file, fileName: file.name }
        : { status: 'canceled' });
    }, { once: true });
    input.addEventListener('cancel', () => {
      resolve({ status: 'canceled' });
    }, { once: true });
    input.click();
  });
}

export async function inspectImport(
  file: File,
  passphrase: string,
): Promise<DataTransferResult<ImportPreview>> {
  const form = new FormData();
  form.append('file', file);
  form.append('passphrase', passphrase);
  try {
    const preview = await requestJSON<ImportPreview>('/api/data-transfer/inspect', {
      method: 'POST',
      body: form,
    });
    return { ok: true, data: preview };
  } catch (error) {
    return transferFailure(error);
  }
}

export async function cancelImport(importId: string): Promise<void> {
  const response = await fetch(`/api/data-transfer/imports/${importId}`, {
    method: 'DELETE',
  });
  if (!response.ok) {
    throw toApiError(await readErrorPayload(response), response.status);
  }
}

export async function commitImport(
  importId: string,
): Promise<DataTransferResult<ImportCommitOutcome>> {
  try {
    const result = await requestJSON<ImportCommitOutcome>(
      `/api/data-transfer/imports/${importId}/commit`,
      { method: 'POST' },
    );
    return { ok: true, data: result };
  } catch (error) {
    return transferFailure(error);
  }
}

export function restartApp(): void {
  location.reload();
}

function transferFailure<T>(error: unknown): DataTransferResult<T> {
  const result = errorResult(error);
  return {
    ok: false,
    error: {
      code: result.error.code as DataTransferErrorCode,
      message: result.error.message,
    },
  };
}

function readExportFileName(response: Response): string {
  const disposition = response.headers.get('content-disposition') ?? '';
  return (/filename="([^"]+)"/u).exec(disposition)?.[1] ?? 'foundry.foundry-backup';
}

function readCount(response: Response, header: string): number {
  return Number(response.headers.get(header) ?? 0);
}

async function readErrorPayload(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}
