import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';

// Ensure light mode is always active and prevent dark mode
document.documentElement.classList.remove('dark');
document.documentElement.style.colorScheme = 'light';

const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement);

root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);