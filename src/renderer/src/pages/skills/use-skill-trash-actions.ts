import { useToast } from '@astryxdesign/core/Toast';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type {
  SkillEmptyTrashResult,
  SkillStorePackageView,
  SkillTrashPackageView,
} from '../../../../shared/skill-contract';
import {
  emptySkillTrashCaches,
  moveSkillPackageToTrashCaches,
  removeSkillPackageFromTrashCaches,
  resolveSkillRequest,
  restoreSkillPackageCaches,
} from './skill-query';
import type { SkillRequestError } from './skill-query';

export function useSkillTrashActions() {
  const queryClient = useQueryClient();
  const showToast = useToast();
  const moveMutation = useMutation<
    SkillTrashPackageView,
    SkillRequestError,
    SkillStorePackageView
  >({
    mutationFn: (skillPackage) => resolveSkillRequest(
      () => globalThis.api.skills.movePackageToTrash(skillPackage.id),
      'Skill Package could not be moved to Trash.',
    ),
    retry: false,
    onSuccess: (trashedPackage) => {
      moveSkillPackageToTrashCaches(queryClient, trashedPackage);
      showToast({
        body: 'Skill Package moved to Trash.',
        uniqueID: `skill-trash-move-success-${trashedPackage.id}`,
      });
    },
    onError: (error, skillPackage) => {
      showToast({
        body: error.message,
        type: 'error',
        uniqueID: `skill-trash-move-error-${skillPackage.id}`,
      });
    },
  });
  const restoreMutation = useMutation<
    SkillStorePackageView,
    SkillRequestError,
    SkillTrashPackageView
  >({
    mutationFn: (skillPackage) => resolveSkillRequest(
      () => globalThis.api.skills.restoreTrashedPackage(skillPackage.id),
      'Skill Package could not be restored.',
    ),
    retry: false,
    onSuccess: (restoredPackage) => {
      restoreSkillPackageCaches(queryClient, restoredPackage);
      showToast({
        body: 'Skill Package restored.',
        uniqueID: `skill-trash-restore-success-${restoredPackage.id}`,
      });
    },
    onError: (error, skillPackage) => {
      showToast({
        body: error.message,
        type: 'error',
        uniqueID: `skill-trash-restore-error-${skillPackage.id}`,
      });
    },
  });
  const removalMutation = useMutation<null, SkillRequestError, SkillTrashPackageView>({
    mutationFn: (skillPackage) => resolveSkillRequest(
      () => globalThis.api.skills.removeTrashedPackage(skillPackage.id),
      'Skill Package could not be removed from Trash.',
    ),
    retry: false,
    onSuccess: (_value, skillPackage) => {
      removeSkillPackageFromTrashCaches(queryClient, skillPackage.id);
      showToast({
        body: 'Skill Package removed permanently.',
        uniqueID: `skill-trash-remove-success-${skillPackage.id}`,
      });
    },
    onError: (error, skillPackage) => {
      showToast({
        body: error.message,
        type: 'error',
        uniqueID: `skill-trash-remove-error-${skillPackage.id}`,
      });
    },
  });
  const emptyMutation = useMutation<
    SkillEmptyTrashResult,
    SkillRequestError,
    SkillTrashPackageView[]
  >({
    mutationFn: () => resolveSkillRequest(
      () => globalThis.api.skills.emptyTrash(),
      'Skill Trash could not be emptied.',
    ),
    retry: false,
    onSuccess: (result) => {
      emptySkillTrashCaches(queryClient, result);
      showToast({
        body: result.failures.length === 0
          ? `${result.removedIds.length} Skill Packages removed permanently.`
          : `${result.removedIds.length} removed; ${result.failures.length} could not be removed.`,
        ...(result.failures.length > 0 && { type: 'error' }),
        uniqueID: 'skill-trash-empty-result',
      });
    },
    onError: (error) => {
      showToast({
        body: error.message,
        type: 'error',
        uniqueID: 'skill-trash-empty-error',
      });
    },
  });

  return {
    emptyMutation,
    moveMutation,
    removalMutation,
    restoreMutation,
  };
}
