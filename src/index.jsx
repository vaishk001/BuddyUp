import React from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import { AuthProvider } from './contexts/AuthContext'
import { UIProvider } from './contexts/UIContext'
import { CallProvider } from './contexts/CallContext'
import './styles/index.css'

// Force dark mode permanently - remove any stored light theme
localStorage.removeItem('theme')
localStorage.removeItem('chatwave-theme')
document.documentElement.classList.remove('light')
document.documentElement.classList.add('dark')
document.documentElement.className = 'dark'

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <UIProvider>
        <AuthProvider>
          <CallProvider>
            <App />
          </CallProvider>
        </AuthProvider>
      </UIProvider>
    </BrowserRouter>
  </React.StrictMode>
)
