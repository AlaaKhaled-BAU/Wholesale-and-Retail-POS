import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/base.css'
import App from './App.tsx'
import ErrorBoundary from './components/common/ErrorBoundary.tsx'
import OfflineBanner from './components/common/OfflineBanner.tsx'

// Initialize dark mode from persisted settings before React mounts
const stored = localStorage.getItem('settings-storage');
if (stored) {
  try {
    const parsed = JSON.parse(stored);
    if (parsed.state?.darkMode) {
      document.documentElement.classList.add('dark');
    }
  } catch { /* ignore */ }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <OfflineBanner />
      <App />
    </ErrorBoundary>
  </StrictMode>,
)
