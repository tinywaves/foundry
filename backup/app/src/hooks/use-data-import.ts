import type {
  FoundryExportModuleId,
  FoundryImportInspection,
  FoundryImportInspectionResponse,
  FoundryImportResponse,
  FoundryImportResult,
} from '@dhzh/foundry-api-contract';
import { useMutation, useQueryClient } from '@tanstack/react-query';

async function inspectData(file: File): Promise<FoundryImportInspection> {
  const response = await fetch('/api/data/import/inspect', {
    body: file,
    headers: { 'content-type': 'application/octet-stream' },
    method: 'POST',
  });
  if (!response.ok) {
    throw new Error('The Foundry Server could not inspect the selected file.');
  }

  const result = await response.json() as FoundryImportInspectionResponse;
  if (result.status !== 'SUCCESS') {
    throw new Error(
      result.message ?? 'The Foundry Server could not inspect the selected file.',
    );
  }
  return result.data;
}

interface ImportDataInput {
  file: File;
  modules: FoundryExportModuleId[];
}

async function importData({ file, modules }: ImportDataInput): Promise<FoundryImportResult> {
  const response = await fetch(`/api/data/import?modules=${modules.join(',')}`, {
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

export function useDataImportInspection() {
  return useMutation({ mutationFn: inspectData });
}

export function useDataImport() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: importData,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['providers'] }),
        queryClient.invalidateQueries({ queryKey: ['prompts'] }),
        queryClient.invalidateQueries({ queryKey: ['settings'] }),
      ]);
    },
  });
}
