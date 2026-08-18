import { Banner } from '@astryxdesign/core/Banner';
import { Button } from '@astryxdesign/core/Button';
import { Dialog, DialogHeader } from '@astryxdesign/core/Dialog';
import { EmptyState } from '@astryxdesign/core/EmptyState';
import { Icon } from '@astryxdesign/core/Icon';
import { IconButton } from '@astryxdesign/core/IconButton';
import {
  Layout,
  LayoutContent,
  LayoutFooter,
} from '@astryxdesign/core/Layout';
import { Selector } from '@astryxdesign/core/Selector';
import { HStack, StackItem, VStack } from '@astryxdesign/core/Stack';
import { Tab, TabList } from '@astryxdesign/core/TabList';
import { proportional, Table } from '@astryxdesign/core/Table';
import type { TableColumn } from '@astryxdesign/core/Table';
import { Text } from '@astryxdesign/core/Text';
import { TextInput } from '@astryxdesign/core/TextInput';
import { Toolbar } from '@astryxdesign/core/Toolbar';
import { useToast } from '@astryxdesign/core/Toast';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Compass,
  ExternalLink,
  GitBranch,
  PackagePlus,
  Search,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import type {
  SkillAddRemoteCandidateResult,
  SkillGitResolutionView,
  SkillRemoteDetailView,
  SkillRemoteResultView,
  SkillRemoteSearchInput,
  SkillResolveGitSourceInput,
} from '../../../../shared/skill-contract';
import {
  chooseRemoteVersion,
  createGitResolutionInput,
  createRemoteSearchInput,
  describeRemoteAddOutcome,
  describeRemoteFailure,
  replaceRemoteSearchResults,
} from './skill-remote-discovery-model';
import type {
  SkillDiscoverMode,
  SkillRemoteSearchState,
} from './skill-remote-discovery-model';
import { SkillInventoryLoading } from './skill-loading';
import {
  invalidateSkillQueries,
  resolveSkillRequest,
} from './skill-query';
import type { SkillRequestError } from './skill-query';

type SkillDiscoverySelection
  = | { kind: 'clawhub'; details: SkillRemoteDetailView }
    | { kind: 'git'; resolution: SkillGitResolutionView };

interface SkillRemoteResultRow extends Record<string, unknown> {
  id: string;
  name: string;
  publisher: string;
  version: string;
  result: SkillRemoteResultView;
}

const sourceTabs = [
  { value: 'git', label: 'Git' },
  { value: 'clawhub', label: 'ClawHub' },
  { value: 'skills-sh', label: 'skills.sh' },
] as const;

