# Use TanStack Query for server state

The Local Web UI uses TanStack Query to manage HTTP request state, caching, invalidation, mutations, and request lifecycles. Foundry does not introduce a general client-state store until concrete cross-page client state requires one; local UI state such as Sidebar expansion remains owned by the relevant component. Individual queries define their own retry and freshness policies rather than inheriting speculative global defaults.
