import type { ApplicationColorMode } from '@dhzh/foundry-api-contract';
import { applicationColorModes } from '@dhzh/foundry-api-contract';
import {
  ComputerIcon,
  Moon02Icon,
  Sun03Icon,
} from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';

import { useTheme } from '#/components/theme-provider';
import { Alert, AlertDescription, AlertTitle } from '#/components/ui/alert';
import { Spinner } from '#/components/ui/spinner';
import {
  ToggleGroup,
  ToggleGroupItem,
} from '#/components/ui/toggle-group';
import { useUpdateSettings } from '#/hooks/use-settings';

const colorModeOptions = {
  dark: { icon: Moon02Icon, label: 'Dark' },
  light: { icon: Sun03Icon, label: 'Light' },
  system: { icon: ComputerIcon, label: 'System' },
} satisfies Record<ApplicationColorMode, {
  icon: typeof ComputerIcon;
  label: string;
}>;

function isColorMode(value: string | undefined): value is ApplicationColorMode {
  return value !== undefined && applicationColorModes.includes(value as ApplicationColorMode);
}

export function SettingsPage() {
  const { theme } = useTheme();
  const updateSettings = useUpdateSettings();

  const handleValueChange = (values: string[]) => {
    const colorMode = values[0];
    if (colorMode === theme || !isColorMode(colorMode)) {
      return;
    }

    updateSettings.mutate({ colorMode });
  };

  return (
    <main className="w-full pb-12">
      <header className="pb-5">
        <h1 className="text-xl font-semibold">Settings</h1>
      </header>

      <section
        aria-labelledby="color-mode-heading"
        className="grid gap-4 border-y py-5 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"
      >
        <div className="space-y-1">
          <h2 id="color-mode-heading" className="text-sm font-medium">
            Color mode
          </h2>
          <p className="text-xs/relaxed text-muted-foreground">
            Match your system, or use light or dark mode.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <ToggleGroup
            aria-label="Color mode"
            disabled={updateSettings.isPending}
            spacing={0}
            value={[theme]}
            variant="outline"
            onValueChange={handleValueChange}
          >
            {applicationColorModes.map((colorMode) => {
              const option = colorModeOptions[colorMode];

              return (
                <ToggleGroupItem key={colorMode} value={colorMode}>
                  <HugeiconsIcon
                    icon={option.icon}
                    strokeWidth={2}
                    data-icon="inline-start"
                  />
                  {option.label}
                </ToggleGroupItem>
              );
            })}
          </ToggleGroup>
          <span className="grid size-4 place-items-center">
            {updateSettings.isPending
              ? <Spinner aria-label="Saving Color Mode" />
              : null}
          </span>
        </div>

        {updateSettings.isError
          ? (
              <Alert className="sm:col-span-2" variant="destructive">
                <AlertTitle>Color Mode was not saved</AlertTitle>
                <AlertDescription>
                  Check the Foundry Server and try again.
                </AlertDescription>
              </Alert>
            )
          : null}
      </section>
    </main>
  );
}