export function SkillDiscoverPage() {
  const showToast = useToast();
  const [mode, setMode] = useState<SkillDiscoverMode>('git');
  const [query, setQuery] = useState('');
  const [sourceUrl, setSourceUrl] = useState('');
  const [requestedRef, setRequestedRef] = useState('');
  const [searchState, setSearchState] = useState<SkillRemoteSearchState | null>(null);
  const [selection, setSelection] = useState<SkillDiscoverySelection>();

  const searchMutation = useMutation<
    SkillRemoteResultView[],
    SkillRequestError,
    SkillRemoteSearchInput
  >({
    mutationFn: (input) => resolveSkillRequest(
      () => globalThis.api.skills.searchRemoteSkills(input),
      'Remote Skills could not be searched.',
    ),
    onSuccess: (results, input) => {
      setSearchState((current) => replaceRemoteSearchResults(current, input, results));
      setSelection(undefined);
    },
  });
  const browseMutation = useMutation<SkillRemoteResultView[], SkillRequestError>({
    mutationFn: () => resolveSkillRequest(
      () => globalThis.api.skills.browseRemoteSkills({ provider: 'clawhub' }),
      'ClawHub could not be browsed.',
    ),
    onSuccess: (results) => {
      setSearchState((current) => replaceRemoteSearchResults(current, {
        provider: 'clawhub',
        query: 'Browse',
      }, results));
      setSelection(undefined);
    },
  });
  const detailMutation = useMutation<SkillRemoteDetailView, SkillRequestError, string>({
    mutationFn: (resultId) => resolveSkillRequest(
      () => globalThis.api.skills.getRemoteSkillDetails({ resultId }),
      'ClawHub Skill details could not be loaded.',
    ),
    onSuccess: (details) => setSelection({ kind: 'clawhub', details }),
  });
  const directoryMutation = useMutation<SkillGitResolutionView, SkillRequestError, string>({
    mutationFn: (resultId) => resolveSkillRequest(
      () => globalThis.api.skills.resolveDirectoryResult({ resultId }),
      'The directory result could not be resolved through Git.',
    ),
    onSuccess: (resolution) => setSelection({ kind: 'git', resolution }),
  });
  const gitMutation = useMutation<
    SkillGitResolutionView,
    SkillRequestError,
    SkillResolveGitSourceInput
  >({
    mutationFn: (input) => resolveSkillRequest(
      () => globalThis.api.skills.resolveGitSource(input),
      'The Git Source could not be resolved.',
    ),
    onSuccess: (resolution) => setSelection({ kind: 'git', resolution }),
  });
  const openMutation = useMutation<null, SkillRequestError, string>({
    mutationFn: (resultId) => resolveSkillRequest(
      () => globalThis.api.skills.openRemoteResult({ resultId }),
      'The remote listing could not be opened.',
    ),
    onError: (error) => showToast({
      body: describeRemoteFailure(error),
      type: 'error',
      uniqueID: 'skill-discover-open',
    }),
  });

  const visibleResults = useMemo(() => (
    mode === 'git' || searchState?.provider !== mode ? [] : searchState.results
  ), [mode, searchState]);
  const rows = useMemo<SkillRemoteResultRow[]>(() => visibleResults.map((result) => ({
    id: result.id,
    name: result.name,
    publisher: result.publisher ?? 'Unknown',
    version: result.latestVersion ?? 'Git',
    result,
  })), [visibleResults]);
  const columns = useMemo<Array<TableColumn<SkillRemoteResultRow>>>(() => [
    { key: 'name', header: 'Skill', width: proportional(2) },
    { key: 'publisher', header: 'Publisher', width: proportional(1) },
    { key: 'version', header: 'Latest', width: proportional(1) },
    {
      key: 'id',
      header: 'Actions',
      width: proportional(1),
      align: 'end',
      renderCell: (row) => (
        <HStack gap={1} hAlign="end" vAlign="center">
          <Button
            label={row.result.provider === 'clawhub' ? 'Details' : 'Resolve'}
            variant="ghost"
            size="sm"
            isLoading={row.result.provider === 'clawhub'
              ? detailMutation.isPending && detailMutation.variables === row.id
              : directoryMutation.isPending && directoryMutation.variables === row.id}
            onClick={() => {
              if (row.result.provider === 'clawhub') {
                detailMutation.mutate(row.id);
              } else {
                directoryMutation.mutate(row.id);
              }
            }}
          />
          <IconButton
            label={`Open ${row.name} listing`}
            tooltip="Open listing"
            icon={<Icon icon={ExternalLink} size="sm" color="inherit" />}
            variant="ghost"
            size="sm"
            isLoading={openMutation.isPending && openMutation.variables === row.id}
            onClick={() => openMutation.mutate(row.id)}
          />
        </HStack>
      ),
    },
  ], [detailMutation, directoryMutation, openMutation]);
  const error = mode === 'git'
    ? gitMutation.error
    : searchMutation.error
      ?? browseMutation.error
      ?? detailMutation.error
      ?? directoryMutation.error;
  const isLoading = mode === 'git'
    ? gitMutation.isPending
    : (searchMutation.isPending || browseMutation.isPending)
      && visibleResults.length === 0;

  const changeMode = (value: string) => {
    if (!isSkillDiscoverMode(value)) {
      return;
    }
    setMode(value);
    setSelection(undefined);
  };
  const runSearch = () => {
    if (mode === 'git') {
      const input = createGitResolutionInput(sourceUrl, requestedRef);
      if (input) {
        gitMutation.mutate(input);
      }
      return;
    }
    const input = createRemoteSearchInput(mode, query);
    if (input) {
      searchMutation.mutate(input);
    }
  };
  let content = (
    <EmptyState
      headingLevel={2}
      title={mode === 'git' ? 'No Git Source Resolved' : 'No Remote Results'}
      description={mode === 'git'
        ? 'No repository result is currently selected.'
        : 'No provider result is currently loaded.'}
      icon={(
        <Icon
          icon={mode === 'git' ? GitBranch : Compass}
          size="lg"
          color="secondary"
        />
      )}
    />
  );
  if (isLoading) {
    content = <SkillInventoryLoading />;
  } else if (rows.length > 0) {
    content = (
      <Table
        data={rows}
        columns={columns}
        idKey="id"
        density="compact"
        dividers="rows"
        textOverflow="truncate"
        aria-label="Remote Skill results"
      />
    );
  }

  return (
    <>
      <VStack width="100%" height="100%">
        <Toolbar
          label="Skill Discovery Sources"
          size="sm"
          startContent={(
            <TabList value={mode} onChange={changeMode} size="sm">
              {sourceTabs.map((tab) => (
                <Tab key={tab.value} value={tab.value} label={tab.label} />
              ))}
            </TabList>
          )}
        />
        <DiscoveryControls
          mode={mode}
          query={query}
          sourceUrl={sourceUrl}
          requestedRef={requestedRef}
          isSearching={searchMutation.isPending || gitMutation.isPending}
          isBrowsing={browseMutation.isPending}
          onQueryChange={setQuery}
          onSourceUrlChange={setSourceUrl}
          onRequestedRefChange={setRequestedRef}
          onSubmit={runSearch}
          onBrowse={() => browseMutation.mutate()}
        />
        {error && (
          <Banner
            status={error.apiError?.code === 'rate-limited' ? 'warning' : 'error'}
            container="section"
            title="Remote Discovery Couldn't Continue"
            description={describeRemoteFailure(error)}
          />
        )}
        <StackItem size="fill">
          {content}
        </StackItem>
      </VStack>
      {selection && (
        <SkillRemoteSelectionDialog
          selection={selection}
          onClose={() => setSelection(undefined)}
        />
      )}
    </>
  );
}

