import type {
  ApplicationColorMode,
  FoundryExportModuleId,
  FoundryImportModuleInspection,
} from '@dhzh/foundry-api-contract';
import {
  applicationColorModes,
  foundryExportModuleIds,
} from '@dhzh/foundry-api-contract';
import {
  ComputerIcon,
  DatabaseExportIcon,
  DatabaseImportIcon,
  Moon02Icon,
  Sun03Icon,
} from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { useRef, useState } from 'react';

import { useTheme } from '#/components/theme-provider';
import { Alert, AlertDescription, AlertTitle } from '#/components/ui/alert';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '#/components/ui/alert-dialog';
import { Button } from '#/components/ui/button';
import { Checkbox } from '#/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '#/components/ui/dialog';
import { Spinner } from '#/components/ui/spinner';
import { toast } from '#/components/ui/toast';
import {
  ToggleGroup,
  ToggleGroupItem,
} from '#/components/ui/toggle-group';
import { useDataExport } from '#/hooks/use-data-export';
import {
  useDataImport,
  useDataImportInspection,
} from '#/hooks/use-data-import';
import { useUpdateSettings } from '#/hooks/use-settings';

const colorModeOptions = {
  dark: { icon: Moon02Icon, label: 'Dark' },
  light: { icon: Sun03Icon, label: 'Light' },
  system: { icon: ComputerIcon, label: 'System' },
} satisfies Record<ApplicationColorMode, {
  icon: typeof ComputerIcon;
  label: string;
}>;

const importModuleLabels = {
  prompts: 'Prompts',
  providers: 'Providers',
  settings: 'Application Settings',
} satisfies Record<FoundryExportModuleId, string>;

function isColorMode(value: string | undefined): value is ApplicationColorMode {
  return value !== undefined && applicationColorModes.includes(value as ApplicationColorMode);
}

function isFoundryExportModuleId(id: string): id is FoundryExportModuleId {
  return foundryExportModuleIds.includes(id as FoundryExportModuleId);
}

function getImportModuleLabel(id: string): string {
  return isFoundryExportModuleId(id) ? importModuleLabels[id] : id;
}

function describeImportModule(module: FoundryImportModuleInspection): string {
  if (module.status !== 'available') {
    return module.message ?? 'This module cannot be imported.';
  }
  if (module.id === 'settings') {
    return 'Replaces the current application settings.';
  }

  const itemCount = module.itemCount ?? 0;
  const singularLabel = module.id === 'providers' ? 'Provider' : 'Prompt';
  return `${itemCount} ${itemCount === 1 ? singularLabel : `${singularLabel}s`} will be added.`;
}

function describeImportResult(
  modules: Array<{ id: string; importedItems: number; status: string }>,
): string {
  return modules.map((module) => {
    let label: string;
    switch (module.id) {
      case 'prompts': {
        label = 'Prompts';
        break;
      }
      case 'providers': {
        label = 'Providers';
        break;
      }
      case 'settings': {
        label = 'Settings';
        break;
      }
      default: {
        label = module.id;
      }
    }

    if (module.status === 'unsupported') {
      return `${label} skipped`;
    }
    if (module.status === 'failed') {
      return `${label} failed`;
    }
    return module.id === 'providers' || module.id === 'prompts'
      ? `${module.importedItems} ${label} added`
      : `${label} imported`;
  }).join('. ');
}

function getImportToastState(hasImportedModule: boolean, hasIssue: boolean) {
  if (!hasIssue) {
    return { title: 'Data imported', type: 'success' as const };
  }
  if (hasImportedModule) {
    return { title: 'Data imported with issues', type: 'warning' as const };
  }
  return { title: 'Data could not be imported', type: 'error' as const };
}

