import { FieldLabel, FieldStatus } from '@astryxdesign/core/Field';
import {
  SegmentedControl,
  SegmentedControlItem,
} from '@astryxdesign/core/SegmentedControl';
import { Skeleton } from '@astryxdesign/core/Skeleton';
import { HStack, VStack } from '@astryxdesign/core/Stack';
import * as stylex from '@stylexjs/stylex';
import { lazy, Suspense, useId } from 'react';
import {
  PROMPT_MARKDOWN_PREVIEW_HEIGHT,
  PromptMarkdownPreview,
} from './prompt-markdown-preview';

const LazyPromptMarkdownSourceEditor = lazy(async () => {
  const module = await import('./prompt-markdown-source-editor');
  return { default: module.PromptMarkdownSourceEditor };
});

const styles = stylex.create({
  hidden: {
    display: 'none',
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
            <Skeleton
              width="100%"
              height={PROMPT_MARKDOWN_PREVIEW_HEIGHT}
              radius={2}
            />
          )}
        >
          <LazyPromptMarkdownSourceEditor
            value={value}
            height={PROMPT_MARKDOWN_PREVIEW_HEIGHT}
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
            <PromptMarkdownPreview value={value} />
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
