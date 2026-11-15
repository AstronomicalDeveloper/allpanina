import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { FireMapTest } from './FireMapTest';
document.body.style.margin = '0';
document.body.style.padding = '0';
document.body.style.overflow = 'hidden';
const rootElement = document.getElementById('root');
if (rootElement) {
  createRoot(rootElement).render(
    <StrictMode>
      <FireMapTest />
    </StrictMode>
  );
}