export function SettingsPage() {
  const [isExportDialogOpen, setIsExportDialogOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [selectedImportModules, setSelectedImportModules]
    = useState<FoundryExportModuleId[]>([]);
  const importInputRef = useRef<HTMLInputElement>(null);
  const { theme } = useTheme();
  const dataExport = useDataExport();
  const dataImport = useDataImport();
  const dataImportInspection = useDataImportInspection();
  const updateSettings = useUpdateSettings();

  const handleValueChange = (values: string[]) => {
    const colorMode = values[0];
    if (colorMode === theme || !isColorMode(colorMode)) {
      return;
    }

    updateSettings.mutate({ colorMode });
  };

  const handleExport = () => {
    dataExport.mutate(undefined, {
      onError: () => {
        toast.add({ title: 'Data could not be exported', type: 'error' });
      },
      onSuccess: ({ content, filename }) => {
        const url = URL.createObjectURL(content);
        const link = document.createElement('a');
        link.download = filename;
        link.href = url;
        document.body.append(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(url);
        setIsExportDialogOpen(false);
        toast.add({ title: 'Data exported', type: 'success' });
      },
    });
  };

  const handleImport = () => {
    if (!importFile || selectedImportModules.length === 0) {
      return;
    }

    dataImport.mutate({ file: importFile, modules: selectedImportModules }, {
      onError: () => {
        toast.add({ title: 'Data could not be imported', type: 'error' });
      },
      onSuccess: ({ modules }) => {
        const hasImportedModule = modules.some((module) => module.status === 'imported');
        const hasIssue = modules.some((module) => module.status !== 'imported');
        const toastState = getImportToastState(hasImportedModule, hasIssue);

        setImportFile(null);
        setSelectedImportModules([]);
        dataImportInspection.reset();
        toast.add({
          description: describeImportResult(modules),
          ...toastState,
        });
      },
    });
  };

  const closeImportDialog = () => {
    setImportFile(null);
    setSelectedImportModules([]);
    dataImport.reset();
    dataImportInspection.reset();
  };

  const inspectImportFile = (file: File) => {
    setImportFile(file);
    setSelectedImportModules([]);
    dataImport.reset();
    dataImportInspection.reset();
    dataImportInspection.mutate(file, {
      onSuccess: ({ modules }) => {
        setSelectedImportModules(modules.flatMap((module) => (
          module.status === 'available' && isFoundryExportModuleId(module.id)
            ? [module.id]
            : []
        )));
      },
    });
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

        <div className="flex items-center gap-2 sm:flex-row-reverse">
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

      <section
        aria-labelledby="data-heading"
        className="grid gap-4 border-b py-5 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"
      >
        <div className="space-y-1">
          <h2 id="data-heading" className="text-sm font-medium">
            Data
          </h2>
          <p className="text-xs/relaxed text-muted-foreground">
            Application Settings, active Providers, and active Prompts.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <input
            ref={importInputRef}
            accept=".foundry,application/octet-stream"
            className="hidden"
            type="file"
            onChange={(event) => {
              const file = event.currentTarget.files?.[0];
              if (file) {
                inspectImportFile(file);
              }
              event.currentTarget.value = '';
            }}
          />
          <Button
            disabled={
              dataImport.isPending
              || dataImportInspection.isPending
              || dataExport.isPending
            }
            type="button"
            variant="outline"
            onClick={() => importInputRef.current?.click()}
          >
            <HugeiconsIcon
              data-icon="inline-start"
              icon={DatabaseImportIcon}
              strokeWidth={2}
            />
            Import Data
          </Button>
          <Button
            disabled={
              dataImport.isPending
              || dataImportInspection.isPending
              || dataExport.isPending
            }
            type="button"
            variant="outline"
            onClick={() => setIsExportDialogOpen(true)}
          >
            <HugeiconsIcon
              data-icon="inline-start"
              icon={DatabaseExportIcon}
              strokeWidth={2}
            />
            Export Data
          </Button>
        </div>
      </section>

      <Dialog
        open={importFile !== null}
        onOpenChange={(open) => {
          if (!open && !dataImport.isPending) {
            closeImportDialog();
          }
        }}
      >
        <DialogContent className="sm:max-w-md" showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>Import Foundry data</DialogTitle>
            <DialogDescription>
              {dataImportInspection.data
                ? `Choose the modules to import from ${importFile?.name ?? 'the selected file'}.`
                : `Reading ${importFile?.name ?? 'the selected file'}...`}
            </DialogDescription>
          </DialogHeader>
          <div aria-live="polite" className="min-h-24">
            {dataImportInspection.isPending && (
              <div className="flex min-h-24 items-center justify-center gap-2 text-xs text-muted-foreground">
                <Spinner />
                <span>Checking Foundry export</span>
              </div>
            )}
            {dataImportInspection.isError && (
              <Alert variant="destructive">
                <AlertTitle>File could not be read</AlertTitle>
                <AlertDescription>
                  The selected file is not a valid Foundry export.
                </AlertDescription>
              </Alert>
            )}
            {dataImportInspection.data && (
              <fieldset>
                <legend className="sr-only">Import modules</legend>
                <div className="divide-y border-y">
                  {dataImportInspection.data.modules.map((module) => {
                    const selectableModuleId = module.status === 'available'
                      && isFoundryExportModuleId(module.id)
                      ? module.id
                      : null;
                    const checkboxId = `import-module-${module.id}`;

                    return (
                      <label
                        className="flex items-start gap-3 py-3"
                        htmlFor={checkboxId}
                        key={module.id}
                      >
                        <Checkbox
                          checked={selectableModuleId !== null
                            && selectedImportModules.includes(selectableModuleId)}
                          disabled={selectableModuleId === null || dataImport.isPending}
                          id={checkboxId}
                          onCheckedChange={(checked) => {
                            if (selectableModuleId === null) {
                              return;
                            }
                            setSelectedImportModules((current) => {
                              if (checked) {
                                return [...current, selectableModuleId];
                              }
                              return current.filter((id) => id !== selectableModuleId);
                            });
                          }}
                        />
                        <span className="min-w-0 space-y-0.5">
                          <span className="block text-xs font-medium">
                            {getImportModuleLabel(module.id)}
                          </span>
                          <span className="block text-xs/relaxed text-muted-foreground">
                            {describeImportModule(module)}
                          </span>
                        </span>
                      </label>
                    );
                  })}
                </div>
              </fieldset>
            )}
          </div>
          <DialogFooter>
            <Button
              disabled={dataImport.isPending}
              type="button"
              variant="outline"
              onClick={closeImportDialog}
            >
              Cancel
            </Button>
            <Button
              disabled={
                dataImport.isPending
                || !dataImportInspection.isSuccess
                || selectedImportModules.length === 0
              }
              type="button"
              onClick={handleImport}
            >
              {dataImport.isPending && <Spinner data-icon="inline-start" />}
              <span>Import</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={isExportDialogOpen}
        onOpenChange={(open) => {
          if (!dataExport.isPending) {
            setIsExportDialogOpen(open);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Export Foundry data?</AlertDialogTitle>
            <AlertDialogDescription>
              The exported file includes Provider API keys. Keep it private and store it securely.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={dataExport.isPending}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={dataExport.isPending}
              onClick={handleExport}
            >
              {dataExport.isPending && <Spinner data-icon="inline-start" />}
              <span>Export</span>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </main>
  );
}
