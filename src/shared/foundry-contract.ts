import type { PromptApi } from './prompt-contract';
import type { ProviderApi } from './provider-contract';
import type { RuntimeApi } from './runtime-contract';
import type { SettingsApi } from './settings-contract';

export type FoundryPlatform = 'darwin' | 'linux' | 'win32';

export interface FoundryApi {
  applicationVersion: string;
  platform: FoundryPlatform;
  prompts: PromptApi;
  providers: ProviderApi;
  runtimes: RuntimeApi;
  settings: SettingsApi;
}
