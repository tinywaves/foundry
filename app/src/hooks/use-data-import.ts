import type {
  FoundryImportResponse,
  FoundryImportResult,
} from '@dhzh/foundry-api-contract';
import { useMutation, useQueryClient } from '@tanstack/react-query';

async function importData(file: File): Promise<FoundryImportResult> {
  const response = await fetch('/api/data/import', {
    body: file,
    headers: { 'content-type': 'application/octet-stream' },
    method: 'POST',
  });
  if (!response.ok) {
    throw new Error('The Foundry Server could not import data.');
  }

  const result = await response.json() as FoundryImportResponse;
  if (result.status !== 'SUCCESS') {
    throw new Error(result.message ?? 'The Foundry Server could not import data.');
  }
  return result.data;
}

export function useDataImport() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: importData,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['providers'] }),
        queryClient.invalidateQueries({ queryKey: ['settings'] }),
      ]);
    },
  });
}
