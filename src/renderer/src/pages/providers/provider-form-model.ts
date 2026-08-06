import type {
  CreateProviderInput,
  ProviderAvatarSelection,
  ProviderConnectionTestInput,
  ProviderDetail,
  ProviderRuntime,
} from '../../../../shared/provider-contract';

interface ProviderFormValuesBase {
  name: string;
  baseUrl: string;
  apiKey: string;
  remark: string;
  officialWebsite: string;
}

export type ProviderFormValues
  = | ProviderFormValuesBase & {
    runtime: 'codex';
    modelConfig: {
      defaultModel: string;
    };
  }
  | ProviderFormValuesBase & {
    runtime: 'claude-code';
    modelConfig: {
      sonnet: { displayName: string; requestModel: string };
      opus: { displayName: string; requestModel: string };
      fable: { displayName: string; requestModel: string };
      haiku: { displayName: string; requestModel: string };
      subagent: { requestModel: string };
      defaultFallbackModel: string;
    };
  };

export type ProviderFormField
  = | 'name'
    | 'baseUrl'
    | 'apiKey'
    | 'remark'
    | 'officialWebsite'
    | 'modelConfig.defaultModel'
    | 'modelConfig.sonnet.displayName'
    | 'modelConfig.sonnet.requestModel'
    | 'modelConfig.opus.displayName'
    | 'modelConfig.opus.requestModel'
    | 'modelConfig.fable.displayName'
    | 'modelConfig.fable.requestModel'
    | 'modelConfig.haiku.displayName'
    | 'modelConfig.haiku.requestModel'
    | 'modelConfig.subagent.requestModel'
    | 'modelConfig.defaultFallbackModel';

export type ProviderFormErrors = Partial<Record<ProviderFormField, string>>;

export type ProviderAvatarIntent
  = | { kind: 'preserve' }
    | { kind: 'remove' }
    | { kind: 'replace'; selection: ProviderAvatarSelection };

export type ProviderFormValidation
  = | { ok: true; input: CreateProviderInput }
    | { ok: false; errors: ProviderFormErrors };

export type ProviderConnectionFormValidation
  = | { ok: true; input: ProviderConnectionTestInput }
    | { ok: false; errors: Pick<ProviderFormErrors, 'baseUrl'> };

const providerFormFields = new Set<ProviderFormField>([
  'name',
  'baseUrl',
  'apiKey',
  'remark',
  'officialWebsite',
  'modelConfig.defaultModel',
  'modelConfig.sonnet.displayName',
  'modelConfig.sonnet.requestModel',
  'modelConfig.opus.displayName',
  'modelConfig.opus.requestModel',
  'modelConfig.fable.displayName',
  'modelConfig.fable.requestModel',
  'modelConfig.haiku.displayName',
  'modelConfig.haiku.requestModel',
  'modelConfig.subagent.requestModel',
  'modelConfig.defaultFallbackModel',
]);
type CommonProviderFormField = 'name' | 'baseUrl' | 'apiKey' | 'remark' | 'officialWebsite';
const commonProviderFormFields = new Set<ProviderFormField>([
  'name',
  'baseUrl',
  'apiKey',
  'remark',
  'officialWebsite',
]);
const claudeMappingRoles = ['sonnet', 'opus', 'fable', 'haiku'] as const;
type ClaudeMappingRole = typeof claudeMappingRoles[number];
type ClaudeMappingProperty = 'displayName' | 'requestModel';

function isCommonProviderFormField(value: ProviderFormField): value is CommonProviderFormField {
  return commonProviderFormFields.has(value);
}

function isClaudeMappingRole(value: string | undefined): value is ClaudeMappingRole {
  return claudeMappingRoles.includes(value as ClaudeMappingRole);
}

function isClaudeMappingProperty(value: string | undefined): value is ClaudeMappingProperty {
  return value === 'displayName' || value === 'requestModel';
}

export function isProviderFormField(value: string): value is ProviderFormField {
  return providerFormFields.has(value as ProviderFormField);
}

