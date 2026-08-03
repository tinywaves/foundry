import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Theme } from '@astryxdesign/core';
import { neutralTheme } from '@astryxdesign/theme-neutral';
import { HashRouter } from 'react-router';
import './main.css';
import App from './app';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Theme theme={neutralTheme}>
      <HashRouter>
        <App />
      </HashRouter>
    </Theme>
  </StrictMode>,
);
