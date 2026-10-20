import type { ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Theme } from '@astryxdesign/core';
import { defaultThemeSlug, themes } from '@renderer/astryx-themes';
import { getSettings, settingsKeys } from '@renderer/settings';

export default function RendererTheme({ children }: { children: ReactNode }) {
  const settingsQuery = useQuery({
    queryKey: settingsKeys.current(),
    queryFn: getSettings,
  });
  const mode = settingsQuery.data?.appearance.theme ?? 'system';

  return (
    <Theme theme={themes[defaultThemeSlug]} mode={mode}>
      {children}
    </Theme>
  );
}
