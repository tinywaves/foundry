import React from 'react';
import ReactDOM from 'react-dom/client';
import { HashRouter, Routes, Route } from 'react-router';
import { MantineProvider } from '@mantine/core';
import Layout from './layout';
import JsonView from './components/json-view';
import '@mantine/core/styles.css';
import './index.css';

const rootEl = document.getElementById('root');
if (rootEl) {
  const root = ReactDOM.createRoot(rootEl);
  root.render(
    <React.StrictMode>
      <MantineProvider>
        <HashRouter>
          <Routes>
            <Route path="/" element={<Layout />}>
              <Route path="json-view" element={<JsonView />} />
            </Route>
          </Routes>
        </HashRouter>
      </MantineProvider>
    </React.StrictMode>,
  );
}
