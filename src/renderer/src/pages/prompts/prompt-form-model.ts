import type {
  CreatePromptInput,
  PromptApiError,
  PromptDetail,
  PromptVersionDetail,
} from '../../../../shared/prompt-contract';
import {
  PROMPT_CONTENT_MAX_UTF8_BYTES,
  PROMPT_DESCRIPTION_MAX_CODE_POINTS,
  PROMPT_TITLE_MAX_CODE_POINTS,
} from '../../../../shared/prompt-contract';

export interface PromptFormValues {
  title: string;
  description: string;
  content: string;
}

export type PromptFormField = keyof PromptFormValues;
export type PromptFormErrors = Partial<Record<PromptFormField, string>>;

export type PromptFormValidation
  = | { ok: true; input: CreatePromptInput }
    | { ok: false; errors: PromptFormErrors };

export interface PromptFormApiErrorState {
  errors: PromptFormErrors;
  generalError: string | undefined;
}

const promptFormFields = new Set<PromptFormField>([
  'title',
  'description',
  'content',
]);

export function createPromptFormValues(
  detail?: PromptDetail | PromptVersionDetail,
): PromptFormValues {
  return {
    title: detail?.title ?? '',
    description: detail?.description ?? '',
    content: detail?.content ?? '',
  };
}

export function setPromptFormField(
  values: PromptFormValues,
  field: PromptFormField,
  value: string,
): PromptFormValues {
  return { ...values, [field]: value };
}

export function hasPromptFormChanges(
  values: PromptFormValues,
  initialValues: PromptFormValues,
): boolean {
  return values.title !== initialValues.title
    || values.description !== initialValues.description
    || values.content !== initialValues.content;
}

function countCodePoints(value: string): number {
  let count = 0;
  for (const _character of value) {
    count += 1;
  }
  return count;
}

function hasControlCharacters(value: string): boolean {
  for (const character of value) {
    const codePoint = character.codePointAt(0) ?? 0;
    if (codePoint <= 0x1F || codePoint === 0x7F) {
      return true;
    }
  }
  return false;
}

export function validatePromptForm(values: PromptFormValues): PromptFormValidation {
  const errors: PromptFormErrors = {};
  const title = values.title.trim();
  const description = values.description.trim();

  if (title === '') {
    errors.title = 'This field is required.';
  } else if (countCodePoints(title) > PROMPT_TITLE_MAX_CODE_POINTS) {
    errors.title = `Use at most ${PROMPT_TITLE_MAX_CODE_POINTS} characters.`;
  } else if (hasControlCharacters(title)) {
    errors.title = 'Control characters are not allowed.';
  }

  if (countCodePoints(description) > PROMPT_DESCRIPTION_MAX_CODE_POINTS) {
    errors.description = `Use at most ${PROMPT_DESCRIPTION_MAX_CODE_POINTS} characters.`;
  }

  if (values.content.trim() === '') {
    errors.content = 'This field is required.';
  } else if (new TextEncoder().encode(values.content).byteLength > PROMPT_CONTENT_MAX_UTF8_BYTES) {
    errors.content = `Use at most ${PROMPT_CONTENT_MAX_UTF8_BYTES} bytes of UTF-8 text.`;
  }

  if (Object.keys(errors).length > 0) {
    return { ok: false, errors };
  }

  return {
    ok: true,
    input: {
      title,
      description: description === '' ? null : description,
      content: values.content,
    },
  };
}

function isPromptFormField(value: string): value is PromptFormField {
  return promptFormFields.has(value as PromptFormField);
}

export function getPromptFormApiErrorState(
  error: PromptApiError,
): PromptFormApiErrorState {
  const errors: PromptFormErrors = {};
  let hasUnknownField = false;
  const fieldErrors = error.fields ?? [];
  for (const fieldError of fieldErrors) {
    if (isPromptFormField(fieldError.field)) {
      errors[fieldError.field] = fieldError.message;
    } else {
      hasUnknownField = true;
    }
  }
  return {
    errors,
    generalError: hasUnknownField || fieldErrors.length === 0
      ? error.message
      : undefined,
  };
}
