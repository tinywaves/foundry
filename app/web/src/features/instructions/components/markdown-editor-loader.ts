export const loadMarkdownEditor = () => import('./markdown-editor');

export function preloadMarkdownEditor(): void {
  void loadMarkdownEditor();
}
