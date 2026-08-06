import type { FoundryApi } from '../shared/provider-contract';

declare global {
  interface Window {
    api: FoundryApi;
  }
}