function DiscoveryControls({
  mode,
  query,
  sourceUrl,
  requestedRef,
  isSearching,
  isBrowsing,
  onQueryChange,
  onSourceUrlChange,
  onRequestedRefChange,
  onSubmit,
  onBrowse,
}: {
  mode: SkillDiscoverMode;
  query: string;
  sourceUrl: string;
  requestedRef: string;
  isSearching: boolean;
  isBrowsing: boolean;
  onQueryChange: (value: string) => void;
  onSourceUrlChange: (value: string) => void;
  onRequestedRefChange: (value: string) => void;
  onSubmit: () => void;
  onBrowse: () => void;
}) {
  let canSubmit = createRemoteSearchInput(
    mode === 'git' ? 'clawhub' : mode,
    query,
  ) !== null;
  if (mode === 'git') {
    canSubmit = createGitResolutionInput(sourceUrl, requestedRef) !== null;
  }
  return (
    <Toolbar
      label="Remote Skill Search"
      size="sm"
      startContent={mode === 'git'
        ? (
            <HStack gap={2} width="100%" vAlign="end">
              <StackItem size="fill">
                <TextInput
                  label="Git repository or tree URL"
                  value={sourceUrl}
                  onChange={onSourceUrlChange}
                  placeholder="https://github.com/owner/repository"
                  width="100%"
                />
              </StackItem>
              <TextInput
                label="Ref"
                value={requestedRef}
                onChange={onRequestedRefChange}
                placeholder="Default branch"
                isOptional
                width={200}
              />
            </HStack>
          )
        : (
            <TextInput
              label={`Search ${mode === 'clawhub' ? 'ClawHub' : 'skills.sh'}`}
              value={query}
              onChange={onQueryChange}
              startIcon={Search}
              hasClear
              isLabelHidden
              placeholder="Search Skills"
              width="100%"
            />
          )}
      endContent={(
        <HStack gap={2} vAlign="center">
          {mode === 'clawhub' && (
            <Button
              label="Browse"
              variant="secondary"
              icon={<Icon icon={Compass} size="sm" color="inherit" />}
              isLoading={isBrowsing}
              isDisabled={isBrowsing || isSearching}
              onClick={onBrowse}
            />
          )}
          <Button
            label={mode === 'git' ? 'Resolve' : 'Search'}
            variant="primary"
            icon={<Icon icon={mode === 'git' ? GitBranch : Search} size="sm" color="inherit" />}
            isLoading={isSearching}
            isDisabled={!canSubmit || isSearching || isBrowsing}
            onClick={onSubmit}
          />
        </HStack>
      )}
    />
  );
}

