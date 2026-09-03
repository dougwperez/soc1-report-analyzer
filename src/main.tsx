import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import './index.css'
import App from './App'
import { StoreProvider } from './store/store'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {/* Hash routing keeps deep links working on GitHub Pages static hosting. */}
    <HashRouter>
      <StoreProvider>
        <App />
      </StoreProvider>
    </HashRouter>
  </StrictMode>,
)