export function createProviderFormValues(runtime: ProviderRuntime): ProviderFormValues {
  const common = {
    name: '',
    baseUrl: '',
    apiKey: '',
    remark: '',
    officialWebsite: '',
  };
  if (runtime === 'codex') {
    return {
      ...common,
      runtime,
      modelConfig: { defaultModel: '' },
    };
  }
  return {
    ...common,
    runtime,
    modelConfig: {
      sonnet: { displayName: 'Sonnet', requestModel: '' },
      opus: { displayName: 'Opus', requestModel: '' },
      fable: { displayName: 'Fable', requestModel: '' },
      haiku: { displayName: 'Haiku', requestModel: '' },
      subagent: { requestModel: '' },
      defaultFallbackModel: '',
    },
  };
}

export function createProviderFormValuesFromDetail(detail: ProviderDetail): ProviderFormValues {
  const common = {
    name: detail.name,
    baseUrl: detail.baseUrl,
    apiKey: detail.apiKey ?? '',
    remark: detail.remark ?? '',
    officialWebsite: detail.officialWebsite ?? '',
  };
  if (detail.runtime === 'codex') {
    return {
      ...common,
      runtime: detail.runtime,
      modelConfig: { defaultModel: detail.modelConfig.defaultModel },
    };
  }
  return {
    ...common,
    runtime: detail.runtime,
    modelConfig: {
      sonnet: { ...detail.modelConfig.sonnet },
      opus: { ...detail.modelConfig.opus },
      fable: { ...detail.modelConfig.fable },
      haiku: { ...detail.modelConfig.haiku },
      subagent: { ...detail.modelConfig.subagent },
      defaultFallbackModel: detail.modelConfig.defaultFallbackModel,
    },
  };
}

export function getProviderFormField(
  values: ProviderFormValues,
  field: ProviderFormField,
): string {
  if (isCommonProviderFormField(field)) {
    return values[field];
  }
  if (values.runtime === 'codex') {
    return field === 'modelConfig.defaultModel' ? values.modelConfig.defaultModel : '';
  }
  if (field === 'modelConfig.defaultFallbackModel') {
    return values.modelConfig.defaultFallbackModel;
  }
  if (field === 'modelConfig.subagent.requestModel') {
    return values.modelConfig.subagent.requestModel;
  }
  const [_, role, property] = field.split('.');
  if (
    isClaudeMappingRole(role)
    && isClaudeMappingProperty(property)
  ) {
    return values.modelConfig[role][property];
  }
  return '';
}

export function setProviderFormField(
  values: ProviderFormValues,
  field: ProviderFormField,
  value: string,
): ProviderFormValues {
  if (isCommonProviderFormField(field)) {
    return { ...values, [field]: value };
  }
  if (values.runtime === 'codex') {
    return field === 'modelConfig.defaultModel'
      ? { ...values, modelConfig: { defaultModel: value } }
      : values;
  }
  if (field === 'modelConfig.defaultFallbackModel') {
    return { ...values, modelConfig: { ...values.modelConfig, defaultFallbackModel: value } };
  }
  if (field === 'modelConfig.subagent.requestModel') {
    return {
      ...values,
      modelConfig: { ...values.modelConfig, subagent: { requestModel: value } },
    };
  }

  const [_, role, property] = field.split('.');
  if (
    isClaudeMappingRole(role)
    && isClaudeMappingProperty(property)
  ) {
    return {
      ...values,
      modelConfig: {
        ...values.modelConfig,
        [role]: { ...values.modelConfig[role], [property]: value },
      },
    };
  }
  return values;
}

export function getProviderAvatarUpdate(intent: ProviderAvatarIntent): {
  avatar?: ProviderAvatarSelection['avatar'] | null;
} {
  if (intent.kind === 'preserve') {
    return {};
  }
  return { avatar: intent.kind === 'remove' ? null : intent.selection.avatar };
}

function addRequiredError(
  errors: ProviderFormErrors,
  field: ProviderFormField,
  value: string,
): string {
  const normalized = value.trim();
  if (normalized === '') {
    errors[field] = 'This field is required.';
  }
  return normalized;
}

function validateHttpUrl(
  errors: ProviderFormErrors,
  field: 'baseUrl' | 'officialWebsite',
  value: string,
  canContainQueryAndFragment: boolean,
): string {
  const normalized = value.trim();
  if (normalized === '') {
    errors[field] = 'This field is required.';
    return normalized;
  }

  let parsed: URL;
  try {
    parsed = new URL(normalized);
  } catch {
    errors[field] = 'Provide a valid HTTP or HTTPS URL.';
    return normalized;
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    errors[field] = 'Use an HTTP or HTTPS URL.';
  } else if (parsed.username || parsed.password) {
    errors[field] = 'URL credentials are not allowed.';
  } else if (!canContainQueryAndFragment && (parsed.search || parsed.hash)) {
    errors[field] = 'Base URL cannot contain a query or fragment.';
  }
  return normalized;
}

