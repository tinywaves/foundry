import { Banner } from '@astryxdesign/core/Banner';
import { Button } from '@astryxdesign/core/Button';
import { CheckboxInput } from '@astryxdesign/core/CheckboxInput';
import { Dialog, DialogHeader } from '@astryxdesign/core/Dialog';
import {
  Layout,
  LayoutContent,
  LayoutFooter,
} from '@astryxdesign/core/Layout';
import { NumberInput } from '@astryxdesign/core/NumberInput';
import { HStack, VStack } from '@astryxdesign/core/Stack';
import { TextInput } from '@astryxdesign/core/TextInput';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useId, useState } from 'react';
import type {
  SkillCreateCustomTargetResult,
  SkillCustomTargetDirectorySelection,
  SkillTargetView,
} from '../../../../shared/skill-contract';
import {
  SKILL_TARGET_MAX_SCAN_DEPTH,
  shouldAllowSkillTargetSymlinkEscapeByDefault,
} from '../../../../shared/skill-contract';
import {
  invalidateSkillQueries,
  resolveSkillRequest,
  SkillRequestError,
} from './skill-query';

export type SkillTargetSettingsRequest
  = | { kind: 'create'; candidate: SkillCustomTargetDirectorySelection }
    | { kind: 'edit'; target: SkillTargetView };

export function SkillTargetSettingsDialog({
  request,
  onClose,
}: {
  request: SkillTargetSettingsRequest;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const formId = useId();
  const [displayName, setDisplayName] = useState(
    request.kind === 'create' ? request.candidate.suggestedName : request.target.displayName,
  );
  const [enabled, setEnabled] = useState(
    request.kind === 'create' ? true : request.target.enabled,
  );
  const [maxScanDepth, setMaxScanDepth] = useState(
    request.kind === 'create' ? 4 : request.target.maxScanDepth,
  );
  const [allowSymlinkEscape, setAllowSymlinkEscape] = useState(
    request.kind === 'create'
      ? shouldAllowSkillTargetSymlinkEscapeByDefault
      : request.target.allowSymlinkEscape,
  );
  const saveMutation = useMutation<SkillTargetView, SkillRequestError>({
    mutationFn: async () => {
      if (request.kind === 'create') {
        const result = await resolveSkillRequest<SkillCreateCustomTargetResult>(
          () => globalThis.api.skills.createCustomTarget({
            candidateId: request.candidate.candidateId,
            displayName,
            enabled,
            maxScanDepth,
            allowSymlinkEscape,
          }),
          'The Custom Target could not be added.',
        );
        return result.target;
      }
      return resolveSkillRequest(
        () => globalThis.api.skills.updateTargetPolicy({
          targetId: request.target.id,
          enabled,
          maxScanDepth,
          allowSymlinkEscape,
        }),
        'Target settings could not be saved.',
      );
    },
    onSuccess: () => {
      void invalidateSkillQueries(queryClient);
      onClose();
    },
  });
  const resetMutation = useMutation<SkillTargetView, SkillRequestError>({
    mutationFn: () => {
      if (request.kind !== 'edit') {
        throw new SkillRequestError('Only built-in Targets have adapter defaults.');
      }
      return resolveSkillRequest(
        () => globalThis.api.skills.resetBuiltInTargetPolicy(request.target.id),
        'Adapter defaults could not be restored.',
      );
    },
    onSuccess: () => {
      void invalidateSkillQueries(queryClient);
      onClose();
    },
  });
  const isBusy = saveMutation.isPending || resetMutation.isPending;
  const error = saveMutation.error ?? resetMutation.error;
  const isValid = displayName.trim().length > 0
    && Number.isSafeInteger(maxScanDepth)
    && maxScanDepth >= 1
    && maxScanDepth <= SKILL_TARGET_MAX_SCAN_DEPTH;
  const title = request.kind === 'create'
    ? 'Add Custom Target'
    : `${request.target.displayName} Settings`;

  return (
    <Dialog
      isOpen
      onOpenChange={(isOpen) => {
        if (!isOpen && !isBusy) {
          onClose();
        }
      }}
      purpose={isBusy ? 'required' : 'form'}
      width={600}
      maxHeight="85vh"
    >
      <Layout
        header={(
          <DialogHeader
            title={title}
            subtitle={request.kind === 'create'
              ? undefined
              : request.target.configuredPath}
            onOpenChange={isBusy
              ? undefined
              : (isOpen) => {
                  if (!isOpen) {
                    onClose();
                  }
                }}
          />
        )}
        content={(
          <LayoutContent isScrollable>
            <form
              id={formId}
              onSubmit={(event) => {
                event.preventDefault();
                if (isValid && !isBusy) {
                  saveMutation.mutate();
                }
              }}
            >
              <VStack gap={4} width="100%">
                {error && (
                  <Banner
                    status="error"
                    title="Target Settings Couldn't Be Saved"
                    description={error.message}
                  />
                )}
                {request.kind === 'create' && (
                  <TextInput
                    label="Target Name"
                    value={displayName}
                    onChange={setDisplayName}
                    isRequired
                    width="100%"
                  />
                )}
                <CheckboxInput
                  label="Enable discovery"
                  description="Include this location when Import Existing is run."
                  value={enabled}
                  onChange={setEnabled}
                />
                <NumberInput
                  label="Scan depth"
                  description="Maximum directory depth inspected below this Target."
                  value={maxScanDepth}
                  onChange={setMaxScanDepth}
                  min={1}
                  max={SKILL_TARGET_MAX_SCAN_DEPTH}
                  step={1}
                  isIntegerOnly
                  isRequired
                  width="100%"
                />
                <CheckboxInput
                  label="Allow symbolic links outside the Target"
                  description="Permit discovery to inspect linked directories beyond this Target boundary."
                  value={allowSymlinkEscape}
                  onChange={setAllowSymlinkEscape}
                />
              </VStack>
            </form>
          </LayoutContent>
        )}
        footer={(
          <LayoutFooter hasDivider>
            <HStack gap={2} hAlign="end" width="100%">
              {request.kind === 'edit'
                && request.target.builtIn
                && request.target.policySource === 'user-override' && (
                <Button
                  label="Restore Adapter Defaults"
                  variant="secondary"
                  isLoading={resetMutation.isPending}
                  isDisabled={isBusy}
                  onClick={() => resetMutation.mutate()}
                />
              )}
              <Button
                label="Cancel"
                variant="ghost"
                isDisabled={isBusy}
                onClick={onClose}
              />
              <Button
                label={request.kind === 'create' ? 'Add Target' : 'Save Settings'}
                variant="primary"
                type="submit"
                form={formId}
                isLoading={saveMutation.isPending}
                isDisabled={!isValid || isBusy}
              />
            </HStack>
          </LayoutFooter>
        )}
      />
    </Dialog>
  );
}
