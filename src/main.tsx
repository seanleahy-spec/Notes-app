import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './app/App'
import { requestPersistentStorage } from './db/persistence'
import './index.css'
import './theme/minimal.css'

void requestPersistentStorage()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
