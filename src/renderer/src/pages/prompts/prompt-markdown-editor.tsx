import { FieldLabel, FieldStatus } from '@astryxdesign/core/Field';
import { Markdown } from '@astryxdesign/core/Markdown';
import {
  SegmentedControl,
  SegmentedControlItem,
} from '@astryxdesign/core/SegmentedControl';
import { Skeleton } from '@astryxdesign/core/Skeleton';
import { HStack, VStack } from '@astryxdesign/core/Stack';
import {
  borderVars,
  colorVars,
  radiusVars,
  spacingVars,
  typeScaleVars,
} from '@astryxdesign/core/theme/tokens.stylex';
import * as stylex from '@stylexjs/stylex';
import { lazy, Suspense, useId } from 'react';

const EDITOR_HEIGHT = `calc(
  ${typeScaleVars['--text-code-size']}
  * ${typeScaleVars['--text-code-leading']}
  * 20
  + ${spacingVars['--spacing-4']} * 2
)`;

const LazyPromptMarkdownSourceEditor = lazy(async () => {
  const module = await import('./prompt-markdown-source-editor');
  return { default: module.PromptMarkdownSourceEditor };
});

const styles = stylex.create({
  hidden: {
    display: 'none',
  },
  preview: {
    backgroundColor: colorVars['--color-background-surface'],
    borderColor: colorVars['--color-border-emphasized'],
    borderRadius: radiusVars['--radius-element'],
    borderStyle: 'solid',
    borderWidth: borderVars['--border-width'],
    boxSizing: 'border-box',
    height: EDITOR_HEIGHT,
    minWidth: 0,
    overflowY: 'auto',
    padding: spacingVars['--spacing-4'],
  },
});

export type PromptMarkdownMode = 'preview' | 'source';

interface PromptMarkdownEditorProps {
  error?: string;
  isDisabled: boolean;
  isReadOnly: boolean;
  onChange: (value: string) => void;
  onModeChange: (mode: PromptMarkdownMode) => void;
  mode: PromptMarkdownMode;
  value: string;
}

function handlePreviewLinkClick(href: string): false | undefined {
  if (href.startsWith('https://') || href.startsWith('http://')) {
    return undefined;
  }
  return false;
}

export function PromptMarkdownEditor({
  error,
  isDisabled,
  isReadOnly,
  onChange,
  onModeChange,
  mode,
  value,
}: PromptMarkdownEditorProps) {
  const inputId = useId();
  const labelId = `${inputId}-label`;
  const statusId = `${inputId}-status`;
  const hasError = error !== undefined;

  return (
    <VStack
      width="100%"
      gap={1}
      role="group"
      aria-labelledby={labelId}
    >
      <HStack width="100%" hAlign="between" vAlign="center">
        <FieldLabel
          label="Content"
          inputID={inputId}
          labelID={labelId}
          isGroupLabel
          isRequired
          isDisabled={isDisabled}
        />
        <SegmentedControl
          label="Content mode"
          size="sm"
          value={mode}
          onChange={(value) => onModeChange(value as PromptMarkdownMode)}
        >
          <SegmentedControlItem value="source" label="Source" />
          <SegmentedControlItem value="preview" label="Preview" />
        </SegmentedControl>
      </HStack>
      <VStack
        width="100%"
        xstyle={mode === 'preview' ? styles.hidden : undefined}
      >
        <Suspense
          fallback={(
            <Skeleton width="100%" height={EDITOR_HEIGHT} radius={2} />
          )}
        >
          <LazyPromptMarkdownSourceEditor
            value={value}
            height={EDITOR_HEIGHT}
            inputID={inputId}
            describedBy={hasError ? statusId : undefined}
            hasError={hasError}
            isReadOnly={isDisabled || isReadOnly}
            isVisible={mode === 'source'}
            onChange={onChange}
          />
        </Suspense>
      </VStack>
      {mode === 'preview'
        ? (
            <VStack
              width="100%"
              role="region"
              aria-label="Content preview"
              xstyle={styles.preview}
            >
              <Markdown
                density="compact"
                headingLevelStart={2}
                contentWidth="100%"
                onLinkClick={handlePreviewLinkClick}
              >
                {value}
              </Markdown>
            </VStack>
          )
        : null}
      {hasError
        ? (
            <FieldStatus
              type="error"
              message={error}
              id={statusId}
              variant="detached"
            />
          )
        : null}
    </VStack>
  );
}
