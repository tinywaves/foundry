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
import {
  fetchSettings,
  resetSettings,
  updateSettings,
} from '../api/settings';

const themeKey = 'ui.theme';
const settingsQueryKey = ['settings'] as const;
const themeOptions = ['system', 'light', 'dark'];

export default function SettingsPage() {
  const [draftTheme, setDraftTheme] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const settingsQuery = useQuery({
    queryKey: settingsQueryKey,
    queryFn: fetchSettings,
  });
  const updateMutation = useMutation({
    mutationFn: updateSettings,
    onSuccess: async () => {
      setDraftTheme(null);
      await queryClient.invalidateQueries({ queryKey: settingsQueryKey });
    },
  });
  const resetMutation = useMutation({
    mutationFn: resetSettings,
    onSuccess: async () => {
      setDraftTheme(null);
      await queryClient.invalidateQueries({ queryKey: settingsQueryKey });
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

  const storedTheme = typeof themeSetting.value === 'string'
    ? themeSetting.value
    : '';
  const themeGroup = themeSetting.group;
  const themeName = themeSetting.name;
  const selectedTheme = draftTheme
    ?? (themeOptions.includes(storedTheme) ? storedTheme : undefined);
  const hasChanges = draftTheme !== null && draftTheme !== storedTheme;
  const isStoredValueInvalid = !themeOptions.includes(storedTheme)
    && draftTheme === null;
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

    updateMutation.mutate([
      {
        group: themeGroup,
        name: themeName,
        value: draftTheme,
      },
    ]);
  }

  function resetTheme() {
    resetMutation.mutate([
      {
        group: themeGroup,
        name: themeName,
      },
    ]);
  }

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

          <Selector
            label={themeSetting.key}
            description="Controls the interface color theme."
            options={themeOptions}
            value={selectedTheme}
            onChange={setDraftTheme}
            placeholder="Select a theme"
            status={status}
          />

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
