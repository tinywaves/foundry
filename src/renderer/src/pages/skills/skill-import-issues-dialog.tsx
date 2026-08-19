import { Code } from '@astryxdesign/core/Code';
import { Dialog, DialogHeader } from '@astryxdesign/core/Dialog';
import { Divider } from '@astryxdesign/core/Divider';
import { Icon } from '@astryxdesign/core/Icon';
import { Layout, LayoutContent } from '@astryxdesign/core/Layout';
import { HStack, StackItem, VStack } from '@astryxdesign/core/Stack';
import { Text } from '@astryxdesign/core/Text';
import { spacingVars } from '@astryxdesign/core/theme/tokens.stylex';
import * as stylex from '@stylexjs/stylex';
import { TriangleAlert } from 'lucide-react';
import { Fragment } from 'react';
import type { SkillImportIssue } from './skill-import-result-model';
import { describeSkillImportIssueLocation } from './skill-import-result-model';

const styles = stylex.create({
  issueIcon: {
    marginTop: spacingVars['--spacing-1'],
  },
});

interface SkillImportIssuesDialogProps {
  issues: readonly SkillImportIssue[];
  onClose: () => void;
}

export function SkillImportIssuesDialog({
  issues,
  onClose,
}: SkillImportIssuesDialogProps) {
  return (
    <Dialog
      isOpen
      onOpenChange={(isOpen) => {
        if (!isOpen) {
          onClose();
        }
      }}
      purpose="info"
      width={520}
      maxHeight="80vh"
    >
      <Layout
        header={(
          <DialogHeader
            title="Import Warnings"
            onOpenChange={(isOpen) => {
              if (!isOpen) {
                onClose();
              }
            }}
          />
        )}
        content={(
          <LayoutContent isScrollable>
            <VStack gap={4} width="100%">
              {issues.map((issue, index) => (
                <Fragment key={issue.id}>
                  {index > 0 && <Divider />}
                  <HStack gap={3} width="100%" vAlign="start">
                    <Icon
                      icon={TriangleAlert}
                      size="sm"
                      color="warning"
                      xstyle={styles.issueIcon}
                    />
                    <StackItem size="fill">
                      <VStack gap={1.5} width="100%">
                        <VStack gap={1} width="100%">
                          <Text type="label" display="block">
                            {issue.title}
                          </Text>
                          <Text
                            as="p"
                            type="supporting"
                            textWrap="pretty"
                          >
                            {issue.description}
                          </Text>
                        </VStack>
                        <Text
                          as="p"
                          type="supporting"
                          wordBreak="break-word"
                        >
                          <Code size="inherit" color="secondary">
                            {describeSkillImportIssueLocation(issue)}
                          </Code>
                        </Text>
                      </VStack>
                    </StackItem>
                  </HStack>
                </Fragment>
              ))}
            </VStack>
          </LayoutContent>
        )}
      />
    </Dialog>
  );
}
