import { LanguagesIcon, MenuIcon, PaintbrushIcon } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

import { ColorThemeItem } from './color-theme-item';
import { LanguageItem } from './language-item';
import { useSettings } from './settings-context';
import { TimeZoneItem } from './time-zone-item';

import type { TranslationKey } from '@/i18n/resources';
import type { LucideIcon } from 'lucide-react';

type SettingsSection = 'appearance' | 'language-region';

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
];

export function SettingsPage() {
  const { t } = useTranslation();
  const [isNavigationOpen, setIsNavigationOpen] = useState(false);
  const [activeSection, setActiveSection]
    = useState<SettingsSection>('appearance');
  const {
    settings,
    theme,
    language,
    timeZone,
    isLoading,
    isUpdating,
    error,
    setTheme,
    setLanguage,
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
          <Popover open={isNavigationOpen} onOpenChange={setIsNavigationOpen}>
            <PopoverTrigger
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
            </PopoverTrigger>
            <PopoverContent
              side="bottom"
              align="start"
              sideOffset={8}
              className="w-56 border-0 bg-transparent p-0 shadow-none ring-0"
            >
              <SettingsNavigation
                activeSection={activeSection}
                onSectionChange={setActiveSection}
                onNavigate={() => setIsNavigationOpen(false)}
              />
            </PopoverContent>
          </Popover>
          <span className="min-w-0 truncate text-sm font-medium">
            {t(activeSectionLabel)}
          </span>
        </div>

        <div className="overflow-hidden rounded-xl border bg-card">
          {isLoading
            ? (
                <div className="flex flex-col items-start gap-3 p-4 min-[680px]:min-h-16 min-[680px]:flex-row min-[680px]:items-center min-[680px]:justify-between min-[680px]:gap-8">
                  <Skeleton className="h-4 w-24" />
                  <div className="flex items-center gap-6">
                    <Skeleton className="h-4 w-16" />
                    <Skeleton className="h-4 w-10" />
                    <Skeleton className="h-4 w-10" />
                  </div>
                </div>
              )
            : (
                activeSection === 'appearance'
                  ? (
                      <ColorThemeItem
                        value={theme}
                        onValueChange={(nextTheme) => {
                          void setTheme(nextTheme);
                        }}
                        disabled={isUpdating || !settings}
                      />
                    )
                  : (
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
                      </div>
                    )
              )}
        </div>

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
  onNavigate,
}: {
  activeSection: SettingsSection;
  onSectionChange: (section: SettingsSection) => void;
  onNavigate?: () => void;
}) {
  const { t } = useTranslation();

  return (
    <nav
      aria-label={t('settings.navigation')}
      className="flex flex-col items-stretch gap-2 rounded-2xl border border-border/60 bg-muted/50 p-2 shadow-[0_8px_30px_rgb(0_0_0/0.06)] backdrop-blur-xl dark:bg-muted/35"
    >
      <h2 className="shrink-0 px-2 text-[11px] font-medium tracking-wide text-muted-foreground min-[680px]:mb-2">
        {t('settings.workspace')}
      </h2>
      <div className="flex shrink-0 flex-col gap-1">
        {settingsSections.map(({ id, labelKey, icon: Icon }) => {
          const isActive = id === activeSection;

          return (
            <Button
              key={id}
              type="button"
              variant="ghost"
              size="lg"
              aria-current={isActive ? 'page' : undefined}
              onClick={() => {
                onSectionChange(id);
                onNavigate?.();
              }}
              className={cn(
                'h-8 w-full justify-start gap-2 rounded-lg border px-2 text-sm',
                isActive
                  ? 'border-border/70 bg-background text-foreground shadow-xs hover:bg-background dark:bg-accent dark:hover:bg-accent'
                  : 'border-transparent text-muted-foreground hover:bg-background/70 hover:text-foreground dark:hover:bg-background/10',
              )}
            >
              <Icon className={isActive ? undefined : 'text-muted-foreground'} />
              <span>{t(labelKey)}</span>
            </Button>
          );
        })}
      </div>
    </nav>
  );
}
