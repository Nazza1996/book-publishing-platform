import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import Toasts from './components/Toasts'

createRoot(document.body!).render(
  <>
    <Toasts />
    <App />
  </>
)
