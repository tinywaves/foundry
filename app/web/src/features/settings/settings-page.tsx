import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { RecordRow, IconGlyph, FormInput, SettingsNav, SelectField, SettingsNavSection, SettingsNavItem, Modal, Ratio, NumberField, ContentPane } from '@/components/workbench';
import { Spinner } from '@/components/ui/spinner';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Card } from '@/components/ui/card';
import { isValidElement, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import type { IconComponent, SearchableSetting, PanelId, PanelProps, SettingsState, TimeFormatPattern, TimeZoneCode, CaptureSettings } from './types';
import { Search as MagnifyingGlassIcon, ChevronRight as ChevronRightIcon, Terminal as CommandLineIcon, Monitor as ComputerDesktopIcon, Moon as MoonIcon, Sparkles as SparklesIcon, Sun as SunIcon, Paintbrush as PaintBrushIcon, Clock as ClockIcon, Globe as GlobeAltIcon, Languages as LanguageIcon, RefreshCcw as ArrowPathRoundedSquareIcon, ArrowUpWideNarrow as BarsArrowUpIcon, Bug as BugAntIcon, KeyRound as KeyIcon, Download as ArrowDownTrayIcon, Upload as ArrowUpTrayIcon, Folder as FolderIcon, FolderOpen as FolderOpenIcon, X as XMarkIcon } from 'lucide-react';
import type { SettingsSearch } from './search';
import { useI18n } from '../../i18n';
import { fetcherLabelKey } from '../../i18n/fetchers';
import { FETCHER_TYPES } from '../../shared/settings';
import { panelConfig, PANEL_GROUPS, DEFAULT_PANEL } from './config';
import { useQuery } from '@tanstack/react-query';
import { dataTransferKeys, getDataTransferStatus, selectImportFile } from '../data-transfer/api';
import { useAppToast } from '../../lib/api';
import { ExportDataDialog, ImportDataDialog } from '../data-transfer/data-transfer-card';
import { openConfigFolder } from './api';
import { useSearchParams } from 'react-router-dom';
import { useSettingsSearch } from './search';
import { useSettings } from './use-settings';
import { DownloadSkillDialog } from './download-skill-dialog';

function SettingsCard({ title, children }: {
  title?: string;
  children: ReactNode;
}) {
  const rows = (Array.isArray(children) ? children : [children])
    .filter((row): row is ReactNode => Boolean(row));
  return (
    <div className="flex flex-col gap-1.5">
      {title != null && (
        <span className="text-xs text-muted-foreground font-semibold">
          {title}
        </span>
      )}
      <Card className="p-0 w-full">
        <ul role="list" className="flex flex-col gap-0">
          {rows.map((row, index) => {
            const isNotFirstRow = index > 0;
            return (
              <li key={isValidElement(row) ? row.key : undefined} className="flex flex-col gap-0">
                {isNotFirstRow && <Separator />}
                <div className="flex flex-col">{row}</div>
              </li>
            );
          })}
        </ul>
      </Card>
    </div>
  );
}

function SettingsRow({ title, titleAccessory, description, icon, control, detail }: {
  title: string;
  titleAccessory?: ReactNode;
  description?: ReactNode;
  icon: IconComponent;
  control?: ReactNode;
  detail?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2 p-4">
      <div data-settings-line className="flex flex-row items-center gap-3 max-[680px]:flex-col max-[680px]:items-stretch max-[680px]:gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex flex-row items-start gap-2">
            <div className="flex flex-col pt-0.5">
              <IconGlyph icon={icon} className="size-4 shrink-0" />
            </div>
            <div className="min-w-0 max-w-[420px] wrap-anywhere max-[680px]:max-w-none flex flex-col gap-0.5">
              {titleAccessory == null
                ? (<span className="text-sm font-medium">{title}</span>)
                : (
                    <div className="flex flex-row items-center gap-1.5">
                      <span className="text-sm font-medium">{title}</span>
                      {titleAccessory}
                    </div>
                  )}
              {description != null && (
                <span className="text-xs text-muted-foreground">
                  {description}
                </span>
              )}
            </div>
          </div>
        </div>
        {control != null && (
          <div data-settings-control className="min-w-0 max-w-full shrink-0 items-start [--settings-control-width:260px] max-[680px]:w-full max-[680px]:self-start max-[680px]:[--settings-control-width:min(260px,100%)] flex flex-col">
            {control}
          </div>
        )}
      </div>
      {detail}
    </div>
  );
}
function SettingsSearchInput({ search, hasAutoFocus = false, onClose }: {
  search: SettingsSearch;
  hasAutoFocus?: boolean;
  onClose?: () => void;
}) {
  const { t } = useI18n();
  return (
    <FormInput
      hasAutoFocus={hasAutoFocus}
      label={t('settings.search')}
      isLabelHidden
      placeholder={t('settings.search')}
      size="sm"
      width="100%"
      hasClear
      startIcon={MagnifyingGlassIcon}
      role="combobox"
      aria-autocomplete="list"
      aria-controls="settings-search-results"
      aria-expanded={search.isActive && search.results.length > 0}
      aria-activedescendant={search.activeResultId}
      value={search.query}
      onChange={search.setQuery}
      onKeyDown={(event) => {
        if (event.nativeEvent.isComposing) {
          return;
        }
        if (onClose && event.key === 'Escape') {
          event.preventDefault();
          onClose();
          return;
        }
        search.onKeyDown(event);
      }}
    />
  );
}
function SettingsSearchResults({ results, activeIndex, onActiveIndexChange, onSelect }: {
  results: SearchableSetting[];
  activeIndex: number;
  onActiveIndexChange: (index: number) => void;
  onSelect: (setting: SearchableSetting) => void;
}) {
  const { t } = useI18n();
  return results.length === 0
    ? (
        <div id="settings-search-results" className="flex flex-col gap-0.5 p-2">
          <span className="text-sm font-medium">{t('settings.noResults')}</span>
          <span className="text-xs text-muted-foreground">{t('settings.trySearch')}</span>
        </div>
      )
    : (
        <ul id="settings-search-results" role="listbox" aria-label="Search results" className="flex flex-col gap-0 overflow-auto">
          {results.map((setting, index) => (<RecordRow key={setting.id} id={`settings-search-result-${index}`} role="option" aria-selected={index === activeIndex} label={t(setting.titleKey)} description={t(panelConfig(setting.panel).labelKey)} startContent={<IconGlyph icon={setting.icon} className="size-4 shrink-0" />} endContent={<IconGlyph icon={ChevronRightIcon} className="size-4 shrink-0" />} isSelected={index === activeIndex} onMouseEnter={() => onActiveIndexChange(index)} onClick={() => onSelect(setting)} />))}
        </ul>
      );
}
function SettingsSideNav({ search, activePanel, onSelectPanel, onOpenSearch }: {
  search: SettingsSearch;
  activePanel: PanelId;
  onSelectPanel: (panel: PanelId) => void;
  onOpenSearch: () => void;
}) {
  const { t } = useI18n();
  return (
    <SettingsNav
      aria-label={t('settings.search')}
      topContent={(
        <div className="flex flex-col gap-2">
          <div className="hidden w-full items-center max-[680px]:flex flex flex-row gap-1">
            <div className="min-w-0 flex-1">
              <SelectField
                label={t('navigation.settings')}
                isLabelHidden
                variant="ghost"
                size="sm"
                width="100%"
                value={activePanel}
                onChange={(value) => onSelectPanel(value as PanelId)}
                options={PANEL_GROUPS.map((group) => ({
                  type: 'section' as const,
                  title: t(group.labelKey),
                  options: group.panels.map((panel) => ({
                    value: panel.id,
                    label: t(panel.labelKey),
                  })),
                }))}
                renderValue={() => (
                  <div className="flex flex-row items-center gap-2">
                    <span className="text-xs text-muted-foreground">
                      {t(PANEL_GROUPS.find((group) => group.panels.some((panel) => panel.id === activePanel))!.labelKey)}
                    </span>
                    <span aria-hidden="true" className="text-xs text-muted-foreground">/</span>
                    <span className="text-sm font-medium">{t(panelConfig(activePanel).labelKey)}</span>
                  </div>
                )}
              />
            </div>
            <Button aria-haspopup="dialog" onClick={onOpenSearch} variant="ghost" size="icon-sm" aria-label={t('settings.search')} className="shrink-0">
              <MagnifyingGlassIcon />
            </Button>
          </div>
          <div className="max-[680px]:hidden flex flex-col">
            <SettingsSearchInput search={search} />
          </div>
        </div>
      )}
      className="h-full min-h-0 w-[260px] max-[680px]:h-auto max-[680px]:max-h-[50dvh] max-[680px]:w-full"
    >
      {search.isActive
        ? (<SettingsSearchResults results={search.results} activeIndex={search.activeIndex} onActiveIndexChange={search.setActiveIndex} onSelect={(setting) => onSelectPanel(setting.panel)} />)
        : PANEL_GROUPS.map((group) => (
            <SettingsNavSection key={group.labelKey} title={t(group.labelKey)} className="py-2 max-[680px]:hidden">
              {group.panels.map((panel) => (<SettingsNavItem key={panel.id} label={t(panel.labelKey)} icon={<IconGlyph icon={panel.icon} className="size-4 shrink-0" />} size="sm" isSelected={panel.id === activePanel} onClick={() => onSelectPanel(panel.id)} />))}
            </SettingsNavSection>
          ))}
    </SettingsNav>
  );
}
function SettingsSearchDialog({ isOpen, onSelectPanel, onClose }: {
  isOpen: boolean;
  onSelectPanel: (panel: PanelId) => void;
  onClose: () => void;
}) {
  const { t } = useI18n();
  const search = useSettingsSearch(onSelectPanel);
  const close = () => {
    search.setQuery('');
    onClose();
  };
  return (
    <Modal
      isOpen={isOpen}
      aria-label={t('settings.search')}
      onOpenChange={(open) => {
        if (!open) {
          close();
        }
      }}
      width={560}
      padding={3}
      purpose="info"
      position={{ top: 64, start: 16, end: 16 }}
      className="mx-auto"
    >
      <div className="flex flex-col gap-3">
        <div className="flex flex-row items-center gap-2">
          <div className="min-w-0 flex-1">
            <SettingsSearchInput search={search} hasAutoFocus onClose={close} />
          </div>
          <Button onClick={close} variant="ghost" size="icon-sm" aria-label={t('settings.skillCancel')}>
            <XMarkIcon />
          </Button>
        </div>
        <div className="max-h-[calc(100dvh-200px)] overflow-y-auto overscroll-contain flex flex-col">
          {search.isActive
            ? (
                <SettingsSearchResults
                  results={search.results}
                  activeIndex={search.activeIndex}
                  onActiveIndexChange={search.setActiveIndex}
                  onSelect={(setting) => {
                    onSelectPanel(setting.panel);
                    search.setQuery('');
                  }}
                />
              )
            : (
                <div className="flex flex-col p-2">
                  <span className="text-xs text-muted-foreground">{t('settings.trySearch')}</span>
                </div>
              )}
        </div>
      </div>
    </Modal>
  );
}
const THEME_CHOICES: Array<{
  value: string;
  labelKey: 'settings.light' | 'settings.dark' | 'settings.system';
  scheme: 'light' | 'dark' | 'system';
  icon: IconComponent;
}> = [
  { value: 'light', labelKey: 'settings.light', scheme: 'light', icon: SunIcon },
  { value: 'dark', labelKey: 'settings.dark', scheme: 'dark', icon: MoonIcon },
  { value: 'system', labelKey: 'settings.system', scheme: 'system', icon: ComputerDesktopIcon },
];
function ThemeChoiceCards({ value, onChange }: {
  value: string;
  onChange: (value: string) => void;
}) {
  const { t } = useI18n();
  return (
    <RadioGroup value={value} onValueChange={(next) => onChange(String(next))} aria-label={t('settings.colorTheme')} className="grid max-w-[480px] grid-cols-3 gap-2 @max-[335px]/settings-panel:grid-cols-1">
      {THEME_CHOICES.map((choice) => {
        const id = `theme-${choice.value}`;
        return (
          <Label key={choice.value} htmlFor={id} className={cn('relative block min-w-0 cursor-pointer rounded-2xl border p-2 has-focus-visible:ring-3 has-focus-visible:ring-ring/30', value === choice.value && 'border-primary ring-1 ring-primary')}>
            <RadioGroupItem id={id} value={choice.value} className="sr-only" />
            <div className="flex flex-col gap-1.5 @max-[335px]/settings-panel:grid @max-[335px]/settings-panel:grid-cols-[80px_minmax(0,1fr)] @max-[335px]/settings-panel:items-center @max-[335px]/settings-panel:gap-3">
              <ThemePreviewMock scheme={choice.scheme} />
              <div className="flex items-center justify-center gap-1 text-xs">
                <choice.icon className="size-4 text-muted-foreground" />
                <span>{t(choice.labelKey)}</span>
              </div>
            </div>
          </Label>
        );
      })}
    </RadioGroup>
  );
}
function ThemePreviewCanvas({ mode }: { mode: 'light' | 'dark' }) {
  const isDark = mode === 'dark';
  return (
    <div className={isDark ? 'flex h-full flex-col gap-1.5 bg-neutral-800 p-2' : 'flex h-full flex-col gap-1.5 bg-neutral-100 p-2'}>
      <div className="flex flex-col items-center gap-1">
        <div className={isDark ? 'h-1 w-2/3 rounded-full bg-neutral-600' : 'h-1 w-2/3 rounded-full bg-neutral-300'} />
        <div className={isDark ? 'h-1 w-1/2 rounded-full bg-neutral-600' : 'h-1 w-1/2 rounded-full bg-neutral-300'} />
      </div>
      <div className={isDark ? 'flex min-h-0 flex-1 flex-col justify-center gap-1 rounded bg-neutral-950 p-2' : 'flex min-h-0 flex-1 flex-col justify-center gap-1 rounded bg-white p-2'}>
        {[0, 1, 2].map((row) => <div key={row} className={isDark ? 'h-1 w-1/2 rounded-full bg-neutral-600' : 'h-1 w-1/2 rounded-full bg-neutral-300'} />)}
      </div>
    </div>
  );
}
function ThemePreviewMock({ scheme }: {
  scheme: 'light' | 'dark' | 'system';
}) {
  return (
    <Ratio ratio={3 / 2} className="pointer-events-none">
      <div aria-hidden="true" className="overflow-hidden rounded-md flex flex-col h-full">
        {scheme === 'system'
          ? (
              <div className="flex flex-row gap-0 h-full">
                <div className="min-w-0 flex-1">
                  <ThemePreviewCanvas mode="light" />
                </div>
                <div className="min-w-0 flex-1">
                  <ThemePreviewCanvas mode="dark" />
                </div>
              </div>
            )
          : <ThemePreviewCanvas mode={scheme} />}
      </div>
    </Ratio>
  );
}
function AppearancePanel({ settings, update }: PanelProps) {
  const { t } = useI18n();
  return (
    <div className="flex flex-col gap-5">
      <SettingsCard>
        <SettingsRow title={t('settings.colorTheme')} icon={PaintBrushIcon} detail={(<ThemeChoiceCards value={settings.theme} onChange={(value) => update('theme', value as SettingsState['theme'])} />)} />
      </SettingsCard>
    </div>
  );
}
function LanguagePanel({ settings, update }: PanelProps) {
  const { t } = useI18n();
  return (
    <SettingsCard>
      <SettingsRow
        title={t('settings.language')}
        icon={LanguageIcon}
        control={(
          <SelectField
            label={t('settings.language')}
            isLabelHidden
            size="sm"
            width="var(--settings-control-width)"
            value={settings.language}
            onChange={(value) => update('language', value as SettingsState['language'])}
            options={[
              { value: 'system', label: t('settings.system') },
              { value: 'en-US', label: 'English' },
              { value: 'zh-CN', label: '简体中文' },
              { value: 'zh-TW', label: '繁體中文（台灣）' },
              { value: 'ja-JP', label: '日本語' },
            ]}
          />
        )}
      />
      <SettingsRow
        title={t('settings.timeFormat')}
        icon={ClockIcon}
        control={(
          <SelectField
            label={t('settings.timeFormat')}
            isLabelHidden
            size="sm"
            width="var(--settings-control-width)"
            value={settings.timeFormat}
            onChange={(value) => update('timeFormat', value as TimeFormatPattern)}
            options={[
              { value: 'YYYY-MM-DD HH:mm:ss', label: 'YYYY-MM-DD HH:mm:ss' },
              { value: 'YYYY-MM-DD', label: 'YYYY-MM-DD' },
              { value: 'YYYY/MM/DD HH:mm:ss', label: 'YYYY/MM/DD HH:mm:ss' },
              { value: 'DD/MM/YYYY HH:mm:ss', label: 'DD/MM/YYYY HH:mm:ss' },
              { value: 'MM/DD/YYYY hh:mm:ss A', label: 'MM/DD/YYYY hh:mm:ss A' },
              { value: 'HH:mm:ss', label: 'HH:mm:ss' },
            ]}
          />
        )}
      />
      <SettingsRow
        title={t('settings.timezone')}
        icon={GlobeAltIcon}
        control={(
          <SelectField
            label={t('settings.timezone')}
            isLabelHidden
            size="sm"
            width="var(--settings-control-width)"
            value={settings.timezone}
            onChange={(value) => update('timezone', value as TimeZoneCode)}
            options={[
              { value: 'America/Los_Angeles', label: t('settings.losAngeles') },
              { value: 'America/New_York', label: t('settings.newYork') },
              { value: 'Asia/Shanghai', label: t('settings.shanghai') },
              { value: 'Asia/Taipei', label: t('settings.taipei') },
              { value: 'Asia/Tokyo', label: t('settings.tokyo') },
              { value: 'UTC', label: t('settings.utc') },
            ]}
          />
        )}
      />
    </SettingsCard>
  );
}
function ApiKeyField({ value, label, placeholder, onChange }: {
  value: string;
  label: string;
  placeholder: string;
  onChange: (value: string) => void;
}) {
  const [draft, setDraft] = useState(value);
  useEffect(() => {
    // eslint-disable-next-line @eslint-react/set-state-in-effect, react-hooks/set-state-in-effect
    setDraft(value);
  }, [value]);
  const commit = () => {
    if (draft !== value) {
      onChange(draft.trim());
    }
  };
  return (<FormInput label={label} isLabelHidden size="sm" type="password" value={draft} onChange={setDraft} onBlur={commit} onEnter={commit} onClear={() => onChange('')} placeholder={placeholder} hasClear width="var(--settings-control-width)" />);
}
function CapturesSettingsBlock({ settings, update }: PanelProps) {
  const { t } = useI18n();
  const library = settings.library;
  const captures = library.captures;
  const selectedApiKey = captures.fetcher ? captures[captures.fetcher].apiKey : '';
  const updateCaptures = (patch: Partial<CaptureSettings>) => {
    update('library', {
      ...library,
      captures: {
        ...captures,
        ...patch,
        firecrawl: { ...captures.firecrawl, ...patch.firecrawl },
      },
    });
  };
  const setApiKey = (apiKey: string) => {
    if (!captures.fetcher) {
      return;
    }
    updateCaptures({
      [captures.fetcher]: { apiKey },
    });
  };
  return (
    <SettingsCard title={t('settings.captures')}>
      <SettingsRow
        key="fetcher"
        title={t('settings.capturesFetcher')}
        icon={BugAntIcon}
        control={(
          <SelectField
            label={t('settings.capturesFetcher')}
            isLabelHidden
            size="sm"
            width="var(--settings-control-width)"
            value={captures.fetcher ?? 'none'}
            onChange={(value) => {
              updateCaptures({
                fetcher: value === 'none' ? null : value as CaptureSettings['fetcher'],
              });
            }}
            options={[
              { value: 'none', label: t('settings.capturesNotConfigured') },
              ...FETCHER_TYPES.map((fetcher) => ({
                value: fetcher,
                label: t(fetcherLabelKey(fetcher)),
              })),
            ]}
          />
        )}
      />
      {captures.fetcher && (<SettingsRow key={`api-key-${captures.fetcher}`} title={t('settings.capturesApiKey')} icon={KeyIcon} control={(<ApiKeyField key={captures.fetcher} value={selectedApiKey} label={t('settings.capturesApiKey')} placeholder={t('settings.capturesApiKeyPlaceholder')} onChange={setApiKey} />)} />)}
      <SettingsRow
        key="max-attempts"
        title={t('settings.capturesMaxAttempts')}
        icon={ArrowPathRoundedSquareIcon}
        control={(
          <NumberField
            label={t('settings.capturesMaxAttempts')}
            isLabelHidden
            size="sm"
            value={captures.maxAttempts}
            onChange={(value) => {
              updateCaptures({ maxAttempts: value });
            }}
            min={1}
            max={10}
            step={1}
            isIntegerOnly
            width={120}
          />
        )}
      />
      <SettingsRow
        key="fetch-concurrency"
        title={t('settings.capturesConcurrency')}
        icon={BarsArrowUpIcon}
        control={(
          <NumberField
            label={t('settings.capturesConcurrency')}
            isLabelHidden
            size="sm"
            value={captures.fetchConcurrency}
            onChange={(value) => {
              updateCaptures({ fetchConcurrency: value });
            }}
            min={1}
            max={5}
            step={1}
            isIntegerOnly
            width={120}
          />
        )}
      />
    </SettingsCard>
  );
}
function LibraryPanel(props: PanelProps) {
  return (
    <div className="flex flex-col gap-4">
      <CapturesSettingsBlock {...props} />
    </div>
  );
}
function AdvancedPanel({ configFolderPath, onOpenConfigFolder }: {
  configFolderPath: string;
  onOpenConfigFolder: () => void;
}) {
  const { t } = useI18n();
  const toast = useAppToast();
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [isSelectingImport, setIsSelectingImport] = useState(false);
  const [isSkillDownloadOpen, setIsSkillDownloadOpen] = useState(false);
  const [selectedImport, setSelectedImport] = useState<{
    file: File;
    fileName: string;
  } | null>(null);
  const statusQuery = useQuery({
    queryKey: dataTransferKeys.status(),
    queryFn: getDataTransferStatus,
  });
  const activeJobCount = statusQuery.data?.activeJobCount ?? 0;
  const isTransferBlocked = statusQuery.isLoading
    || statusQuery.data?.isBusy === true
    || activeJobCount > 0;
  const blockedDescription = t('settings.finishJobsBeforeTransfer');
  const exportDescription = activeJobCount > 0
    ? blockedDescription
    : undefined;
  const importDescription = activeJobCount > 0
    ? blockedDescription
    : undefined;
  const chooseImportFile = async () => {
    setIsSelectingImport(true);
    try {
      const result = await selectImportFile();
      if (result.status === 'selected') {
        setSelectedImport({
          file: result.file,
          fileName: result.fileName,
        });
      }
    } catch {
      toast({
        body: t('dataTransfer.ioError'),
        type: 'error',
        uniqueID: 'data-transfer-select-file-error',
      });
    } finally {
      setIsSelectingImport(false);
    }
  };
  return (
    <>
      <SettingsCard>
        <SettingsRow
          title={t('settings.downloadSkill')}
          icon={CommandLineIcon}
          control={(
            <Button onClick={() => setIsSkillDownloadOpen(true)} variant="ghost" size="sm">
              <SparklesIcon />
              <span>{t('settings.downloadSkillAction')}</span>
            </Button>
          )}
        />
        <SettingsRow
          title={t('settings.configFolder')}
          icon={FolderIcon}
          description={configFolderPath}
          control={(
            <Button onClick={onOpenConfigFolder} variant="ghost" size="sm">
              <FolderOpenIcon />
              <span>{t('settings.openConfigFolder')}</span>
            </Button>
          )}
        />
        <SettingsRow
          title={t('settings.exportData')}
          icon={ArrowUpTrayIcon}
          description={exportDescription}
          control={(
            <Button onClick={() => setIsExportOpen(true)} variant="ghost" size="sm" disabled={isTransferBlocked}>
              <ArrowUpTrayIcon />
              <span>{t('settings.exportDataAction')}</span>
            </Button>
          )}
        />
        <SettingsRow
          title={t('settings.importData')}
          icon={ArrowDownTrayIcon}
          description={importDescription}
          control={(
            <Button
              onClick={() => {
                void chooseImportFile();
              }}
              variant="ghost"
              size="sm"
              disabled={isTransferBlocked || isSelectingImport}
            >
              {isSelectingImport && <Spinner />}
              <ArrowDownTrayIcon />
              <span>{t('settings.importDataAction')}</span>
            </Button>
          )}
        />
      </SettingsCard>
      <DownloadSkillDialog isOpen={isSkillDownloadOpen} onClose={() => setIsSkillDownloadOpen(false)} />
      {isExportOpen && (<ExportDataDialog onClose={() => setIsExportOpen(false)} />)}
      {selectedImport && (<ImportDataDialog key={`${selectedImport.fileName}:${selectedImport.file.lastModified}`} file={selectedImport.file} fileName={selectedImport.fileName} onClose={() => setSelectedImport(null)} />)}
    </>
  );
}
function SettingsContentPane({ panel, settings, update, configFolderPath = '' }: {
  panel: PanelId;
  configFolderPath?: string;
} & PanelProps) {
  const content = (() => {
    switch (panel) {
      case 'appearance': {
        return <AppearancePanel settings={settings} update={update} />;
      }
      case 'language': {
        return <LanguagePanel settings={settings} update={update} />;
      }
      case 'library': {
        return <LibraryPanel settings={settings} update={update} />;
      }
      case 'advanced': {
        return (
          <AdvancedPanel
            configFolderPath={configFolderPath}
            onOpenConfigFolder={() => {
              void openConfigFolder();
            }}
          />
        );
      }
    }
  })();
  return (
    <ContentPane isScrollable padding={0} className="min-w-0 px-4 pb-4 pt-0">
      <div className="@container/settings-panel flex flex-col gap-4">
        {content}
      </div>
    </ContentPane>
  );
}
export default function SettingsPage() {
  const [searchParams] = useSearchParams();
  const [activePanel, setActivePanel] = useState<PanelId>(searchParams.get('panel') === 'library' ? 'library' : DEFAULT_PANEL);
  const { settings, configFolderPath, update } = useSettings();
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const search = useSettingsSearch(setActivePanel);
  const selectPanel = (panel: PanelId) => {
    setActivePanel(panel);
    search.setQuery('');
    setIsSearchOpen(false);
  };
  return (
    <div className="grid h-full min-h-0 grid-cols-[260px_minmax(0,1fr)] grid-rows-[minmax(0,1fr)] max-[680px]:grid-cols-1 max-[680px]:grid-rows-[auto_minmax(0,1fr)]">
      <SettingsSideNav
        search={search}
        activePanel={activePanel}
        onSelectPanel={selectPanel}
        onOpenSearch={() => {
          search.setQuery('');
          setIsSearchOpen(true);
        }}
      />
      <SettingsSearchDialog isOpen={isSearchOpen} onSelectPanel={selectPanel} onClose={() => setIsSearchOpen(false)} />
      <SettingsContentPane panel={activePanel} settings={settings} update={update} configFolderPath={configFolderPath} />
    </div>
  );
}
