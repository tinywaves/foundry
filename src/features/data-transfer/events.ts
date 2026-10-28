import type { DataTransferStatus } from './contracts';

export const DATA_TRANSFER_STATUS_CHANGED_EVENT = 'data-transfer.status.changed';
export const DATA_TRANSFER_IMPORTED_EVENT = 'data-transfer.imported';

export type DataTransferStatusChangedEvent = DataTransferStatus;
