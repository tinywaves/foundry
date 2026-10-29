export type ProviderProtocol
  = | 'openai-responses'
    | 'anthropic-messages'
    | 'openai-compatible-chat-completions';

export type ProviderStatus = 'active' | 'disabled' | 'deleted';
export type CustomModel = { id: string; displayName: string | null };
export type RemoteModel = { id: string; displayName?: string };
export type Provider = {
  id: string;
  name: string;
  protocol: ProviderProtocol;
  baseURL: string;
  apiKey: string;
  customModels: CustomModel[];
  status: ProviderStatus;
  /**
  Formatted with the current Time format and Time zone before crossing IPC.
  */
  createdAt: string;
  /**
  Formatted with the current Time format and Time zone before crossing IPC.
  */
  updatedAt: string;
  deletedAt: string | null;
};
export type ProviderSummary = Provider;
export type ProviderListItem = ProviderSummary & { isInUse: boolean };
export type ProviderInput = Pick<
  Provider,
  'name' | 'protocol' | 'baseURL' | 'apiKey' | 'customModels'
> & {
  shouldClearApiKey?: boolean;
};
