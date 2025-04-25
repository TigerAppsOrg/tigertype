import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';

// Polyfill for older browsers just incase idk
import 'core-js/stable';
import 'regenerator-runtime/runtime';

// Tutorial anchor provider
import { AnchorProvider } from './components/TutorialAnchor';

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