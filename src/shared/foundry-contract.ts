import type { ProviderApi } from './provider-contract';
import type { RuntimeApi } from './runtime-contract';

export type FoundryPlatform = 'darwin' | 'linux' | 'win32';

export interface FoundryApi {
  platform: FoundryPlatform;
  providers: ProviderApi;
  runtimes: RuntimeApi;
}
