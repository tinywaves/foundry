import { Heading } from '@astryxdesign/core/Heading';
import { MetadataList, MetadataListItem } from '@astryxdesign/core/MetadataList';
import { VStack } from '@astryxdesign/core/Stack';
import { Text } from '@astryxdesign/core/Text';
import { Timestamp } from '@astryxdesign/core/Timestamp';
import type { PromptVersionDetail } from '../../../../shared/prompt-contract';
import { PromptContent } from './prompt-content';

export function PromptVersionContent({ version }: { version: PromptVersionDetail }) {
  return (
    <VStack gap={6} width="100%">
      <MetadataList columns="single" label={{ position: 'top' }}>
        <MetadataListItem label="Version">
          <Text>{`Version ${version.version}`}</Text>
        </MetadataListItem>
        <MetadataListItem label="Saved At">
          <Timestamp
            value={new Date(version.createdAt).toISOString()}
            format="date_time"
          />
        </MetadataListItem>
        <MetadataListItem label="Title">
          <Text>{version.title}</Text>
        </MetadataListItem>
        <MetadataListItem label="Description">
          <Text color={version.description ? 'primary' : 'secondary'}>
            {version.description ?? 'None'}
          </Text>
        </MetadataListItem>
      </MetadataList>
      <VStack gap={2} width="100%">
        <Heading level={3}>Prompt</Heading>
        <PromptContent content={version.content} />
      </VStack>
    </VStack>
  );
}
