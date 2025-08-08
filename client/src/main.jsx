import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';

// Polyfill for older browsers just incase idk
import 'core-js/stable';
import 'regenerator-runtime/runtime';

// Tutorial anchor provider
import { AnchorProvider } from './components/TutorialAnchor';

// Ensure smooth-glide is ON by default for all users
try {
  const v = localStorage.getItem('glideCursor');
  if (v === null) localStorage.setItem('glideCursor', 'true');
  const enabled = localStorage.getItem('glideCursor') === 'true';
  document.documentElement.style.setProperty('--glide-cursor-enabled', enabled ? '1' : '0');
  document.documentElement.setAttribute('data-glide', enabled ? '1' : '0');
  // Apply persisted cursor type (default to block)
  const cursorType = localStorage.getItem('cursorType');
  const type = cursorType === 'caret' || cursorType === 'block' ? cursorType : 'block';
  document.documentElement.setAttribute('data-cursor', type);
  // Control line-cursor visibility early (block hides line, caret shows line)
  document.documentElement.style.setProperty('--line-cursor', type === 'caret' ? 'visible' : 'hidden');
} catch (_) {
  // ignore storage errors (private mode, etc.)
}

// Create root
const container = document.getElementById('root');
const root = createRoot(container);

// Render app
root.render(
  <React.StrictMode>
    <AnchorProvider>
      <App />
    </AnchorProvider>
  </React.StrictMode>
);
