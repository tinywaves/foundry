import { MenuIcon, PaintbrushIcon } from 'lucide-react';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Skeleton } from '@/components/ui/skeleton';

import { ColorThemeItem } from './color-theme-item';
import { useSettings } from './settings-context';

export function SettingsPage() {
  const [isNavigationOpen, setIsNavigationOpen] = useState(false);
  const {
    settings,
    theme,
    isLoading,
    isUpdating,
    error,
    setTheme,
  } = useSettings();

  return (
    <div className="grid h-full min-h-0 grid-cols-[260px_minmax(0,1fr)] max-[680px]:grid-cols-1">
      <aside className="hidden min-h-0 overflow-y-auto p-4 min-[680px]:block">
        <SettingsNavigation />
      </aside>

      <section
        aria-label="Appearance settings"
        className="min-h-0 overflow-y-auto p-4"
      >
        <div className="mb-3 min-[680px]:hidden">
          <Popover open={isNavigationOpen} onOpenChange={setIsNavigationOpen}>
            <PopoverTrigger
              render={(
                <Button
                  type="button"
                  variant="outline"
                  size="icon-lg"
                  aria-label="Open settings navigation"
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
                onNavigate={() => setIsNavigationOpen(false)}
              />
            </PopoverContent>
          </Popover>
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
                <ColorThemeItem
                  value={theme}
                  onValueChange={(nextTheme) => {
                    void setTheme(nextTheme);
                  }}
                  disabled={isUpdating || !settings}
                />
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

function SettingsNavigation({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <nav
      aria-label="Settings navigation"
      className="flex flex-col items-stretch gap-2 rounded-2xl border border-border/60 bg-muted/50 p-2 shadow-[0_8px_30px_rgb(0_0_0/0.06)] backdrop-blur-xl dark:bg-muted/35"
    >
      <h2 className="shrink-0 px-2 text-[11px] font-medium tracking-wide text-muted-foreground uppercase min-[680px]:mb-2">
        Workspace
      </h2>
      <div className="flex shrink-0 flex-col gap-1">
        <Button
          type="button"
          variant="ghost"
          size="lg"
          aria-current="page"
          onClick={onNavigate}
          className="h-8 w-full justify-start gap-2 rounded-lg border border-border/70 bg-background px-2 text-sm shadow-xs hover:bg-background dark:bg-accent dark:hover:bg-accent"
        >
          <PaintbrushIcon className="text-muted-foreground" />
          <span>Appearance</span>
        </Button>
      </div>
    </nav>
  );
}
