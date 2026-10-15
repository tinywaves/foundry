# Use hash routing for the Local Web UI

The Local Web UI uses React Router with hash-based URLs. Keeping client routes in the URL fragment allows the Foundry Server to continue serving the application only from its root path while returning 404 for unknown server paths, avoiding a broad SPA fallback and its special server handling. Fragment-bearing URLs are acceptable because the interface is loopback-only and does not depend on search indexing or public link previews.
