import { Card } from '@astryxdesign/core/Card';
import { ClickableCard } from '@astryxdesign/core/ClickableCard';
import { Grid } from '@astryxdesign/core/Grid';
import { Icon } from '@astryxdesign/core/Icon';
import { IconButton } from '@astryxdesign/core/IconButton';
import { Section } from '@astryxdesign/core/Section';
import { Skeleton } from '@astryxdesign/core/Skeleton';
import { HStack, StackItem, VStack } from '@astryxdesign/core/Stack';
import { Text } from '@astryxdesign/core/Text';
import { Timestamp } from '@astryxdesign/core/Timestamp';
import {
  sizeVars,
  spacingVars,
} from '@astryxdesign/core/theme/tokens.stylex';
import * as stylex from '@stylexjs/stylex';
import { RotateCcw, Trash2 } from 'lucide-react';
import type { TrashedPromptSummary } from '../../../../shared/prompt-contract';
import { routePaths } from '@renderer/routes';
import { promptCardGridColumns } from './prompt-card-grid-layout';

const styles = stylex.create({
  card: {
    minWidth: 0,
  },
});

interface PromptTrashCardGridProps {
  isBusy: boolean;
  isRestoring: (promptId: string) => boolean;
  onRemove: (prompt: TrashedPromptSummary) => void;
  onRestore: (prompt: TrashedPromptSummary) => void;
  prompts: TrashedPromptSummary[];
}

export function PromptTrashCardGrid({
  isBusy,
  isRestoring,
  onRemove,
  onRestore,
  prompts,
}: PromptTrashCardGridProps) {
  return (
    <Section variant="transparent" padding={4} width="100%">
      <Grid columns={promptCardGridColumns} gap={3} width="100%">
        {prompts.map((prompt) => (
          <ClickableCard
            key={prompt.id}
            label={`Open trashed ${prompt.title}`}
            href={routePaths.agentExtensionsTrashedPrompt(prompt.id)}
            height="100%"
            xstyle={styles.card}
          >
            <VStack gap={3} height="100%">
              <Text type="label" weight="semibold" maxLines={1}>
                {prompt.title}
              </Text>
              <StackItem size="fill" />
              <HStack gap={3} hAlign="between" vAlign="center" wrap="wrap">
                <HStack gap={1} vAlign="center">
                  <Text type="supporting" color="secondary">Moved to Trash</Text>
                  <Timestamp
                    value={new Date(prompt.trashedAt).toISOString()}
                    format="auto"
                  />
                </HStack>
                <HStack gap={1} vAlign="center">
                  <IconButton
                    label={`Restore ${prompt.title}`}
                    tooltip="Restore Prompt"
                    icon={<Icon icon={RotateCcw} size="sm" color="inherit" />}
                    variant="ghost"
                    size="sm"
                    isLoading={isRestoring(prompt.id)}
                    isDisabled={isBusy && !isRestoring(prompt.id)}
                    onClick={() => onRestore(prompt)}
                  />
                  <IconButton
                    label={`Remove ${prompt.title} from Trash`}
                    tooltip="Remove from Trash"
                    icon={<Icon icon={Trash2} size="sm" color="inherit" />}
                    variant="ghost"
                    size="sm"
                    isDisabled={isBusy}
                    onClick={() => onRemove(prompt)}
                  />
                </HStack>
              </HStack>
            </VStack>
          </ClickableCard>
        ))}
      </Grid>
    </Section>
  );
}

const loadingCards = Array.from({ length: 5 }, (_, index) => index);

export function PromptTrashCardGridLoading() {
  return (
    <Section variant="transparent" padding={4} width="100%">
      <Grid columns={promptCardGridColumns} gap={3} width="100%">
        {loadingCards.map((index) => (
          <Card key={index} height="100%" xstyle={styles.card}>
            <VStack gap={3} height="100%">
              <Skeleton
                width="70%"
                height={spacingVars['--spacing-4']}
                index={index}
              />
              <StackItem size="fill" />
              <HStack gap={3} hAlign="between" vAlign="center">
                <Skeleton
                  width={spacingVars['--spacing-20']}
                  height={spacingVars['--spacing-4']}
                  index={index}
                />
                <Skeleton
                  width={spacingVars['--spacing-12']}
                  height={sizeVars['--size-element-sm']}
                  index={index}
                />
              </HStack>
            </VStack>
          </Card>
        ))}
      </Grid>
    </Section>
  );
}
