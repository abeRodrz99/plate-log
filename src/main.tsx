import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './styles/tokens.css'
import './styles/app.css'
import './styles/layout.css'

createRoot(document.getElementById('mount') as HTMLElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
