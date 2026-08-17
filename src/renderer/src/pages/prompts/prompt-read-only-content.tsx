import { FieldLabel } from '@astryxdesign/core/Field';
import { FormLayout } from '@astryxdesign/core/FormLayout';
import { VStack } from '@astryxdesign/core/Stack';
import { TextArea } from '@astryxdesign/core/TextArea';
import { TextInput } from '@astryxdesign/core/TextInput';
import { spacingVars } from '@astryxdesign/core/theme/tokens.stylex';
import * as stylex from '@stylexjs/stylex';
import { useId } from 'react';
import { PromptMarkdownPreview } from './prompt-markdown-preview';

const styles = stylex.create({
  fields: {
    borderStyle: 'none',
    margin: spacingVars['--spacing-0'],
    minWidth: 0,
    padding: spacingVars['--spacing-0'],
  },
});

interface PromptReadOnlyContentProps {
  content: string;
  description: string | null;
  title: string;
}

export function PromptReadOnlyContent({
  content,
  description,
  title,
}: PromptReadOnlyContentProps) {
  const contentId = useId();
  const contentLabelId = `${contentId}-label`;

  return (
    <FormLayout direction="vertical">
      <fieldset disabled {...stylex.props(styles.fields)}>
        <FormLayout direction="vertical">
          <TextInput
            label="Title"
            value={title}
            width="100%"
          />
          <TextArea
            label="Description"
            value={description ?? 'None'}
            width="100%"
            rows={2}
          />
        </FormLayout>
      </fieldset>
      <VStack
        width="100%"
        gap={1}
        role="group"
        aria-labelledby={contentLabelId}
      >
        <FieldLabel
          label="Content"
          inputID={contentId}
          labelID={contentLabelId}
          isGroupLabel
        />
        <PromptMarkdownPreview
          id={contentId}
          labelId={contentLabelId}
          value={content}
        />
      </VStack>
    </FormLayout>
  );
}
