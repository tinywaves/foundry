import { Theme } from '@astryxdesign/core/theme';
import { StackItem } from '@astryxdesign/core/Stack';
import { VStack } from '@astryxdesign/core/VStack';
import { neutralTheme } from '@astryxdesign/theme-neutral/built';
import { preview } from './theme-preview-styles';

export function ThemePreviewCanvas({ mode }: { mode: 'light' | 'dark' }) {
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
