// Detail caches are reconciled before per-call mutation success handlers run.
// Commit the route exit before mutation observers can resubscribe removed data.
export const promptLifecycleExitNavigateOptions = {
  flushSync: true,
  replace: true,
} as const;
