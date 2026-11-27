import type { DataImportErrorCode } from '@dhzh/foundry-shared';

export class ImportRequestError extends Error {
  constructor(readonly code: DataImportErrorCode) {
    super(code);
  }
}

export async function importData(file: File, passphrase: string): Promise<void> {
  const response = await fetch('/api/data-import', {
    method: 'POST',
    headers: {
      'content-type': 'application/octet-stream',
      'x-foundry-passphrase': encodeURIComponent(passphrase),
    },
    body: file,
  });
  await assertResponse(response);
}

async function assertResponse(response: Response): Promise<void> {
  if (response.ok) {
    return;
  }
  let code: DataImportErrorCode = 'IMPORT_FAILED';
  try {
    const payload = await response.json() as { error?: { code?: string } };
    const value = payload.error?.code;
    if (value === 'INVALID_BACKUP' || value === 'INVALID_PASSPHRASE') {
      code = value;
    }
  } catch {}
  throw new ImportRequestError(code);
}
