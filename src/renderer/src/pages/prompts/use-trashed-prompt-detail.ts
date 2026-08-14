import { useToast } from '@astryxdesign/core/Toast';
import { useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';
import { useNavigate } from 'react-router';
import { routePaths } from '@renderer/routes';
import { getTrashedPromptDetailQueryOptions } from './prompt-query';

export function useTrashedPromptDetail(promptId: string) {
  const navigate = useNavigate();
  const showToast = useToast();
  const query = useQuery(getTrashedPromptDetailQueryOptions(promptId));
  const errorMessage = query.error?.message;
  const hasData = query.data !== undefined;

  useEffect(() => {
    if (!errorMessage) {
      return;
    }
    showToast({
      body: errorMessage,
      type: 'error',
      uniqueID: `trashed-prompt-detail-load-${promptId}`,
    });
    if (!hasData) {
      void navigate(routePaths.agentExtensionsPromptsTrash, { replace: true });
    }
  }, [errorMessage, hasData, navigate, promptId, query.errorUpdatedAt, showToast]);

  return query;
}
