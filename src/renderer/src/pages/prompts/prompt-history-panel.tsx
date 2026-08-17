import { Banner } from '@astryxdesign/core/Banner';
import { Heading } from '@astryxdesign/core/Heading';
import { Icon } from '@astryxdesign/core/Icon';
import { IconButton } from '@astryxdesign/core/IconButton';
import {
  Layout,
  LayoutContent,
  LayoutHeader,
  LayoutPanel,
} from '@astryxdesign/core/Layout';
import { List, ListItem } from '@astryxdesign/core/List';
import { Section } from '@astryxdesign/core/Section';
import { Skeleton } from '@astryxdesign/core/Skeleton';
import { Spinner } from '@astryxdesign/core/Spinner';
import { HStack, StackItem, VStack } from '@astryxdesign/core/Stack';
import { useToast } from '@astryxdesign/core/Toast';
import { Token } from '@astryxdesign/core/Token';
import { sizeVars } from '@astryxdesign/core/theme/tokens.stylex';
import { useQuery } from '@tanstack/react-query';
import { X } from 'lucide-react';
import { useEffect } from 'react';
import { getPromptVersionListQueryOptions } from './prompt-query';

const promptVersionTimestampFormatter = new Intl.DateTimeFormat(undefined, {
  year: 'numeric',
  month: 'short',
  day: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
});

interface PromptHistoryPanelProps {
  currentVersion: number;
  pendingVersion?: number;
  promptId: string;
  selectedVersion?: number;
  onClose: () => void;
  onSelectVersion: (version: number) => void;
}

function PromptHistoryLoading() {
  return (
    <Section padding={3} width="100%">
      <VStack gap={3} width="100%">
        <Skeleton height={sizeVars['--size-element-md']} index={0} />
        <Skeleton height={sizeVars['--size-element-md']} index={1} />
        <Skeleton height={sizeVars['--size-element-md']} index={2} />
      </VStack>
    </Section>
  );
}

export function PromptHistoryPanel({
  currentVersion,
  pendingVersion,
  promptId,
  selectedVersion,
  onClose,
  onSelectVersion,
}: PromptHistoryPanelProps) {
  const showToast = useToast();
  const versionsQuery = useQuery(getPromptVersionListQueryOptions(promptId));
  const errorMessage = versionsQuery.error?.message;

  useEffect(() => {
    if (!errorMessage) {
      return;
    }
    showToast({
      body: errorMessage,
      type: 'error',
      uniqueID: `prompt-version-list-load-${promptId}`,
    });
  }, [errorMessage, promptId, showToast, versionsQuery.errorUpdatedAt]);

  const versions = versionsQuery.data;
  const activeVersion = selectedVersion ?? currentVersion;
  let content;
  if (!versions) {
    content = versionsQuery.isError
      ? (
          <Section padding={3} width="100%">
            <Banner
              status="error"
              container="section"
              title="Version history could not be loaded"
              description={errorMessage}
            />
          </Section>
        )
      : <PromptHistoryLoading />;
  } else if (versions.length === 0) {
    content = (
      <Section padding={3} width="100%">
        <Banner
          status="info"
          container="section"
          title="No versions available"
        />
      </Section>
    );
  } else {
    content = (
      <List density="compact" hasDividers>
        {versions.map((version) => {
          const isCurrent = version.version === currentVersion;
          const isPending = version.version === pendingVersion;
          const versionName = `Version ${version.version}`;
          const versionTimestamp = promptVersionTimestampFormatter.format(version.createdAt);
          let endContent;
          if (isPending) {
            endContent = (
              <Spinner size="sm" aria-label={`Loading ${versionName}`} />
            );
          } else if (isCurrent) {
            endContent = <Token label="Current" size="sm" color="blue" />;
          }
          return (
            <ListItem
              key={version.version}
              label={versionName}
              description={versionTimestamp}
              endContent={endContent}
              isDisabled={pendingVersion !== undefined}
              isSelected={version.version === activeVersion}
              onClick={() => onSelectVersion(version.version)}
            />
          );
        })}
      </List>
    );
  }

  return (
    <LayoutPanel
      hasDivider
      width={320}
      padding={0}
      isScrollable={false}
      role="complementary"
      label="Version history"
    >
      <Layout
        height="fill"
        header={(
          <LayoutHeader hasDivider padding={2}>
            <HStack gap={2} hAlign="between" vAlign="center">
              <StackItem size="fill">
                <Heading level={4} accessibilityLevel={2}>Version History</Heading>
              </StackItem>
              <IconButton
                label="Close version history"
                tooltip="Close"
                size="sm"
                variant="ghost"
                icon={<Icon icon={X} size="sm" color="inherit" />}
                onClick={onClose}
              />
            </HStack>
          </LayoutHeader>
        )}
        content={<LayoutContent padding={0}>{content}</LayoutContent>}
      />
    </LayoutPanel>
  );
}
