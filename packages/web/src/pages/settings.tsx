import { useState } from 'react';
import {
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { Button } from '@astryxdesign/core/Button';
import { Card } from '@astryxdesign/core/Card';
import { EmptyState } from '@astryxdesign/core/EmptyState';
import { Heading } from '@astryxdesign/core/Heading';
import { Selector } from '@astryxdesign/core/Selector';
import { Spinner } from '@astryxdesign/core/Spinner';
import { Stack } from '@astryxdesign/core/Stack';
import { Text } from '@astryxdesign/core/Text';
import { TextInput } from '@astryxdesign/core/TextInput';
import {
  fetchSettings,
  resetSettings,
  updateSettings,
} from '../api/settings';
import type { SettingEntry } from '../api/settings';

const themeKey = 'ui.theme';
const settingsQueryKey = ['settings'] as const;

function mergeUpdatedSettings(
  settings: readonly SettingEntry[],
  updated: readonly SettingEntry[],
): SettingEntry[] {
  const updatedByKey = new Map(updated.map((entry) => [entry.key, entry]));

  return settings.map((entry) => updatedByKey.get(entry.key) ?? entry);
}

export default function SettingsPage() {
  const [draftTheme, setDraftTheme] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const settingsQuery = useQuery({
    queryKey: settingsQueryKey,
    queryFn: fetchSettings,
  });
  const updateMutation = useMutation({
    mutationFn: updateSettings,
    onSuccess: (updatedSettings) => {
      queryClient.setQueryData<SettingEntry[]>(
        settingsQueryKey,
        (settings = []) => mergeUpdatedSettings(settings, updatedSettings),
      );
      setDraftTheme(null);
    },
  });
  const resetMutation = useMutation({
    mutationFn: resetSettings,
    onSuccess: (updatedSettings) => {
      queryClient.setQueryData<SettingEntry[]>(
        settingsQueryKey,
        (settings = []) => mergeUpdatedSettings(settings, updatedSettings),
      );
      setDraftTheme(null);
    },
  });

  if (settingsQuery.isPending) {
    return (
      <Stack as="section" gap={4} height="100%" align="center" justify="center">
        <Spinner label="Loading settings" size="lg" />
      </Stack>
    );
  }

  if (settingsQuery.isError && !settingsQuery.data) {
    const loadError = settingsQuery.error instanceof Error
      ? settingsQuery.error.message
      : String(settingsQuery.error);

    return (
      <Stack as="section" gap={4} height="100%">
        <Heading level={1}>Settings</Heading>
        <EmptyState
          title="Settings could not be loaded"
          description={loadError}
          actions={
            (
              <Button
                label="Retry"
                variant="primary"
                clickAction={() => {
                  void settingsQuery.refetch();
                }}
              />
            )
          }
          headingLevel={2}
        />
      </Stack>
    );
  }

  const settings = settingsQuery.data;
  const themeSetting = settings.find((entry) => entry.key === themeKey);

  if (!themeSetting) {
    return (
      <Stack as="section" gap={4} height="100%">
        <Heading level={1}>Settings</Heading>
        <EmptyState
          title="Theme setting is unavailable"
          description="The registered ui.theme setting was not returned by Foundry."
          headingLevel={2}
        />
      </Stack>
    );
  }

  const storedTheme = String(themeSetting.value);
  let selectedTheme: string | undefined;

  if (draftTheme !== null) {
    selectedTheme = draftTheme;
  } else if (themeSetting.valid && themeSetting.options.includes(storedTheme)) {
    selectedTheme = storedTheme;
  }

  const hasChanges = draftTheme !== null && draftTheme !== storedTheme;
  const isStoredValueInvalid = !themeSetting.valid && draftTheme === null;
  const mutationError = updateMutation.error ?? resetMutation.error;
  const mutationErrorMessage = mutationError?.message;
  let status:
    | { type: 'error'; message: string }
    | undefined;

  if (isStoredValueInvalid) {
    status = {
      type: 'error',
      message: 'The stored value does not match the registered setting schema.',
    };
  } else if (mutationErrorMessage) {
    status = {
      type: 'error',
      message: mutationErrorMessage,
    };
  }

  const isMutating = updateMutation.isPending || resetMutation.isPending;

  function saveTheme() {
    if (!hasChanges) {
      return;
    }

    updateMutation.mutate([{ key: themeKey, value: draftTheme }]);
  }

  function resetTheme() {
    resetMutation.mutate([themeKey]);
  }

  const themeControl = themeSetting.secret
    ? (
        <TextInput
          label={themeSetting.key}
          type="password"
          value={selectedTheme ?? ''}
          onChange={setDraftTheme}
          status={status}
        />
      )
    : (
        <Selector
          label={themeSetting.key}
          description="Controls the interface color theme."
          options={[...themeSetting.options]}
          value={selectedTheme}
          onChange={setDraftTheme}
          placeholder="Select a theme"
          status={status}
        />
      );

  return (
    <Stack as="section" gap={4} height="100%" isScrollable>
      <Stack gap={1}>
        <Heading level={1}>Settings</Heading>
        <Text as="p" type="supporting">
          Configure the local Foundry runtime.
        </Text>
      </Stack>

      <Card padding={4} maxWidth={560}>
        <Stack gap={4}>
          <Stack gap={1}>
            <Heading level={2}>Interface</Heading>
            <Text as="p" type="supporting">
              Choose how the Foundry interface follows your system appearance.
            </Text>
          </Stack>

          {themeControl}

          <Stack direction="horizontal" gap={2} justify="end">
            <Button
              label="Reset"
              variant="secondary"
              clickAction={resetTheme}
              isDisabled={isMutating}
            />
            <Button
              label="Save"
              variant="primary"
              isDisabled={!hasChanges || isMutating}
              clickAction={saveTheme}
            />
          </Stack>
        </Stack>
      </Card>
    </Stack>
  );
}
