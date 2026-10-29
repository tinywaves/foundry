import { isValidElement, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { Card } from '@astryxdesign/core/Card';
import { Divider } from '@astryxdesign/core/Divider';
import { Text } from '@astryxdesign/core/Text';
import { VStack } from '@astryxdesign/core/VStack';
import * as stylex from '@stylexjs/stylex';
import { HStack } from '@astryxdesign/core/HStack';
import { Icon } from '@astryxdesign/core/Icon';
import { Stack, StackItem } from '@astryxdesign/core/Stack';
import type {
  IconComponent,
  SearchableSetting,
  PanelId,
  PanelProps,
  SettingsState,
  TimeFormatPattern,
  TimeZoneCode,
  CaptureSettings,
} from './types';
import {
  MagnifyingGlassIcon,
  ChevronRightIcon,
  CommandLineIcon,
  ComputerDesktopIcon,
  MoonIcon,
  SparklesIcon,
  SunIcon,
  PaintBrushIcon,
  ClockIcon,
  GlobeAltIcon,
  LanguageIcon,
  ArrowPathRoundedSquareIcon,
  BarsArrowUpIcon,
  BugAntIcon,
  KeyIcon,
  ArrowDownTrayIcon,
  ArrowUpTrayIcon,
  FolderIcon,
  FolderOpenIcon,
} from '@heroicons/react/24/outline';
import { TextInput } from '@astryxdesign/core/TextInput';
import type { SettingsSearch } from './search';
import { useI18n } from '../../i18n';
import { ListItem } from '@astryxdesign/core/List';
import { panelConfig, PANEL_GROUPS, DEFAULT_PANEL } from './config';
import { SideNav, SideNavItem, SideNavSection } from '@astryxdesign/core/SideNav';
import { Grid } from '@astryxdesign/core/Grid';
import { SelectableCard } from '@astryxdesign/core/SelectableCard';
import { Theme } from '@astryxdesign/core/theme';
import { neutralTheme } from '@astryxdesign/theme-neutral/built';
import { AspectRatio } from '@astryxdesign/core/AspectRatio';
import { Selector } from '@astryxdesign/core/Selector';
import { NumberInput } from '@astryxdesign/core/NumberInput';
import { Button } from '@astryxdesign/core/Button';
import { useQuery } from '@tanstack/react-query';
import {
  dataTransferKeys,
  getDataTransferStatus,
  selectImportFile,
} from '../data-transfer/api';
import { useAppToast } from '../../lib/api';
import {
  ExportDataDialog,
  ImportDataDialog,
} from '../data-transfer/data-transfer-card';
import { LayoutContent, Layout } from '@astryxdesign/core/Layout';
import { openConfigFolder } from './api';
import { useSearchParams } from 'react-router-dom';
import { useSettingsSearch } from './search';
import { useSettings } from './use-settings';
import { DownloadSkillDialog } from './download-skill-dialog';

function SettingsCard({
  title,
  children,
}: {
  title?: string;
  children: ReactNode;
}) {
  const rows = (Array.isArray(children) ? children : [children])
    .filter((row): row is ReactNode => Boolean(row));

  return (
    <VStack gap={1.5}>
      {title != null && (
        <Text type="supporting" weight="semibold" color="secondary">
          {title}
        </Text>
      )}
      <Card padding={0} width="100%" variant="muted">
        <VStack as="ul" role="list" gap={0}>
          {rows.map((row, index) => {
            const isNotFirstRow = index > 0;
            return (
              <VStack key={isValidElement(row) ? row.key : undefined} as="li" gap={0}>
                {isNotFirstRow && <Divider variant="subtle" />}
                <VStack>{row}</VStack>
              </VStack>
            );
          })}
        </VStack>
      </Card>
    </VStack>
  );
}

const ROW_PADDING = 4;
const CONTROL_WIDTH = 260;
const ROW_STACK = '@container settings-panel (max-width: 480px)';

const row = stylex.create({
  panel: { containerType: 'inline-size', containerName: 'settings-panel' },
  line: {
    display: 'flex',
    flexDirection: { default: 'row', [ROW_STACK]: 'column' },
    alignItems: { default: 'center', [ROW_STACK]: 'stretch' },
    gap: { default: 'var(--spacing-3)', [ROW_STACK]: 'var(--spacing-2)' },
  },
  textColumn: { maxWidth: { default: 420, [ROW_STACK]: 'none' } },
  control: { flexShrink: 0 },
});

function SettingsRow({
  title,
  titleAccessory,
  description,
  icon,
  control,
  detail,
}: {
  title: string;
  titleAccessory?: ReactNode;
  description?: ReactNode;
  icon: IconComponent;
  control?: ReactNode;
  detail?: ReactNode;
}) {
  return (
    <VStack padding={ROW_PADDING} gap={2}>
      <Stack xstyle={row.line} data-settings-line>
        <StackItem size="fill">
          <HStack gap={2} align="start">
            <VStack paddingBlockStart={0.5}>
              <Icon icon={icon} size="sm" color="secondary" />
            </VStack>
            <VStack gap={0.5} xstyle={row.textColumn}>
              {titleAccessory == null
                ? (
                    <Text type="label">{title}</Text>
                  )
                : (
                    <HStack gap={1.5} align="center">
                      <Text type="label">{title}</Text>
                      {titleAccessory}
                    </HStack>
                  )}
              {description != null && (
                <Text type="supporting" color="secondary">
                  {description}
                </Text>
              )}
            </VStack>
          </HStack>
        </StackItem>
        {control != null && (
          <VStack data-settings-control xstyle={row.control}>
            {control}
          </VStack>
        )}
      </Stack>
      {detail}
    </VStack>
  );
}

function SettingsSearchInput({ search }: { search: SettingsSearch }) {
  const { t } = useI18n();
  return (
    <TextInput
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
      onKeyDown={search.onKeyDown}
    />
  );
}

function SettingsSearchResults({
  results,
  activeIndex,
  onActiveIndexChange,
  onSelect,
}: {
  results: SearchableSetting[];
  activeIndex: number;
  onActiveIndexChange: (index: number) => void;
  onSelect: (setting: SearchableSetting) => void;
}) {
  const { t } = useI18n();
  return results.length === 0
    ? (
        <VStack id="settings-search-results" gap={0.5} padding={2}>
          <Text type="label">{t('settings.noResults')}</Text>
          <Text type="supporting" color="secondary">{t('settings.trySearch')}</Text>
        </VStack>
      )
    : (
        <VStack
          as="ul"
          gap={0}
          id="settings-search-results"
          role="listbox"
          aria-label="Search results"
          isScrollable
        >
          {results.map((setting, index) => (
            <ListItem
              key={setting.id}
              id={`settings-search-result-${index}`}
              role="option"
              aria-selected={index === activeIndex}
              label={t(setting.titleKey)}
              description={`${t(panelConfig(setting.panel).labelKey)} · ${t(setting.descriptionKey)}`}
              startContent={<Icon icon={setting.icon} size="sm" color="secondary" />}
              endContent={<Icon icon={ChevronRightIcon} size="sm" color="secondary" />}
              isSelected={index === activeIndex}
              onMouseEnter={() => onActiveIndexChange(index)}
              onClick={() => onSelect(setting)}
            />
          ))}
        </VStack>
      );
}

const styles_settings_side_nav = stylex.create({
  sideNav: { flexShrink: 0 },
  sideNavSection: { paddingBlock: 'var(--spacing-2)' },
});

function SettingsSideNav({
  search,
  activePanel,
  onSelectPanel,
}: {
  search: SettingsSearch;
  activePanel: PanelId;
  onSelectPanel: (panel: PanelId) => void;
}) {
  const { t } = useI18n();
  return (
    <SideNav
      aria-label={t('settings.search')}
      xstyle={styles_settings_side_nav.sideNav}
      topContent={<SettingsSearchInput search={search} />}
    >
      {search.isActive
        ? (
            <SettingsSearchResults
              results={search.results}
              activeIndex={search.activeIndex}
              onActiveIndexChange={search.setActiveIndex}
              onSelect={(setting) => onSelectPanel(setting.panel)}
            />
          )
        : PANEL_GROUPS.map((group) => (
            <SideNavSection
              key={group.labelKey}
              title={t(group.labelKey)}
              xstyle={styles_settings_side_nav.sideNavSection}
            >
              {group.panels.map((panel) => (
                <SideNavItem
                  key={panel.id}
                  label={t(panel.labelKey)}
                  icon={<Icon icon={panel.icon} size="sm" color="primary" />}
                  size="sm"
                  isSelected={panel.id === activePanel}
                  onClick={() => onSelectPanel(panel.id)}
                />
              ))}
            </SideNavSection>
          ))}
    </SideNav>
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

function ThemeChoiceCards({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const { t } = useI18n();
  return (
    <Grid
      role="radiogroup"
      aria-label="Color theme"
      columns={{ minWidth: 96, max: 3 }}
      gap={2}
      maxWidth={480}
    >
      {THEME_CHOICES.map((choice) => {
        const isSelected = choice.value === value;
        const label = t(choice.labelKey);
        return (
          <SelectableCard
            key={choice.value}
            label={label}
            isSelected={isSelected}
            padding={2}
            onChange={() => {
              if (!isSelected) {
                onChange(choice.value);
              }
            }}
          >
            <VStack gap={1.5}>
              <ThemePreviewMock scheme={choice.scheme} />
              <HStack gap={1} align="center" justify="center">
                <Icon icon={choice.icon} size="sm" color="secondary" />
                <Text
                  type="supporting"
                  weight={isSelected ? 'semibold' : undefined}
                >
                  {label}
                </Text>
              </HStack>
            </VStack>
          </SelectableCard>
        );
      })}
    </Grid>
  );
}

const preview = stylex.create({
  bar: {
    height: 4,
    width: '50%',
    borderRadius: 999,
    backgroundColor: 'var(--color-border-emphasized)',
  },
  barWide: { width: '66%' },
  mutedSurface: { backgroundColor: 'var(--color-background-muted)' },
  contentSurface: { backgroundColor: 'var(--color-background-surface)' },
  clip: { overflow: 'hidden', borderRadius: 'var(--radius-element)' },
  inert: { pointerEvents: 'none' },
});

function ThemePreviewCanvas({ mode }: { mode: 'light' | 'dark' }) {
  return (
    <Theme theme={neutralTheme} mode={mode}>
      <VStack padding={2} gap={1.5} height="100%" xstyle={preview.mutedSurface}>
        <VStack gap={1} align="center">
          <VStack xstyle={[preview.bar, preview.barWide]} />
          <VStack xstyle={preview.bar} />
        </VStack>
        <StackItem size="fill">
          <VStack padding={2} gap={1} justify="center" height="100%" xstyle={preview.contentSurface}>
            {[0, 1, 2].map((row) => <VStack key={row} xstyle={preview.bar} />)}
          </VStack>
        </StackItem>
      </VStack>
    </Theme>
  );
}

function ThemePreviewMock({ scheme }: { scheme: 'light' | 'dark' | 'system' }) {
  return (
    <AspectRatio ratio={3 / 2} xstyle={preview.inert}>
      <VStack aria-hidden="true" height="100%" xstyle={preview.clip}>
        {scheme === 'system'
          ? (
              <HStack gap={0} height="100%">
                <StackItem size="fill">
                  <ThemePreviewCanvas mode="light" />
                </StackItem>
                <StackItem size="fill">
                  <ThemePreviewCanvas mode="dark" />
                </StackItem>
              </HStack>
            )
          : <ThemePreviewCanvas mode={scheme} />}
      </VStack>
    </AspectRatio>
  );
}

function AppearancePanel({ settings, update }: PanelProps) {
  const { t } = useI18n();
  return (
    <VStack gap={5}>
      <SettingsCard>
        <SettingsRow
          title={t('settings.colorTheme')}
          icon={PaintBrushIcon}
          description={t('settings.colorThemeDescription')}
          detail={(
            <ThemeChoiceCards
              value={settings.theme}
              onChange={(value) => update('theme', value as SettingsState['theme'])}
            />
          )}
        />
      </SettingsCard>
    </VStack>
  );
}

function LanguagePanel({ settings, update }: PanelProps) {
  const { t } = useI18n();
  return (
    <SettingsCard>
      <SettingsRow
        title={t('settings.language')}
        icon={LanguageIcon}
        description={t('settings.languageDescription')}
        control={(
          <Selector
            label={t('settings.language')}
            isLabelHidden
            size="sm"
            width={CONTROL_WIDTH}
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
        description={t('settings.timeFormatDescription')}
        control={(
          <Selector
            label={t('settings.timeFormat')}
            isLabelHidden
            size="sm"
            width={CONTROL_WIDTH}
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
        description={t('settings.timezoneDescription')}
        control={(
          <Selector
            label={t('settings.timezone')}
            isLabelHidden
            size="sm"
            width={CONTROL_WIDTH}
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

function ApiKeyField({
  value,
  label,
  placeholder,
  onChange,
}: {
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

  return (
    <TextInput
      label={label}
      isLabelHidden
      size="sm"
      type="password"
      value={draft}
      onChange={setDraft}
      onBlur={commit}
      onEnter={commit}
      placeholder={placeholder}
      hasClear
      width={CONTROL_WIDTH}
    />
  );
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
        deepseek: { ...captures.deepseek, ...patch.deepseek },
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
        description={t('settings.capturesFetcherDescription')}
        control={(
          <Selector
            label={t('settings.capturesFetcher')}
            isLabelHidden
            size="sm"
            width={CONTROL_WIDTH}
            value={captures.fetcher ?? 'none'}
            onChange={(value) => {
              updateCaptures({
                fetcher: value === 'none' ? null : value as CaptureSettings['fetcher'],
              });
            }}
            options={[
              { value: 'none', label: t('settings.capturesNotConfigured') },
              { value: 'firecrawl', label: 'Firecrawl' },
              { value: 'deepseek', label: 'DeepSeek Fetch' },
            ]}
          />
        )}
      />
      {captures.fetcher && (
        <SettingsRow
          key={`api-key-${captures.fetcher}`}
          title={t('settings.capturesApiKey')}
          icon={KeyIcon}
          description={t('settings.capturesApiKeyDescription')}
          control={(
            <ApiKeyField
              key={captures.fetcher}
              value={selectedApiKey}
              label={t('settings.capturesApiKey')}
              placeholder={t('settings.capturesApiKeyPlaceholder')}
              onChange={setApiKey}
            />
          )}
        />
      )}
      <SettingsRow
        key="max-attempts"
        title={t('settings.capturesMaxAttempts')}
        icon={ArrowPathRoundedSquareIcon}
        description={t('settings.capturesMaxAttemptsDescription')}
        control={(
          <NumberInput
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
        key="scrape-concurrency"
        title={t('settings.capturesConcurrency')}
        icon={BarsArrowUpIcon}
        description={t('settings.capturesConcurrencyDescription')}
        control={(
          <NumberInput
            label={t('settings.capturesConcurrency')}
            isLabelHidden
            size="sm"
            value={captures.scrapeConcurrency}
            onChange={(value) => {
              updateCaptures({ scrapeConcurrency: value });
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
    <VStack gap={4}>
      <CapturesSettingsBlock {...props} />
    </VStack>
  );
}

function AdvancedPanel({
  configFolderPath,
  onOpenConfigFolder,
}: {
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
    : t('settings.exportDataDescription');
  const importDescription = activeJobCount > 0
    ? blockedDescription
    : t('settings.importDataDescription');
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
          description={t('settings.downloadSkillDescription')}
          control={(
            <Button
              label={t('settings.downloadSkillAction')}
              icon={<SparklesIcon />}
              variant="ghost"
              size="sm"
              onClick={() => setIsSkillDownloadOpen(true)}
            />
          )}
        />
        <SettingsRow
          title={t('settings.configFolder')}
          icon={FolderIcon}
          description={configFolderPath}
          control={(
            <Button
              label={t('settings.openConfigFolder')}
              icon={<FolderOpenIcon />}
              variant="ghost"
              size="sm"
              onClick={onOpenConfigFolder}
            />
          )}
        />
        <SettingsRow
          title={t('settings.exportData')}
          icon={ArrowUpTrayIcon}
          description={exportDescription}
          control={(
            <Button
              label={t('settings.exportDataAction')}
              icon={<ArrowUpTrayIcon />}
              variant="ghost"
              size="sm"
              isDisabled={isTransferBlocked}
              onClick={() => setIsExportOpen(true)}
            />
          )}
        />
        <SettingsRow
          title={t('settings.importData')}
          icon={ArrowDownTrayIcon}
          description={importDescription}
          control={(
            <Button
              label={t('settings.importDataAction')}
              icon={<ArrowDownTrayIcon />}
              variant="ghost"
              size="sm"
              isDisabled={isTransferBlocked || isSelectingImport}
              isLoading={isSelectingImport}
              onClick={() => {
                void chooseImportFile();
              }}
            />
          )}
        />
      </SettingsCard>
      <DownloadSkillDialog
        isOpen={isSkillDownloadOpen}
        onClose={() => setIsSkillDownloadOpen(false)}
      />
      {isExportOpen && (
        <ExportDataDialog
          onClose={() => setIsExportOpen(false)}
        />
      )}
      {selectedImport && (
        <ImportDataDialog
          key={`${selectedImport.fileName}:${selectedImport.file.lastModified}`}
          file={selectedImport.file}
          fileName={selectedImport.fileName}
          onClose={() => setSelectedImport(null)}
        />
      )}
    </>
  );
}

const styles_settings_content_pane = stylex.create({
  contentTopAligned: {
    paddingInlineStart: 'var(--spacing-4)',
    paddingInlineEnd: 'var(--spacing-4)',
    paddingBlockEnd: 'var(--spacing-4)',
    paddingBlockStart: 0,
  },
});

function SettingsContentPane({
  panel,
  settings,
  update,
  configFolderPath = '',
}: {
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
    <LayoutContent isScrollable padding={0} xstyle={styles_settings_content_pane.contentTopAligned}>
      <VStack
        gap={4}
        xstyle={row.panel}
      >
        {content}
      </VStack>
    </LayoutContent>
  );
}

export default function SettingsPage() {
  const [searchParams] = useSearchParams();
  const [activePanel, setActivePanel] = useState<PanelId>(
    searchParams.get('panel') === 'library' ? 'library' : DEFAULT_PANEL,
  );
  const { settings, configFolderPath, update } = useSettings();
  const search = useSettingsSearch(setActivePanel);
  const selectPanel = (panel: PanelId) => {
    setActivePanel(panel);
    search.setQuery('');
  };
  return (
    <Layout
      height="fill"
      start={(
        <SettingsSideNav
          search={search}
          activePanel={activePanel}
          onSelectPanel={selectPanel}
        />
      )}
      content={(
        <SettingsContentPane
          panel={activePanel}
          settings={settings}
          update={update}
          configFolderPath={configFolderPath}
        />
      )}
    />
  );
}
