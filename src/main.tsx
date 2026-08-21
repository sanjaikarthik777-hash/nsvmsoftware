import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import './index.css'
import App from './App.tsx'

// Register Progressive Web App Service Worker
registerSW({
  immediate: true,
  onOfflineReady() {
    console.log('NSVM Billing is ready for offline usage.');
  }
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
