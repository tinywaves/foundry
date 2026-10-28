import { randomUUID } from 'node:crypto';
import { FOUNDRY_EVENT_VERSION } from './contracts';
import type { FoundryEvent } from './contracts';

export type FoundryEventListener = (event: FoundryEvent) => void;

export class FoundryEventHub {
  private readonly listeners = new Set<FoundryEventListener>();

  publish<TData>(type: string, data: TData): FoundryEvent<TData> {
    const event: FoundryEvent<TData> = {
      version: FOUNDRY_EVENT_VERSION,
      id: randomUUID(),
      type,
      occurredAt: new Date().toISOString(),
      data,
    };

    for (const listener of this.listeners) {
      listener(event);
    }

    return event;
  }

  subscribe(listener: FoundryEventListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }
}
