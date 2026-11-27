import type { DataExportInput } from '@dhzh/foundry-shared';

import { downloadBlob } from '@/lib/download';

export async function exportData(input: DataExportInput): Promise<void> {
  const response = await fetch('/api/data-export', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (!response.ok) {
    throw new Error('Unable to export data');
  }
  const disposition = response.headers.get('content-disposition') ?? '';
  const fileName = (/filename="([^"]+)"/u).exec(disposition)?.[1] ?? 'foundry.foundry-backup';
  downloadBlob(await response.blob(), fileName);
}
