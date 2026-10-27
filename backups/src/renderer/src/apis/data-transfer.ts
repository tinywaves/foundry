import type {
  DataTransferResult,
  DataTransferStatus,
  ExportDataOutcome,
  ImportCommitOutcome,
  ImportPreview,
  SelectImportFileOutcome,
} from '../../../shared/data-transfer';

export const dataTransferKeys = {
  all: ['data-transfer'] as const,
  status: () => [...dataTransferKeys.all, 'status'] as const,
};

export function getDataTransferStatus(): Promise<DataTransferStatus> {
  return globalThis.api.dataTransfer.getStatus();
}

export function exportData(
  passphrase: string,
): Promise<DataTransferResult<ExportDataOutcome>> {
  return globalThis.api.dataTransfer.exportData(passphrase);
}

export function selectImportFile(): Promise<SelectImportFileOutcome> {
  return globalThis.api.dataTransfer.selectImportFile();
}

export function inspectImport(
  filePath: string,
  passphrase: string,
): Promise<DataTransferResult<ImportPreview>> {
  return globalThis.api.dataTransfer.inspectImport(filePath, passphrase);
}

export function cancelImport(importId: string): Promise<void> {
  return globalThis.api.dataTransfer.cancelImport(importId);
}

export function commitImport(
  importId: string,
): Promise<DataTransferResult<ImportCommitOutcome>> {
  return globalThis.api.dataTransfer.commitImport(importId);
}

export function restartApp(): Promise<void> {
  return globalThis.api.dataTransfer.restart();
}
