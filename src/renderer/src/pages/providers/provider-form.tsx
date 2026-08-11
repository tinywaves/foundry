import { Field } from '@astryxdesign/core/Field';
import { FormLayout } from '@astryxdesign/core/FormLayout';
import { Icon } from '@astryxdesign/core/Icon';
import { IconButton } from '@astryxdesign/core/IconButton';
import { InputGroup, InputGroupText } from '@astryxdesign/core/InputGroup';
import {
  SegmentedControl,
  SegmentedControlItem,
} from '@astryxdesign/core/SegmentedControl';
import { HStack, VStack } from '@astryxdesign/core/Stack';
import { proportional, Table } from '@astryxdesign/core/Table';
import type { TableColumn } from '@astryxdesign/core/Table';
import { Text } from '@astryxdesign/core/Text';
import { TextArea } from '@astryxdesign/core/TextArea';
import { TextInput } from '@astryxdesign/core/TextInput';
import { Thumbnail } from '@astryxdesign/core/Thumbnail';
import * as stylex from '@stylexjs/stylex';
import { Eye, EyeOff } from 'lucide-react';
import { useId, useMemo, useState } from 'react';
import { providerRuntimes } from '../../../../shared/provider-contract';
import type { ProviderRuntime } from '../../../../shared/provider-contract';
import type {
  ProviderFormErrors,
  ProviderFormField,
  ProviderFormValues,
} from './provider-form-model';
import { getProviderFormField } from './provider-form-model';
import { providerRuntimeLabels } from './provider-runtime';
import { ProviderRuntimeIcon } from './provider-runtime-icon';

interface ClaudeModelRow extends Record<string, unknown> {
  id: string;
  role: string;
  displayNameField: ProviderFormField | null;
  requestModelField: ProviderFormField;
}

const claudeModelRows: ClaudeModelRow[] = [
  {
    id: 'sonnet',
    role: 'Sonnet',
    displayNameField: 'modelConfig.sonnet.displayName',
    requestModelField: 'modelConfig.sonnet.requestModel',
  },
  {
    id: 'opus',
    role: 'Opus',
    displayNameField: 'modelConfig.opus.displayName',
    requestModelField: 'modelConfig.opus.requestModel',
  },
  {
    id: 'fable',
    role: 'Fable',
    displayNameField: 'modelConfig.fable.displayName',
    requestModelField: 'modelConfig.fable.requestModel',
  },
  {
    id: 'haiku',
    role: 'Haiku',
    displayNameField: 'modelConfig.haiku.displayName',
    requestModelField: 'modelConfig.haiku.requestModel',
  },
  {
    id: 'subagent',
    role: 'Subagent',
    displayNameField: null,
    requestModelField: 'modelConfig.subagent.requestModel',
  },
];

function getErrorStatus(message: string | undefined) {
  return message ? { type: 'error' as const, message } : undefined;
}

const styles = stylex.create({
  disabledInputGroup: {
    // TextInput and IconButton already provide their own disabled treatment.
    opacity: 1,
  },
});

function ApiKeyInput({
  value,
  error,
  isDisabled,
  onChange,
}: {
  value: string;
  error: string | undefined;
  isDisabled: boolean;
  onChange: (value: string) => void;
}) {
  const [isVisible, setIsVisible] = useState(false);
  const status = getErrorStatus(error);
  const visibilityLabel = isVisible ? 'Hide API key' : 'Show API key';

  return (
    <InputGroup
      label="API key"
      isOptional
      isDisabled={isDisabled}
      status={status}
      xstyle={isDisabled ? styles.disabledInputGroup : undefined}
    >
      <TextInput
        label="Value"
        isLabelHidden
        type={isVisible ? 'text' : 'password'}
        isDisabled={isDisabled}
        htmlName="apiKey"
        value={value}
        status={status}
        onChange={(nextValue) => {
          if (nextValue === '') {
            setIsVisible(false);
          }
          onChange(nextValue);
        }}
      />
      <InputGroupText>
        <IconButton
          type="button"
          label={visibilityLabel}
          tooltip={visibilityLabel}
          icon={<Icon icon={isVisible ? EyeOff : Eye} size="sm" color="inherit" />}
          variant="ghost"
          size="sm"
          isDisabled={isDisabled || value === ''}
          onClick={() => setIsVisible((current) => !current)}
        />
      </InputGroupText>
    </InputGroup>
  );
}

