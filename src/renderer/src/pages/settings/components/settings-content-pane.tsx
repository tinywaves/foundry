import { LayoutContent } from '@astryxdesign/core/Layout';
import { VStack } from '@astryxdesign/core/VStack';
import * as stylex from '@stylexjs/stylex';
import { AppearancePanel } from '../panels/appearance';
import { LanguagePanel } from '../panels/language-region';
import { AdvancedPanel } from '../panels/advanced';
import { row } from './settings-row-styles';
import { openConfigFolder } from '@renderer/settings';
import type { PanelId, PanelProps } from '../types';

const styles = stylex.create({
  contentTopAligned: {
    paddingInlineStart: 'var(--spacing-4)',
    paddingInlineEnd: 'var(--spacing-4)',
    paddingBlockEnd: 'var(--spacing-4)',
    paddingBlockStart: 0,
  },
});

export function SettingsContentPane({
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
    <LayoutContent isScrollable padding={0} xstyle={styles.contentTopAligned}>
      <VStack
        gap={4}
        xstyle={row.panel}
      >
        {content}
      </VStack>
    </LayoutContent>
  );
}
