export const promptIpcChannels = {
  list: 'prompts:list',
  get: 'prompts:get',
  create: 'prompts:create',
  update: 'prompts:update',
  moveToTrash: 'prompts:move-to-trash',
  listVersions: 'prompts:list-versions',
  getVersion: 'prompts:get-version',
  restoreVersion: 'prompts:restore-version',
  copy: 'prompts:copy',
  copyVersion: 'prompts:copy-version',
  listTrash: 'prompts:list-trash',
  getTrashed: 'prompts:get-trashed',
  restoreTrashed: 'prompts:restore-trashed',
  removeFromTrash: 'prompts:remove-from-trash',
  emptyTrash: 'prompts:empty-trash',
} as const;

export const PROMPT_TITLE_MAX_CODE_POINTS = 200;
export const PROMPT_DESCRIPTION_MAX_CODE_POINTS = 2000;
export const PROMPT_CONTENT_MAX_UTF8_BYTES = 1024 * 1024;

export interface PromptSummary {
  id: string;
  title: string;
  description: string | null;
  currentVersion: number;
  createdAt: number;
  updatedAt: number;
}

export interface PromptDetail extends PromptSummary {
  content: string;
}

export interface PromptVersionSummary {
  promptId: string;
  version: number;
  createdAt: number;
}

export interface PromptVersionDetail extends PromptVersionSummary {
  title: string;
  description: string | null;
  content: string;
}

export interface TrashedPromptSummary {
  id: string;
  title: string;
  trashedAt: number;
}

export interface TrashedPromptDetail extends TrashedPromptSummary {
  description: string | null;
  content: string;
  currentVersion: number;
  createdAt: number;
  updatedAt: number;
}

export interface CreatePromptInput {
  title: string;
  description: string | null;
  content: string;
}

export interface UpdatePromptInput extends CreatePromptInput {
  id: string;
}

export interface PromptVersionTarget {
  id: string;
  version: number;
}

export type PromptApiErrorCode
  = | 'invalid-input'
    | 'not-found'
    | 'storage-unavailable'
    | 'storage-corrupt'
    | 'unsupported-database-version'
    | 'internal';

export interface PromptFieldError {
  field: string;
  message: string;
}

export interface PromptApiError {
  code: PromptApiErrorCode;
  message: string;
  fields?: PromptFieldError[];
}

export type PromptApiResult<T>
  = | { ok: true; value: T }
    | { ok: false; error: PromptApiError };

export interface PromptApi {
  listPrompts: () => Promise<PromptApiResult<PromptSummary[]>>;
  getPrompt: (id: string) => Promise<PromptApiResult<PromptDetail>>;
  createPrompt: (input: CreatePromptInput) => Promise<PromptApiResult<PromptDetail>>;
  updatePrompt: (input: UpdatePromptInput) => Promise<PromptApiResult<PromptDetail>>;
  movePromptToTrash: (id: string) => Promise<PromptApiResult<undefined>>;
  listPromptVersions: (id: string) => Promise<PromptApiResult<PromptVersionSummary[]>>;
  getPromptVersion: (
    target: PromptVersionTarget,
  ) => Promise<PromptApiResult<PromptVersionDetail>>;
  restorePromptVersion: (
    target: PromptVersionTarget,
  ) => Promise<PromptApiResult<PromptDetail>>;
  copyPrompt: (id: string) => Promise<PromptApiResult<undefined>>;
  copyPromptVersion: (target: PromptVersionTarget) => Promise<PromptApiResult<undefined>>;
  listTrashedPrompts: () => Promise<PromptApiResult<TrashedPromptSummary[]>>;
  getTrashedPrompt: (id: string) => Promise<PromptApiResult<TrashedPromptDetail>>;
  restoreTrashedPrompt: (id: string) => Promise<PromptApiResult<PromptDetail>>;
  removePromptFromTrash: (id: string) => Promise<PromptApiResult<undefined>>;
  emptyPromptTrash: () => Promise<PromptApiResult<number>>;
}
