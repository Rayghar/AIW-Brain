import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './styles.css';
import './design-system/product-experience.css';
import './styles/brain-alive.css';
import './styles/rc10_48_12_canvas_map_toolbar.css';
import './styles/rc10_48_13_canvas_studio_controls.css';
import './styles/rc10_56_composition_studio.css';
import './design-system/guided-delivery.css';
import { I18nProvider } from './lib/i18n';
import { installRoleAwareFetch } from './lib/roleAccess';

installRoleAwareFetch();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <I18nProvider><App /></I18nProvider>
  </StrictMode>,
);

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    void navigator.serviceWorker.register('/sw.js').catch((error) => {
      console.warn('AIW offline shell could not be registered.', error);
    });
  });
}
