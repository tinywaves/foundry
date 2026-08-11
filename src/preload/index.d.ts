import type { FoundryApi } from '../shared/foundry-contract';

declare global {
  interface Window {
    api: FoundryApi;
  }
}
