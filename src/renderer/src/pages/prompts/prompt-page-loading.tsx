import { Layout, LayoutContent, LayoutHeader } from '@astryxdesign/core/Layout';
import { Skeleton } from '@astryxdesign/core/Skeleton';
import { VStack } from '@astryxdesign/core/Stack';
import { sizeVars, spacingVars } from '@astryxdesign/core/theme/tokens.stylex';
import type { ReactNode } from 'react';
import { PageHeader } from '@renderer/components/page-header';

interface PromptPageLoadingProps {
  start?: ReactNode;
  title: string;
}

export function PromptPageLoading({ start, title }: PromptPageLoadingProps) {
  return (
    <Layout
      height="fill"
      header={(
        <LayoutHeader hasDivider padding={0}>
          <PageHeader start={start} text={title} />
        </LayoutHeader>
      )}
      content={(
        <LayoutContent>
          <VStack gap={4} width="100%">
            <Skeleton width="40%" height={sizeVars['--size-element-md']} />
            <Skeleton width="100%" height={spacingVars['--spacing-12']} />
            <Skeleton width="100%" height={spacingVars['--spacing-12']} />
          </VStack>
        </LayoutContent>
      )}
    />
  );
}
