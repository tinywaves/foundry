import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Button, Theme } from '@astryxdesign/core';
import { themes, defaultThemeSlug } from './astryx-themes';
import './main.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Theme theme={themes[defaultThemeSlug]}>
      <Button label="click" />
    </Theme>
  </StrictMode>,
);
