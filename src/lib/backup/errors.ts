export class BackupCryptoError extends Error {
  constructor(
    readonly code: 'IO_ERROR' | 'INVALID_PASSPHRASE',
    message: string,
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = 'BackupCryptoError';
  }
}
