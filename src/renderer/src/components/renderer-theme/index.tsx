import type { ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Theme } from '@astryxdesign/core';
import { foundryTheme } from '@renderer/themes/foundry/foundry-theme';
import { getSettings, settingsKeys } from '@renderer/settings';

export default function RendererTheme({ children }: { children: ReactNode }) {
  const settingsQuery = useQuery({
    queryKey: settingsKeys.current(),
    queryFn: getSettings,
  });
  const mode = settingsQuery.data?.workspace.appearance['color-theme'] ?? 'system';

  return (
    <Theme theme={foundryTheme} mode={mode}>
      {children}
    </Theme>
  );
}
