import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import ContextManager from './ContextManager.tsx'
import './index.css'

const viewType = (window as any).viewType;

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    {viewType === 'codesphere.ai.context' ? <ContextManager /> : <App />}
  </React.StrictMode>,
)
