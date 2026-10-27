import { AspectRatio } from '@astryxdesign/core/AspectRatio';
import { HStack } from '@astryxdesign/core/HStack';
import { StackItem } from '@astryxdesign/core/Stack';
import { VStack } from '@astryxdesign/core/VStack';
import { ThemePreviewCanvas } from './theme-preview-canvas';
import { preview } from './theme-preview-styles';

export function ThemePreviewMock({ scheme }: { scheme: 'light' | 'dark' | 'system' }) {
  return (
    <AspectRatio ratio={3 / 2} xstyle={preview.inert}>
      <VStack aria-hidden="true" height="100%" xstyle={preview.clip}>
        {scheme === 'system'
          ? (
              <HStack gap={0} height="100%">
                <StackItem size="fill">
                  <ThemePreviewCanvas mode="light" />
                </StackItem>
                <StackItem size="fill">
                  <ThemePreviewCanvas mode="dark" />
                </StackItem>
              </HStack>
            )
          : <ThemePreviewCanvas mode={scheme} />}
      </VStack>
    </AspectRatio>
  );
}
