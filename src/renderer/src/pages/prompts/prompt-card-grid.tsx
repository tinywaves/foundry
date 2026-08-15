import { Card } from '@astryxdesign/core/Card';
import { Center } from '@astryxdesign/core/Center';
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
  borderVars,
  colorVars,
  radiusVars,
  sizeVars,
  spacingVars,
} from '@astryxdesign/core/theme/tokens.stylex';
import * as stylex from '@stylexjs/stylex';
import { Copy, Pencil, Plus, Trash2 } from 'lucide-react';
import type { PromptSummary } from '../../../../shared/prompt-contract';
import { routePaths } from '@renderer/routes';

const styles = stylex.create({
  card: {
    minWidth: 0,
  },
  createCard: {
    borderWidth: borderVars['--border-width'],
    borderStyle: 'dashed',
    borderColor: colorVars['--color-border-emphasized'],
    backgroundColor: 'transparent',
  },
  createIconContainer: {
    borderRadius: radiusVars['--radius-full'],
    backgroundColor: colorVars['--color-accent-muted'],
  },
});

const promptGridColumns = {
  minWidth: 280,
  max: 4,
  repeat: 'fill',
} as const;

interface PromptCardGridProps {
  prompts: PromptSummary[];
  isCopying: (promptId: string) => boolean;
  onCopy: (promptId: string) => void;
  onEdit: (promptId: string) => void;
  onMoveToTrash: (prompt: PromptSummary) => void;
}

function NewPromptCard() {
  return (
    <ClickableCard
      label="Create New Prompt"
      href={routePaths.agentExtensionsPromptsNew}
      variant="transparent"
      height="100%"
      padding={4}
      xstyle={[styles.card, styles.createCard]}
    >
      <VStack gap={2} height="100%" hAlign="center" vAlign="center">
        <Center
          width={sizeVars['--size-element-lg']}
          height={sizeVars['--size-element-lg']}
          xstyle={styles.createIconContainer}
        >
          <Icon icon={Plus} size="md" color="accent" />
        </Center>
        <Text type="label" weight="semibold">New Prompt</Text>
        <Text type="supporting" color="secondary">Create a reusable Prompt</Text>
      </VStack>
    </ClickableCard>
  );
}

export function PromptCardGrid({
  prompts,
  isCopying,
  onCopy,
  onEdit,
  onMoveToTrash,
}: PromptCardGridProps) {
  return (
    <Section variant="transparent" padding={4} width="100%">
      <Grid
        columns={promptGridColumns}
        gap={3}
        width="100%"
      >
        <NewPromptCard />
        {prompts.map((prompt) => (
          <ClickableCard
            key={prompt.id}
            label={`Open ${prompt.title}`}
            href={routePaths.agentExtensionsPrompt(prompt.id)}
            height="100%"
            xstyle={styles.card}
          >
            <VStack gap={3} height="100%">
              <Text type="label" weight="semibold" maxLines={1}>
                {prompt.title}
              </Text>
              <StackItem size="fill">
                <Text type="supporting" color="secondary" maxLines={2}>
                  {prompt.description ?? 'No description'}
                </Text>
              </StackItem>
              <HStack gap={3} hAlign="between" vAlign="center" wrap="wrap">
                <Timestamp
                  value={new Date(prompt.updatedAt).toISOString()}
                  format="auto"
                />
                <HStack gap={1} vAlign="center">
                  <IconButton
                    label={`Copy ${prompt.title}`}
                    tooltip="Copy Prompt"
                    icon={<Icon icon={Copy} size="sm" color="inherit" />}
                    variant="ghost"
                    size="sm"
                    isLoading={isCopying(prompt.id)}
                    onClick={() => onCopy(prompt.id)}
                  />
                  <IconButton
                    label={`Edit ${prompt.title}`}
                    tooltip="Edit Prompt"
                    icon={<Icon icon={Pencil} size="sm" color="inherit" />}
                    variant="ghost"
                    size="sm"
                    onClick={() => onEdit(prompt.id)}
                  />
                  <IconButton
                    label={`Move ${prompt.title} to Trash`}
                    tooltip="Move to Trash"
                    icon={<Icon icon={Trash2} size="sm" color="inherit" />}
                    variant="ghost"
                    size="sm"
                    onClick={() => onMoveToTrash(prompt)}
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

export function PromptCardGridLoading() {
  return (
    <Section variant="transparent" padding={4} width="100%">
      <Grid
        columns={promptGridColumns}
        gap={3}
        width="100%"
      >
        <NewPromptCard />
        {loadingCards.map((index) => (
          <Card key={index} height="100%" xstyle={styles.card}>
            <VStack gap={3} height="100%">
              <Skeleton
                width="70%"
                height={spacingVars['--spacing-4']}
                index={index}
              />
              <VStack gap={2}>
                <Skeleton
                  width="100%"
                  height={spacingVars['--spacing-3']}
                  index={index}
                />
                <Skeleton
                  width="80%"
                  height={spacingVars['--spacing-3']}
                  index={index}
                />
              </VStack>
              <StackItem size="fill" />
              <HStack gap={3} hAlign="between" vAlign="center">
                <Skeleton
                  width={spacingVars['--spacing-16']}
                  height={spacingVars['--spacing-4']}
                  index={index}
                />
                <Skeleton
                  width={spacingVars['--spacing-20']}
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
