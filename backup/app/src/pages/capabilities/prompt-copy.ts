import { toast } from '#/components/ui/toast';

export async function copyPromptContent(content: string): Promise<void> {
  try {
    // This module runs in the browser; the Node lint target does not model that environment.
    // eslint-disable-next-line n/no-unsupported-features/node-builtins
    await navigator.clipboard.writeText(content);
    toast.add({ title: 'Prompt copied', type: 'success' });
  } catch {
    toast.add({ title: 'Prompt could not be copied', type: 'error' });
  }
}