function SkillRemoteSelectionDialog({
  selection,
  onClose,
}: {
  selection: SkillDiscoverySelection;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const showToast = useToast();
  const recommendedVersion = selection.kind === 'clawhub'
    ? chooseRemoteVersion(selection.details, null)
    : null;
  const initialCandidateId = selection.kind === 'clawhub'
    ? recommendedVersion?.id ?? ''
    : selection.resolution.packages[0]?.id ?? '';
  const [candidateId, setCandidateId] = useState(initialCandidateId);
  const remoteMutation = useMutation<SkillAddRemoteCandidateResult, SkillRequestError>({
    mutationFn: () => resolveSkillRequest(
      () => globalThis.api.skills.addRemoteCandidate({ candidateId }),
      'The remote Skill could not be added to Store.',
    ),
    onSuccess: (result) => {
      const outcome = describeRemoteAddOutcome(result);
      showToast({
        body: `${outcome.title}. ${outcome.message}`,
        type: 'info',
        uniqueID: 'skill-remote-added',
      });
      void invalidateSkillQueries(queryClient);
      onClose();
    },
  });
  const title = selection.kind === 'clawhub'
    ? selection.details.result.name
    : 'Git Skill Packages';
  const subtitle = selection.kind === 'clawhub'
    ? selection.details.result.sourceNativeId
    : selection.resolution.resolvedRevision;
  const options = selection.kind === 'clawhub'
    ? selection.details.versions.map((version) => ({
        value: version.id,
        label: version.trackingMode === 'tracked'
          ? `${version.label} (${version.version})`
          : version.label,
      }))
    : selection.resolution.packages.map((skillPackage) => ({
        value: skillPackage.id,
        label: skillPackage.packagePath,
      }));
  const selectedVersion = selection.kind === 'clawhub'
    ? chooseRemoteVersion(selection.details, candidateId)
    : null;
  const isBusy = remoteMutation.isPending;
  const handleHeaderOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      onClose();
    }
  };

  return (
    <Dialog
      isOpen
      onOpenChange={(isOpen) => {
        if (!isOpen && !isBusy) {
          onClose();
        }
      }}
      purpose={isBusy ? 'required' : 'form'}
      width={760}
      maxHeight="85vh"
    >
      <Layout
        header={(
          <DialogHeader
            title={title}
            subtitle={subtitle}
            onOpenChange={isBusy
              ? undefined
              : handleHeaderOpenChange}
          />
        )}
        content={(
          <LayoutContent isScrollable>
            <VStack gap={4} width="100%">
              {remoteMutation.error && (
                <Banner
                  status={remoteMutation.error.apiError?.code === 'rate-limited'
                    ? 'warning'
                    : 'error'}
                  title="Add to Store Couldn't Finish"
                  description={describeRemoteFailure(remoteMutation.error)}
                />
              )}
              {selection.kind === 'clawhub' && selection.details.result.description && (
                <Text type="body">{selection.details.result.description}</Text>
              )}
              {options.length > 0
                ? (
                    <Selector
                      label={selection.kind === 'clawhub' ? 'Version' : 'Skill Package'}
                      options={options}
                      value={candidateId}
                      onChange={setCandidateId}
                      isDisabled={isBusy}
                      width="100%"
                    />
                  )
                : (
                    <EmptyState
                      headingLevel={3}
                      title="No Recognized Skill Packages"
                      description="The resolved source did not contain a package with a root SKILL.md."
                      icon={<Icon icon={GitBranch} size="lg" color="secondary" />}
                    />
                  )}
              {selectedVersion?.changelog && (
                <VStack gap={1} width="100%">
                  <Text type="label">Changelog</Text>
                  <Text type="supporting">{selectedVersion.changelog}</Text>
                </VStack>
              )}
            </VStack>
          </LayoutContent>
        )}
        footer={(
          <LayoutFooter hasDivider>
            <HStack gap={2} hAlign="end" width="100%">
              <Button
                label="Cancel"
                variant="ghost"
                isDisabled={isBusy}
                onClick={onClose}
              />
              <Button
                label="Add to Store"
                variant="primary"
                icon={<Icon icon={PackagePlus} size="sm" color="inherit" />}
                isLoading={isBusy}
                isDisabled={candidateId === '' || isBusy}
                onClick={() => remoteMutation.mutate()}
              />
            </HStack>
          </LayoutFooter>
        )}
      />
    </Dialog>
  );
}

function isSkillDiscoverMode(value: string): value is SkillDiscoverMode {
  return sourceTabs.some((tab) => tab.value === value);
}
