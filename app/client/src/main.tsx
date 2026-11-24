// ПЗ 6. Точка входу клієнта React. Зразок – demo/client/src/main.tsx.
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router';
import { App } from './App.tsx';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      {/* TODO: AuthProvider (Context + useReducer) навколо App – зразок demo/client/src/auth.tsx */}
      <App />
    </BrowserRouter>
  </StrictMode>,
);
