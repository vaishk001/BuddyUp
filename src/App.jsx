import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './contexts/AuthContext'
import LandingPage from './pages/LandingPage'
import AuthPage from './components/Auth/AuthPage'
import ChatPage from './pages/ChatPage'
import SettingsPage from './pages/SettingsPage'
import IncomingCallModal from './components/Calls/IncomingCallModal'
import ActiveCallWindow from './components/Calls/ActiveCallWindow'
import { motion, AnimatePresence } from 'framer-motion'
import './styles/index.css'

function App() {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <div className="relative">
            <div className="w-20 h-20 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin mb-4"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full"></div>
            </div>
          </div>
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-gray-400 mt-4 font-medium"
          >
            Loading ChatWave...
          </motion.p>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="App">
      {/* Call UI Components */}
      <IncomingCallModal />
      <ActiveCallWindow />
      
      <AnimatePresence mode="wait">
        <Routes>
          {/* Public routes */}
          <Route 
            path="/" 
            element={
              !user ? (
                <motion.div
                  key="landing"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <LandingPage />
                </motion.div>
              ) : (
                <Navigate to="/chat" replace />
              )
            } 
          />
          <Route 
            path="/auth" 
            element={
              !user ? (
                <motion.div
                  key="auth"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                >
                  <AuthPage />
                </motion.div>
              ) : (
                <Navigate to="/chat" replace />
              )
            } 
          />
          
          {/* Protected routes */}
          <Route 
            path="/chat" 
            element={
              user ? (
                <motion.div
                  key="chat"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <ChatPage />
                </motion.div>
              ) : (
                <Navigate to="/auth" replace />
              )
            } 
          />
          <Route 
            path="/chat/:chatId" 
            element={
              user ? (
                <motion.div
                  key="chat-with-id"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <ChatPage />
                </motion.div>
              ) : (
                <Navigate to="/auth" replace />
              )
            } 
          />
          <Route
            path="/settings"
            element={
              user ? (
                <motion.div
                  key="settings"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                >
                  <SettingsPage />
                </motion.div>
              ) : (
                <Navigate to="/auth" replace />
              )
            }
          />
          
          {/* Fallback route */}
          <Route 
            path="*" 
            element={
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                <Navigate to="/" replace />
              </motion.div>
            } 
          />
        </Routes>
      </AnimatePresence>
    </div>
  )
}

export default App