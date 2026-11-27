import { LanguagesIcon, MenuIcon, PaintbrushIcon, SlidersHorizontalIcon } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Skeleton } from '@/components/ui/skeleton';

import { ConfigFolderItem } from './sections/advanced/config-folder-item';
import { ExportItem } from './sections/advanced/export-item';
import { ImportItem } from './sections/advanced/import-item';
import { ColorThemeItem } from './sections/appearance/color-theme-item';
import { LanguageItem } from './sections/language-region/language-item';
import { TimeFormatItem } from './sections/language-region/time-format-item';
import { TimeZoneItem } from './sections/language-region/time-zone-item';
import { useSettings } from './state/settings-context';

import type { TranslationKey } from '@/i18n/resources';
import type { LucideIcon } from 'lucide-react';

type SettingsSection = 'appearance' | 'language-region' | 'advanced';

const settingsSections: Array<{
  id: SettingsSection;
  labelKey: TranslationKey;
  ariaKey: TranslationKey;
  icon: LucideIcon;
}> = [
  {
    id: 'appearance',
    labelKey: 'settings.appearance',
    ariaKey: 'settings.appearanceAria',
    icon: PaintbrushIcon,
  },
  {
    id: 'language-region',
    labelKey: 'settings.languageRegion',
    ariaKey: 'settings.languageRegionAria',
    icon: LanguagesIcon,
  },
  {
    id: 'advanced',
    labelKey: 'settings.advanced',
    ariaKey: 'settings.advancedAria',
    icon: SlidersHorizontalIcon,
  },
];

export function SettingsPage() {
  const { t } = useTranslation();
  const [activeSection, setActiveSection]
    = useState<SettingsSection>('appearance');
  const {
    settings,
    theme,
    language,
    timeFormat,
    timeZone,
    isLoading,
    isUpdating,
    error,
    setTheme,
    setLanguage,
    setTimeFormat,
    setTimeZone,
  } = useSettings();
  const activeSectionAria = settingsSections.find(
    (section) => section.id === activeSection,
  )?.ariaKey ?? 'settings.appearanceAria';
  const activeSectionLabel = settingsSections.find(
    (section) => section.id === activeSection,
  )?.labelKey ?? 'settings.appearance';

  return (
    <div className="grid h-full min-h-0 grid-cols-[260px_minmax(0,1fr)] max-[680px]:grid-cols-1">
      <aside className="hidden min-h-0 overflow-y-auto p-4 min-[680px]:block">
        <SettingsNavigation
          activeSection={activeSection}
          onSectionChange={setActiveSection}
        />
      </aside>

      <section
        aria-label={t(activeSectionAria)}
        className="min-h-0 overflow-y-auto p-4"
      >
        <div className="mb-3 flex items-center gap-3 min-[680px]:hidden">
          <DropdownMenu>
            <DropdownMenuTrigger
              render={(
                <Button
                  type="button"
                  variant="outline"
                  size="icon-lg"
                  aria-label={t('settings.openNavigation')}
                />
              )}
            >
              <MenuIcon />
            </DropdownMenuTrigger>
            <DropdownMenuContent
              side="bottom"
              align="start"
              sideOffset={8}
              aria-label={t('settings.navigation')}
              className="w-56"
            >
              <DropdownMenuGroup>
                <DropdownMenuLabel>{t('settings.workspace')}</DropdownMenuLabel>
                <DropdownMenuRadioGroup
                  value={activeSection}
                  onValueChange={(value) => {
                    const section = settingsSections.find(({ id }) => id === value);
                    if (section) {
                      setActiveSection(section.id);
                    }
                  }}
                >
                  {settingsSections.map(({ id, labelKey, icon: Icon }) => (
                    <DropdownMenuRadioItem key={id} value={id} closeOnClick>
                      <Icon />
                      {t(labelKey)}
                    </DropdownMenuRadioItem>
                  ))}
                </DropdownMenuRadioGroup>
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>
          <span className="min-w-0 truncate text-sm font-medium">
            {t(activeSectionLabel)}
          </span>
        </div>

        <Card className="gap-0 py-0">
          {isLoading && (
            <div className="flex flex-col items-start gap-3 p-4 min-[680px]:min-h-16 min-[680px]:flex-row min-[680px]:items-center min-[680px]:justify-between min-[680px]:gap-8">
              <Skeleton className="h-4 w-24" />
              <div className="flex items-center gap-6">
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-4 w-10" />
                <Skeleton className="h-4 w-10" />
              </div>
            </div>
          )}
          {!isLoading && activeSection === 'appearance' && (
            <ColorThemeItem
              value={theme}
              onValueChange={(nextTheme) => {
                void setTheme(nextTheme);
              }}
              disabled={isUpdating || !settings}
            />
          )}
          {!isLoading && activeSection === 'language-region' && (
            <div className="divide-y">
              <LanguageItem
                value={language}
                onValueChange={(nextLanguage) => {
                  void setLanguage(nextLanguage);
                }}
                disabled={isUpdating || !settings}
              />
              <TimeZoneItem
                value={timeZone}
                onValueChange={(nextTimeZone) => {
                  void setTimeZone(nextTimeZone);
                }}
                disabled={isUpdating || !settings}
              />
              <TimeFormatItem
                value={timeFormat}
                onValueChange={(nextTimeFormat) => {
                  void setTimeFormat(nextTimeFormat);
                }}
                disabled={isUpdating || !settings}
              />
            </div>
          )}
          {!isLoading && activeSection === 'advanced' && (
            <div className="divide-y">
              <ExportItem />
              <ImportItem />
              <ConfigFolderItem />
            </div>
          )}
        </Card>

        {error && (
          <p role="alert" className="px-1 pt-3 text-xs text-destructive">
            {error}
          </p>
        )}
      </section>
    </div>
  );
}

function SettingsNavigation({
  activeSection,
  onSectionChange,
}: {
  activeSection: SettingsSection;
  onSectionChange: (section: SettingsSection) => void;
}) {
  const { t } = useTranslation();

  return (
    <nav aria-label={t('settings.navigation')}>
      <Card size="sm">
        <CardHeader>
          <h2 className="text-xs font-medium text-muted-foreground">
            {t('settings.workspace')}
          </h2>
        </CardHeader>
        <CardContent className="flex flex-col gap-1">
          {settingsSections.map(({ id, labelKey, icon: Icon }) => {
            const isActive = id === activeSection;

            return (
              <Button
                key={id}
                type="button"
                variant={isActive ? 'secondary' : 'ghost'}
                size="lg"
                aria-current={isActive ? 'page' : undefined}
                onClick={() => {
                  onSectionChange(id);
                }}
                className="w-full justify-start gap-2"
              >
                <Icon className={isActive ? undefined : 'text-muted-foreground'} />
                <span>{t(labelKey)}</span>
              </Button>
            );
          })}
        </CardContent>
      </Card>
    </nav>
  );
}
