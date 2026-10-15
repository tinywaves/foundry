import type { ApiStatusCode } from '@dhzh/foundry-api-contract';

export class RuntimeOperationError extends Error {
  constructor(
    readonly status: Exclude<ApiStatusCode, 'SUCCESS'>,
    message: string,
  ) {
    super(message);
  }
}
