import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <div>{JSON.stringify(globalThis.electron.process.versions)}</div>
  </StrictMode>,
);
