import { Banner } from '@astryxdesign/core/Banner';
import { CodeBlock } from '@astryxdesign/core/CodeBlock';
import { EmptyState } from '@astryxdesign/core/EmptyState';
import { Heading } from '@astryxdesign/core/Heading';
import { Icon } from '@astryxdesign/core/Icon';
import { Section } from '@astryxdesign/core/Section';
import { HStack, StackItem } from '@astryxdesign/core/Stack';
import { TreeList } from '@astryxdesign/core/TreeList';
import type { TreeListItemData } from '@astryxdesign/core/TreeList';
import { useQuery } from '@tanstack/react-query';
import type { UseQueryResult } from '@tanstack/react-query';
import {
  CircleAlert,
  File,
  FileArchive,
  FileQuestion,
  FileSearch,
  FileText,
  Folder,
  Link2,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import type {
  SkillFileReadResult,
  SkillPackageFileEntry,
} from '../../../../shared/skill-contract';
import {
  buildSkillFileTree,
  getSkillFileLanguage,
  isSkillFileSelectable,
} from './skill-detail-model';
import type { SkillFileTreeNode } from './skill-detail-model';
import { SkillInventoryLoading } from './skill-loading';
import {
  getSkillPackageFileQueryOptions,
  getSkillPackageFilesQueryOptions,
  getSkillRevisionFileQueryOptions,
  getSkillRevisionFilesQueryOptions,
} from './skill-query';

interface SkillFileInspectorProps {
  skillId: string;
  revisionId?: string;
}

export function SkillFileInspector({ skillId, revisionId }: SkillFileInspectorProps) {
  return revisionId
    ? <SkillRevisionFileInspector key={revisionId} skillId={skillId} revisionId={revisionId} />
    : <SkillCurrentFileInspector skillId={skillId} />;
}

function SkillCurrentFileInspector({ skillId }: { skillId: string }) {
  const filesQuery = useQuery(getSkillPackageFilesQueryOptions(skillId));
  return <SkillFileInspectorView skillId={skillId} filesQuery={filesQuery} />;
}

function SkillRevisionFileInspector({
  skillId,
  revisionId,
}: Required<SkillFileInspectorProps>) {
  const filesQuery = useQuery(getSkillRevisionFilesQueryOptions(skillId, revisionId));
  return (
    <SkillFileInspectorView
      skillId={skillId}
      revisionId={revisionId}
      filesQuery={filesQuery}
    />
  );
}

interface SkillFileInspectorViewProps extends SkillFileInspectorProps {
  filesQuery: UseQueryResult<SkillPackageFileEntry[]>;
}

function SkillFileInspectorView({
  skillId,
  revisionId,
  filesQuery,
}: SkillFileInspectorViewProps) {
  const [selectedPath, setSelectedPath] = useState<string>();

  const treeItems = useMemo(() => mapFileTreeItems(
    filesQuery.data ?? [],
    selectedPath,
    setSelectedPath,
  ), [filesQuery.data, selectedPath]);

  let treeContent;
  if (filesQuery.isPending) {
    treeContent = <SkillInventoryLoading />;
  } else if (filesQuery.data === undefined) {
    treeContent = (
      <Banner
        status="error"
        container="section"
        title="Couldn't Load Files"
        description={filesQuery.error.message}
      />
    );
  } else if (filesQuery.data.length === 0) {
    treeContent = (
      <EmptyState
        headingLevel={3}
        title="No Files"
        icon={<Icon icon={FileQuestion} size="lg" color="secondary" />}
      />
    );
  } else {
    treeContent = (
      <TreeList
        items={treeItems}
        density="compact"
        variant="noGuides"
      />
    );
  }

  return (
    <HStack width="100%" height="100%" gap={0}>
      <Section
        width={280}
        height="100%"
        padding={2}
        dividers={['end']}
      >
        <Heading level={4} accessibilityLevel={2}>Files</Heading>
        {treeContent}
      </Section>
      <StackItem size="fill">
        <Section variant="transparent" height="100%" padding={4}>
          {selectedPath
            ? (
                <SkillFilePreview
                  skillId={skillId}
                  revisionId={revisionId}
                  relativePath={selectedPath}
                />
              )
            : (
                <EmptyState
                  headingLevel={3}
                  title="No File Selected"
                  icon={<Icon icon={FileSearch} size="lg" color="secondary" />}
                />
              )}
        </Section>
      </StackItem>
    </HStack>
  );
}

interface SkillFilePreviewProps {
  skillId: string;
  revisionId?: string;
  relativePath: string;
}

function SkillFilePreview({
  skillId,
  revisionId,
  relativePath,
}: SkillFilePreviewProps) {
  return revisionId
    ? (
        <SkillRevisionFilePreview
          key={revisionId}
          skillId={skillId}
          revisionId={revisionId}
          relativePath={relativePath}
        />
      )
    : <SkillCurrentFilePreview skillId={skillId} relativePath={relativePath} />;
}

function SkillCurrentFilePreview({
  skillId,
  relativePath,
}: Omit<SkillFilePreviewProps, 'revisionId'>) {
  const fileQuery = useQuery(getSkillPackageFileQueryOptions(skillId, relativePath));
  return <SkillFilePreviewQuery fileQuery={fileQuery} />;
}

function SkillRevisionFilePreview({
  skillId,
  revisionId,
  relativePath,
}: Required<SkillFilePreviewProps>) {
  const fileQuery = useQuery(getSkillRevisionFileQueryOptions(
    skillId,
    revisionId,
    relativePath,
  ));
  return <SkillFilePreviewQuery fileQuery={fileQuery} />;
}

function SkillFilePreviewQuery({
  fileQuery,
}: {
  fileQuery: UseQueryResult<SkillFileReadResult>;
}) {
  if (fileQuery.isPending) {
    return <SkillInventoryLoading />;
  }
  if (fileQuery.data === undefined) {
    return (
      <Banner
        status="error"
        container="section"
        title="Couldn't Load File"
        description={fileQuery.error.message}
      />
    );
  }
  return <SkillFileReadPreview result={fileQuery.data} />;
}

function SkillFileReadPreview({ result }: { result: SkillFileReadResult }) {
  if (result.status === 'text') {
    return (
      <CodeBlock
        code={result.content}
        language={getSkillFileLanguage(result.relativePath)}
        title={result.relativePath}
        hasLineNumbers={result.content.includes('\n')}
        isWrapped
        width="100%"
        container="section"
      />
    );
  }
  const presentations = {
    'binary': { title: 'Binary File', icon: FileArchive },
    'oversized': { title: 'File Too Large', icon: FileArchive },
    'symbolic-link': { title: 'Symbolic Link', icon: Link2 },
    'missing': { title: 'File Missing', icon: FileQuestion },
    'unreadable': { title: 'File Unreadable', icon: CircleAlert },
  } as const;
  const presentation = presentations[result.status];
  return (
    <EmptyState
      headingLevel={3}
      title={presentation.title}
      icon={<Icon icon={presentation.icon} size="lg" color="secondary" />}
    />
  );
}

function mapFileTreeItems(
  entries: readonly SkillPackageFileEntry[],
  selectedPath: string | undefined,
  onSelect: (relativePath: string) => void,
): TreeListItemData[] {
  return buildSkillFileTree(entries).map((node) => mapFileTreeItem(
    node,
    selectedPath,
    onSelect,
  ));
}

function mapFileTreeItem(
  node: SkillFileTreeNode,
  selectedPath: string | undefined,
  onSelect: (relativePath: string) => void,
): TreeListItemData {
  return {
    id: node.id,
    label: node.label,
    startContent: <Icon icon={getFileIcon(node.entry)} size="sm" color="secondary" />,
    isSelected: node.id === selectedPath,
    ...(node.children && {
      children: node.children.map((child) => mapFileTreeItem(
        child,
        selectedPath,
        onSelect,
      )),
      isExpanded: true,
    }),
    ...(isSkillFileSelectable(node.entry.kind) && {
      onClick: () => onSelect(node.entry.relativePath),
    }),
  };
}

function getFileIcon(entry: SkillPackageFileEntry) {
  if (entry.kind === 'directory') {
    return Folder;
  }
  if (entry.kind === 'symbolic-link') {
    return Link2;
  }
  if (entry.kind === 'unreadable') {
    return CircleAlert;
  }
  return entry.relativePath.endsWith('.md') ? FileText : File;
}
