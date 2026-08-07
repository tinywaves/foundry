import { Avatar } from '@astryxdesign/core/Avatar';
import { Button } from '@astryxdesign/core/Button';
import { Field } from '@astryxdesign/core/Field';
import { FormLayout } from '@astryxdesign/core/FormLayout';
import { Heading } from '@astryxdesign/core/Heading';
import { HStack, StackItem, VStack } from '@astryxdesign/core/Stack';
import { proportional, Table } from '@astryxdesign/core/Table';
import type { TableColumn } from '@astryxdesign/core/Table';
import { Text } from '@astryxdesign/core/Text';
import { TextArea } from '@astryxdesign/core/TextArea';
import { TextInput } from '@astryxdesign/core/TextInput';
import { useId, useMemo } from 'react';
import type {
  ProviderFormErrors,
  ProviderFormField,
  ProviderFormValues,
} from './provider-form-model';
import { getProviderFormField } from './provider-form-model';

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
        verticalAlign="top"
        aria-label="Claude Code model mappings"
      />
      <TextInput
        label="Default fallback model"
        isRequired
        isDisabled={isDisabled}
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
  avatarFileName,
  avatarError,
  hasAvatar,
  isDisabled,
  isSelectingAvatar,
  onFieldChange,
  onSelectAvatar,
  onRemoveAvatar,
  onSubmit,
}: {
  formId: string;
  values: ProviderFormValues;
  errors: ProviderFormErrors;
  avatarUrl: string | undefined;
  avatarFileName: string | undefined;
  avatarError: string | undefined;
  hasAvatar: boolean;
  isDisabled: boolean;
  isSelectingAvatar: boolean;
  onFieldChange: (field: ProviderFormField, value: string) => void;
  onSelectAvatar: () => void;
  onRemoveAvatar: () => void;
  onSubmit: () => void;
}) {
  const avatarGroupId = useId();
  const avatarLabelId = useId();
  const avatarDescription = avatarFileName ?? (hasAvatar ? 'Custom avatar' : 'Default avatar');

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
      <VStack as="section" gap={3}>
        <Heading level={3}>Provider</Heading>
        <FormLayout>
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
              <Avatar src={avatarUrl} alt="Provider avatar preview" size="lg" tooltip={false} />
              <StackItem size="fill">
                <VStack gap={1}>
                  <Text type="supporting" color="secondary" maxLines={1}>
                    {avatarDescription}
                  </Text>
                  <HStack gap={1} wrap="wrap">
                    <Button
                      label={hasAvatar ? 'Replace' : 'Choose image'}
                      variant="secondary"
                      size="sm"
                      isDisabled={isDisabled}
                      isLoading={isSelectingAvatar}
                      clickAction={onSelectAvatar}
                    />
                    {hasAvatar && (
                      <Button
                        label="Remove"
                        variant="ghost"
                        size="sm"
                        isDisabled={isDisabled || isSelectingAvatar}
                        onClick={onRemoveAvatar}
                      />
                    )}
                  </HStack>
                </VStack>
              </StackItem>
            </HStack>
          </Field>
          <TextInput
            label="Name"
            isRequired
            isDisabled={isDisabled}
            value={values.name}
            status={getErrorStatus(errors.name)}
            onChange={(value) => onFieldChange('name', value)}
          />
          <TextArea
            label="Remark"
            isOptional
            isDisabled={isDisabled}
            value={values.remark}
            status={getErrorStatus(errors.remark)}
            rows={3}
            onChange={(value) => onFieldChange('remark', value)}
          />
          <TextInput
            label="Official website"
            isOptional
            isDisabled={isDisabled}
            value={values.officialWebsite}
            status={getErrorStatus(errors.officialWebsite)}
            onChange={(value) => onFieldChange('officialWebsite', value)}
          />
        </FormLayout>
      </VStack>

      <VStack as="section" gap={3}>
        <Heading level={3}>Connection</Heading>
        <FormLayout>
          <TextInput
            label="Base URL"
            isRequired
            isDisabled={isDisabled}
            value={values.baseUrl}
            status={getErrorStatus(errors.baseUrl)}
            onChange={(value) => onFieldChange('baseUrl', value)}
          />
          <TextInput
            label="API key"
            type="password"
            isOptional
            isDisabled={isDisabled}
            value={values.apiKey}
            status={getErrorStatus(errors.apiKey)}
            onChange={(value) => onFieldChange('apiKey', value)}
          />
        </FormLayout>
      </VStack>

      <VStack as="section" gap={3}>
        <Heading level={3}>Models</Heading>
        {values.runtime === 'codex'
          ? (
              <TextInput
                label="Default model"
                isRequired
                isDisabled={isDisabled}
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
