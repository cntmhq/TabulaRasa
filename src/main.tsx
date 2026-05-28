import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import {loadLocale, pickInitialLang} from './locales';
import './index.css';

(async () => {
  await loadLocale(pickInitialLang());
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
})();