export function validateProviderForm(values: ProviderFormValues): ProviderFormValidation {
  const errors: ProviderFormErrors = {};
  const name = addRequiredError(errors, 'name', values.name);
  const baseUrl = validateHttpUrl(errors, 'baseUrl', values.baseUrl, false);
  const remark = values.remark.trim() || null;
  const officialWebsite = values.officialWebsite.trim() === ''
    ? null
    : validateHttpUrl(errors, 'officialWebsite', values.officialWebsite, true);
  const apiKey = values.apiKey === '' ? null : values.apiKey;

  if (values.runtime === 'codex') {
    const defaultModel = addRequiredError(
      errors,
      'modelConfig.defaultModel',
      values.modelConfig.defaultModel,
    );
    if (Object.keys(errors).length > 0) {
      return { ok: false, errors };
    }
    return {
      ok: true,
      input: {
        runtime: values.runtime,
        name,
        baseUrl,
        apiKey,
        remark,
        officialWebsite,
        modelConfig: { version: 1, defaultModel },
      },
    };
  }

  const sonnetDisplayName = addRequiredError(
    errors,
    'modelConfig.sonnet.displayName',
    values.modelConfig.sonnet.displayName,
  );
  const sonnetRequestModel = addRequiredError(
    errors,
    'modelConfig.sonnet.requestModel',
    values.modelConfig.sonnet.requestModel,
  );
  const opusDisplayName = addRequiredError(
    errors,
    'modelConfig.opus.displayName',
    values.modelConfig.opus.displayName,
  );
  const opusRequestModel = addRequiredError(
    errors,
    'modelConfig.opus.requestModel',
    values.modelConfig.opus.requestModel,
  );
  const fableDisplayName = addRequiredError(
    errors,
    'modelConfig.fable.displayName',
    values.modelConfig.fable.displayName,
  );
  const fableRequestModel = addRequiredError(
    errors,
    'modelConfig.fable.requestModel',
    values.modelConfig.fable.requestModel,
  );
  const haikuDisplayName = addRequiredError(
    errors,
    'modelConfig.haiku.displayName',
    values.modelConfig.haiku.displayName,
  );
  const haikuRequestModel = addRequiredError(
    errors,
    'modelConfig.haiku.requestModel',
    values.modelConfig.haiku.requestModel,
  );
  const subagentRequestModel = addRequiredError(
    errors,
    'modelConfig.subagent.requestModel',
    values.modelConfig.subagent.requestModel,
  );
  const defaultFallbackModel = addRequiredError(
    errors,
    'modelConfig.defaultFallbackModel',
    values.modelConfig.defaultFallbackModel,
  );
  if (Object.keys(errors).length > 0) {
    return { ok: false, errors };
  }
  return {
    ok: true,
    input: {
      runtime: values.runtime,
      name,
      baseUrl,
      apiKey,
      remark,
      officialWebsite,
      modelConfig: {
        version: 1,
        sonnet: { displayName: sonnetDisplayName, requestModel: sonnetRequestModel },
        opus: { displayName: opusDisplayName, requestModel: opusRequestModel },
        fable: { displayName: fableDisplayName, requestModel: fableRequestModel },
        haiku: { displayName: haikuDisplayName, requestModel: haikuRequestModel },
        subagent: { requestModel: subagentRequestModel },
        defaultFallbackModel,
      },
    },
  };
}

export function validateProviderConnectionForm(
  values: ProviderFormValues,
): ProviderConnectionFormValidation {
  const errors: Pick<ProviderFormErrors, 'baseUrl'> = {};
  const baseUrl = validateHttpUrl(errors, 'baseUrl', values.baseUrl, false);
  if (errors.baseUrl) {
    return { ok: false, errors };
  }
  return {
    ok: true,
    input: {
      runtime: values.runtime,
      baseUrl,
      apiKey: values.apiKey === '' ? null : values.apiKey,
    },
  };
}
