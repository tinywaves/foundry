import type {
  SkillApiResult,
  SkillWatchSessionId,
  SkillWatchSessionStart,
} from '../../../../shared/skill-contract';

interface SkillWatchSessionLifecycleOptions {
  begin: () => Promise<SkillApiResult<SkillWatchSessionStart>>;
  end: (sessionId: SkillWatchSessionId) => Promise<SkillApiResult<boolean>>;
  onStarted: (start: SkillWatchSessionStart) => void;
  onError: (message: string) => void;
}

export function startSkillWatchSession(
  options: SkillWatchSessionLifecycleOptions,
): () => void {
  let isActive = true;
  let sessionId: SkillWatchSessionId | undefined;
  let hasEnded = false;

  const endSession = (id: SkillWatchSessionId) => {
    if (hasEnded) {
      return;
    }
    hasEnded = true;
    void options.end(id);
  };

  void options.begin().then((result) => {
    if (!result.ok) {
      if (isActive) {
        options.onError(result.error.message);
      }
      return;
    }
    sessionId = result.value.sessionId;
    if (!isActive) {
      endSession(sessionId);
      return;
    }
    options.onStarted(result.value);
  }).catch(() => {
    if (isActive) {
      options.onError('Skill observation could not be started.');
    }
  });

  return () => {
    isActive = false;
    if (sessionId) {
      endSession(sessionId);
    }
  };
}
