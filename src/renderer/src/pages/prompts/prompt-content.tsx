import { Section } from '@astryxdesign/core/Section';
import { Text } from '@astryxdesign/core/Text';
import { typographyVars } from '@astryxdesign/core/theme/tokens.stylex';
import * as stylex from '@stylexjs/stylex';

const styles = stylex.create({
  content: {
    display: 'block',
    minWidth: 0,
    fontFamily: typographyVars['--font-family-code'],
    overflowWrap: 'anywhere',
    tabSize: 4,
    userSelect: 'text',
    whiteSpace: 'pre-wrap',
  },
});

export function PromptContent({ content }: { content: string }) {
  return (
    <Section variant="muted" padding={4} width="100%">
      <Text as="p" type="code" xstyle={styles.content}>{content}</Text>
    </Section>
  );
}
