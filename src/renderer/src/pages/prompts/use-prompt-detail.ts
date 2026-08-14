import { useToast } from '@astryxdesign/core/Toast';
import { useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';
import { useNavigate } from 'react-router';
import { routePaths } from '@renderer/routes';
import { getPromptDetailQueryOptions } from './prompt-query';

export function usePromptDetail(promptId: string) {
  const navigate = useNavigate();
  const showToast = useToast();
  const query = useQuery(getPromptDetailQueryOptions(promptId));
  const errorMessage = query.error?.message;
  const hasData = query.data !== undefined;

  useEffect(() => {
    if (!errorMessage) {
      return;
    }
    showToast({
      body: errorMessage,
      type: 'error',
      uniqueID: `prompt-detail-load-${promptId}`,
    });
    if (!hasData) {
      void navigate(routePaths.agentExtensionsPrompts, { replace: true });
    }
  }, [errorMessage, hasData, navigate, promptId, query.errorUpdatedAt, showToast]);

  return query;
}
