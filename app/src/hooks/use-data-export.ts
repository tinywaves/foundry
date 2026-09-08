import { useMutation } from '@tanstack/react-query';

interface FoundryExportDownload {
  content: Blob;
  filename: string;
}

function readFilename(response: Response): string {
  const contentDisposition = response.headers.get('content-disposition');
  const match = contentDisposition?.match(/filename="([^"]+\.foundry)"/u);

  return match?.[1] ?? 'foundry-export.foundry';
}

async function exportData(): Promise<FoundryExportDownload> {
  const response = await fetch('/api/data/export', { cache: 'no-store' });
  if (!response.ok) {
    throw new Error('The Foundry Server could not export data.');
  }

  return {
    content: await response.blob(),
    filename: readFilename(response),
  };
}

export function useDataExport() {
  return useMutation({ mutationFn: exportData });
}
