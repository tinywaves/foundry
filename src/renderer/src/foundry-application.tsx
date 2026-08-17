import { Theme } from '@astryxdesign/core';
import { LinkProvider } from '@astryxdesign/core/Link';
import { defineTheme } from '@astryxdesign/core/theme';
import { neutralTheme } from '@astryxdesign/theme-neutral';
import { createHashRouter, Link } from 'react-router';
import { RouterProvider } from 'react-router/dom';
import { useApplicationSettings } from './application-settings-context';
import { foundryRoutes } from './router';

const foundryTheme = defineTheme({
  name: 'foundry',
  extends: neutralTheme,
  tokens: {
    '--font-family-code': 'monospace',
  },
});

const router = createHashRouter(foundryRoutes);

export function FoundryApplication() {
  const { colorMode } = useApplicationSettings();

  return (
    <Theme theme={foundryTheme} mode={colorMode}>
      <LinkProvider component={Link}>
        <RouterProvider router={router} />
      </LinkProvider>
    </Theme>
  );
}
