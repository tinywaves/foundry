import type { Context, Next } from 'hono';
import { matchedRoutes } from 'hono/route';

const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);
const DATA_TRANSFER_PATH_PREFIX = '/api/data-transfer/';

export class WorkspaceMutationGate {
  private transferActive = false;

  get isTransferActive(): boolean {
    return this.transferActive;
  }

  tryBeginTransfer(): boolean {
    if (this.transferActive) {
      return false;
    }

    this.transferActive = true;
    return true;
  }

  endTransfer(): void {
    this.transferActive = false;
  }
}

export function createWorkspaceMutationMiddleware(gate: WorkspaceMutationGate) {
  return async (c: Context, next: Next) => {
    if (
      gate.isTransferActive
      && MUTATING_METHODS.has(c.req.method)
      && !c.req.path.startsWith(DATA_TRANSFER_PATH_PREFIX)
      && hasMatchedApiRoute(c)
    ) {
      return c.json(
        {
          error: {
            code: 'DATA_TRANSFER_BUSY',
            message: 'Another data transfer is in progress',
          },
        },
        409,
      );
    }

    await next();
  };
}

function hasMatchedApiRoute(c: Context): boolean {
  // Keep unknown API requests on the normal JSON 404 path while they are blocked.
  return matchedRoutes(c).some((route) =>
    route.path.startsWith('/api/') && route.path !== '/api/*',
  );
}
