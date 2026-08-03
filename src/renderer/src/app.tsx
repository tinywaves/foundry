import { AppShell } from '@astryxdesign/core/AppShell';
import { Center } from '@astryxdesign/core/Center';
import { Markdown } from '@astryxdesign/core/Markdown';
import { SideNav } from '@astryxdesign/core/SideNav';
import { StackItem, VStack } from '@astryxdesign/core/Stack';
import { Text } from '@astryxdesign/core/Text';
import * as stylex from '@stylexjs/stylex';
import { WindowDragRegion } from '@renderer/components/window-drag-region';

const styles = stylex.create({
  sideNav: {
    overflowX: 'clip',
  },
});

const sources = {
  abc1: {
    title: 'Tokyo - Wikipedia',
    url: 'https://en.wikipedia.org/wiki/Tokyo',
    icon: 'https://en.wikipedia.org/favicon.ico',
  },
  def2: {
    title: 'Japan Statistics Bureau - Population',
    url: 'https://www.stat.go.jp/english/',
  },
  ghi3: {
    title: 'World Population Review',
    url: 'https://worldpopulationreview.com/world-cities/tokyo-population',
  },
  jkl4: {
    title: 'Reuters — Tokyo GDP',
    url: 'https://www.reuters.com/markets/',
    icon: 'https://www.reuters.com/favicon.ico',
  },
  mno5: {
    title: 'UN Urbanization Prospects',
    url: 'https://population.un.org/wup/',
  },
};

const content = [
  '## Tokyo Overview',
  '',
  'Tokyo is the capital of Japan with a population of over 14 million[abc1].',
  'It\'s the most populous metropolitan area in the world[def2][ghi3].',
  '',
  '### Key Facts',
  '',
  '- Population: 13.96 million (city proper)[abc1]',
  '- Metro area: 37.4 million[def2]',
  '- GDP: $1.93 trillion[jkl4]',
].join('\n');

const sidebarResizeConfig = {
  defaultWidth: 260,
  minWidth: 200,
  maxWidth: 400,
};

export default function App() {
  const isMacOS = globalThis.electron.process.platform === 'darwin';

  return (
    <AppShell
      height="fill"
      variant="section"
      contentPadding={0}
      mobileNav={{ breakpoint: 'none', hasToggle: false }}
      sideNav={(
        <VStack height="100%" xstyle={styles.sideNav}>
          {isMacOS && <WindowDragRegion />}
          <StackItem size="fill">
            <SideNav collapsible={false} resizable={sidebarResizeConfig}>
              <Text>Sidebar</Text>
            </SideNav>
          </StackItem>
        </VStack>
      )}
    >
      <VStack height="100%">
        {isMacOS && <WindowDragRegion />}
        <StackItem size="fill" isScrollable>
          <Center axis="horizontal" width="100%" maxWidth={450}>
            <Markdown sources={sources} density="compact" headingLevelStart={3}>
              {content}
            </Markdown>
          </Center>
        </StackItem>
      </VStack>
    </AppShell>
  );
}
