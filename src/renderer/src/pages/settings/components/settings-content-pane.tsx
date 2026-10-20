import { LayoutContent } from '@astryxdesign/core/Layout';
import { VStack } from '@astryxdesign/core/VStack';
import * as stylex from '@stylexjs/stylex';
import { AppearancePanel } from '../panels/appearance';
import { LanguagePanel } from '../panels/language-region';
import { row } from './settings-row-styles';
import type { PanelId, PanelProps } from '../types';

const styles = stylex.create({
  contentTopAligned: {
    paddingInlineStart: 'var(--spacing-4)',
    paddingInlineEnd: 'var(--spacing-4)',
    paddingBlockEnd: 'var(--spacing-4)',
    paddingBlockStart: 0,
  },
});

export function SettingsContentPane({ panel, settings, update }: { panel: PanelId } & PanelProps) {
  return (
    <LayoutContent isScrollable padding={0} xstyle={styles.contentTopAligned}>
      <VStack
        gap={4}
        xstyle={row.panel}
      >
        {
          panel === 'appearance'
            ? <AppearancePanel settings={settings} update={update} />
            : <LanguagePanel settings={settings} update={update} />
        }
      </VStack>
    </LayoutContent>
  );
}