function ClaudeModelFields({
  values,
  errors,
  isDisabled,
  onFieldChange,
}: {
  values: Extract<ProviderFormValues, { runtime: 'claude-code' }>;
  errors: ProviderFormErrors;
  isDisabled: boolean;
  onFieldChange: (field: ProviderFormField, value: string) => void;
}) {
  const columns = useMemo<Array<TableColumn<ClaudeModelRow>>>(() => [
    {
      key: 'role',
      header: 'Model role',
      width: proportional(1),
      renderCell: ({ role }) => <Text type="label">{role}</Text>,
    },
    {
      key: 'displayName',
      header: 'Display name',
      width: proportional(2),
      renderCell: ({ role, displayNameField }) => displayNameField === null
        ? <Text type="supporting" color="secondary">Not applicable</Text>
        : (
            <TextInput
              label={`${role} display name`}
              isLabelHidden
              isRequired
              isDisabled={isDisabled}
              htmlName={displayNameField}
              value={getProviderFormField(values, displayNameField)}
              status={getErrorStatus(errors[displayNameField])}
              statusVariant="tooltip"
              width="100%"
              onChange={(value) => onFieldChange(displayNameField, value)}
            />
          ),
    },
    {
      key: 'requestModel',
      header: 'Actual request model',
      width: proportional(2),
      renderCell: ({ role, requestModelField }) => (
        <TextInput
          label={`${role} request model`}
          isLabelHidden
          isRequired
          isDisabled={isDisabled}
          htmlName={requestModelField}
          value={getProviderFormField(values, requestModelField)}
          status={getErrorStatus(errors[requestModelField])}
          statusVariant="tooltip"
          width="100%"
          onChange={(value) => onFieldChange(requestModelField, value)}
        />
      ),
    },
  ], [errors, isDisabled, onFieldChange, values]);

  return (
    <VStack gap={3}>
      <Table
        data={claudeModelRows}
        columns={columns}
        idKey="id"
        rowCount={claudeModelRows.length}
        density="balanced"
        dividers="rows"
        verticalAlign="middle"
        aria-label="Claude Code model mappings"
      />
      <TextInput
        label="Default fallback model"
        isRequired
        isDisabled={isDisabled}
        htmlName="modelConfig.defaultFallbackModel"
        value={values.modelConfig.defaultFallbackModel}
        status={getErrorStatus(errors['modelConfig.defaultFallbackModel'])}
        onChange={(value) => onFieldChange('modelConfig.defaultFallbackModel', value)}
      />
    </VStack>
  );
}

