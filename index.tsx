import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { applyCachedTheme } from './themes';
import { setupApiInterceptor } from './apiInterceptor';

// Initialize API URL interceptor for environment-driven backend endpoints
setupApiInterceptor();

// Restore the last saved theme before first paint to avoid a color flash
applyCachedTheme();

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
