// Точка входу клієнта React (практичне завдання № 6).
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router';
import { AuthProvider } from './auth.tsx';
import { App } from './App.tsx';
import '../../styles.css';
import './client.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
);