export function ProviderForm({
  formId,
  values,
  errors,
  avatarUrl,
  avatarError,
  hasAvatar,
  isDisabled,
  isSelectingAvatar,
  isRuntimeChangeDisabled,
  runtimeChangeDisabledMessage,
  onFieldChange,
  onRuntimeChange,
  onSelectAvatar,
  onRemoveAvatar,
  onSubmit,
}: {
  formId: string;
  values: ProviderFormValues;
  errors: ProviderFormErrors;
  avatarUrl: string | undefined;
  avatarError: string | undefined;
  hasAvatar: boolean;
  isDisabled: boolean;
  isSelectingAvatar: boolean;
  isRuntimeChangeDisabled: boolean;
  runtimeChangeDisabledMessage: string | undefined;
  onFieldChange: (field: ProviderFormField, value: string) => void;
  onRuntimeChange: ((runtime: ProviderRuntime) => void) | undefined;
  onSelectAvatar: () => void;
  onRemoveAvatar: () => void;
  onSubmit: () => void;
}) {
  const avatarGroupId = useId();
  const avatarLabelId = useId();
  const runtimeGroupId = useId();
  const runtimeLabelId = useId();

  return (
    <VStack
      as="form"
      id={formId}
      gap={6}
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
    >
      <VStack as="section" aria-label="Provider details">
        <FormLayout>
          {onRuntimeChange && (
            <Field
              label="Runtime"
              inputID={runtimeGroupId}
              labelID={runtimeLabelId}
              isGroupLabel
              isRequired
            >
              <HStack
                id={runtimeGroupId}
                role="group"
                aria-labelledby={runtimeLabelId}
                width="100%"
              >
                <SegmentedControl
                  value={values.runtime}
                  label="Provider runtime"
                  layout="fill"
                  isDisabled={isDisabled || isRuntimeChangeDisabled}
                  disabledMessage={runtimeChangeDisabledMessage}
                  onChange={(value) => {
                    if (providerRuntimes.includes(value as ProviderRuntime)) {
                      onRuntimeChange(value as ProviderRuntime);
                    }
                  }}
                >
                  {providerRuntimes.map((runtime) => (
                    <SegmentedControlItem
                      key={runtime}
                      value={runtime}
                      label={providerRuntimeLabels[runtime]}
                      icon={<ProviderRuntimeIcon runtime={runtime} />}
                    />
                  ))}
                </SegmentedControl>
              </HStack>
            </Field>
          )}
          <Field
            label="Avatar"
            inputID={avatarGroupId}
            labelID={avatarLabelId}
            isGroupLabel
            isOptional
            status={getErrorStatus(avatarError)}
            statusVariant="detached"
          >
            <HStack
              id={avatarGroupId}
              role="group"
              aria-labelledby={avatarLabelId}
              gap={3}
              vAlign="center"
              wrap="wrap"
            >
              <Thumbnail
                src={avatarUrl}
                alt="Provider avatar preview"
                label="Provider avatar picker"
                isDisabled={isDisabled || isSelectingAvatar}
                isLoading={isSelectingAvatar}
                showRemoveOn="always"
                onClick={onSelectAvatar}
                onRemove={hasAvatar ? onRemoveAvatar : undefined}
              />
            </HStack>
          </Field>
          <TextInput
            label="Name"
            isRequired
            isDisabled={isDisabled}
            htmlName="name"
            value={values.name}
            status={getErrorStatus(errors.name)}
            onChange={(value) => onFieldChange('name', value)}
          />
          <TextArea
            label="Remark"
            isOptional
            isDisabled={isDisabled}
            htmlName="remark"
            value={values.remark}
            status={getErrorStatus(errors.remark)}
            rows={3}
            onChange={(value) => onFieldChange('remark', value)}
          />
          <TextInput
            label="Official website"
            isOptional
            isDisabled={isDisabled}
            htmlName="officialWebsite"
            value={values.officialWebsite}
            status={getErrorStatus(errors.officialWebsite)}
            onChange={(value) => onFieldChange('officialWebsite', value)}
          />
        </FormLayout>
      </VStack>

      <VStack as="section" aria-label="Provider connection">
        <FormLayout>
          <TextInput
            label="Base URL"
            isRequired
            isDisabled={isDisabled}
            htmlName="baseUrl"
            value={values.baseUrl}
            status={getErrorStatus(errors.baseUrl)}
            onChange={(value) => onFieldChange('baseUrl', value)}
          />
          <ApiKeyInput
            key={values.runtime}
            value={values.apiKey}
            error={errors.apiKey}
            isDisabled={isDisabled}
            onChange={(value) => onFieldChange('apiKey', value)}
          />
        </FormLayout>
      </VStack>

      <VStack as="section" aria-label="Provider models">
        {values.runtime === 'codex'
          ? (
              <TextInput
                label="Default model"
                isRequired
                isDisabled={isDisabled}
                htmlName="modelConfig.defaultModel"
                value={values.modelConfig.defaultModel}
                status={getErrorStatus(errors['modelConfig.defaultModel'])}
                onChange={(value) => onFieldChange('modelConfig.defaultModel', value)}
              />
            )
          : (
              <ClaudeModelFields
                values={values}
                errors={errors}
                isDisabled={isDisabled}
                onFieldChange={onFieldChange}
              />
            )}
      </VStack>
    </VStack>
  );
}
