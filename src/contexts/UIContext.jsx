import React, { createContext, useContext, useState, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle, XCircle, AlertCircle, Info, X } from 'lucide-react'

const UIContext = createContext()

export function useUI() {
  return useContext(UIContext)
}

export function UIProvider({ children }) {
  const [toasts, setToasts] = useState([])
  const [confirmState, setConfirmState] = useState({ 
    open: false, 
    message: '', 
    resolve: null, 
    title: '',
    type: 'confirm'
  })

  const showToast = useCallback((message, type = 'info', timeout = 4000) => {
    const id = Date.now() + Math.random()
    const newToast = { 
      id, 
      message, 
      type,
      timestamp: Date.now()
    }
    setToasts(t => [newToast, ...t].slice(0, 5)) // Limit to 5 toasts
    if (timeout > 0) {
      setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), timeout)
    }
  }, [])

  const confirm = useCallback((message, title = 'Confirm', type = 'confirm') => {
    return new Promise(resolve => {
      setConfirmState({ open: true, message, resolve, title, type })
    })
  }, [])

  const handleConfirm = (val) => {
    if (confirmState.resolve) confirmState.resolve(val)
    setConfirmState({ open: false, message: '', resolve: null, title: '', type: 'confirm' })
  }

  const removeToast = (id) => {
    setToasts(t => t.filter(x => x.id !== id))
  }

  // Enhanced Toast Container with Modern Design
  const Toasts = () => (
    <div className="fixed top-4 right-4 flex flex-col gap-3 z-50 max-w-sm">
      <AnimatePresence>
        {toasts.map((toast, index) => (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, x: 300, scale: 0.8 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 300, scale: 0.8 }}
            transition={{ duration: 0.3, delay: index * 0.1 }}
            className={`glass-card rounded-2xl p-4 border-l-4 shadow-lg backdrop-blur-lg ${
              toast.type === 'error' 
                ? 'border-red-500 bg-red-500/10' 
                : toast.type === 'success' 
                ? 'border-green-500 bg-green-500/10'
                : toast.type === 'warning'
                ? 'border-yellow-500 bg-yellow-500/10'
                : 'border-blue-500 bg-blue-500/10'
            }`}
          >
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 mt-0.5">
                {toast.type === 'success' && <CheckCircle className="w-5 h-5 text-green-500" />}
                {toast.type === 'error' && <XCircle className="w-5 h-5 text-red-500" />}
                {toast.type === 'warning' && <AlertCircle className="w-5 h-5 text-yellow-500" />}
                {toast.type === 'info' && <Info className="w-5 h-5 text-blue-500" />}
              </div>
              <div className="flex-1">
                <p className={`text-sm font-medium ${
                  toast.type === 'error' ? 'text-red-300' :
                  toast.type === 'success' ? 'text-green-300' :
                  toast.type === 'warning' ? 'text-yellow-300' : 'text-blue-300'
                }`}>
                  {toast.message}
                </p>
              </div>
              <button 
                onClick={() => removeToast(toast.id)}
                className="flex-shrink-0 p-1 hover:bg-white/10 rounded-lg transition-colors"
              >
                <X className="w-4 h-4 text-gray-400" />
              </button>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )

  // Enhanced Confirm Dialog with Modern Design
  const ConfirmDialog = () => {
    if (!confirmState.open) return null
    
    const isDestructive = confirmState.type === 'destructive'
    
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ zIndex: 9999 }}>
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          onClick={() => handleConfirm(false)}
        />
        <motion.div
          initial={{ opacity: 0, scale: 0.8, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.8, y: 20 }}
          className="relative w-full max-w-md mx-4"
        >
          <div className="glass-card rounded-3xl border border-white/20 shadow-2xl overflow-hidden">
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                  isDestructive 
                    ? 'bg-red-500/20 text-red-400' 
                    : 'bg-blue-500/20 text-blue-400'
                }`}>
                  <AlertCircle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">{confirmState.title}</h3>
                  <p className="text-sm text-gray-400">Please confirm your action</p>
                </div>
              </div>
              
              <p className="text-gray-300 mb-6 leading-relaxed">{confirmState.message}</p>
              
              <div className="flex justify-end gap-3">
                <button 
                  onClick={() => handleConfirm(false)}
                  className="px-5 py-2.5 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-gray-300 font-medium transition-all duration-200 hover:scale-105"
                >
                  Cancel
                </button>
                <button 
                  onClick={() => handleConfirm(true)}
                  className={`px-5 py-2.5 rounded-xl font-medium transition-all duration-200 hover:scale-105 ${
                    isDestructive
                      ? 'bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 text-white'
                      : 'bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white'
                  }`}
                >
                  Confirm
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    )
  }

  const value = { 
    showToast, 
    confirm,
    toasts,
    removeToast
  }

  return (
    <UIContext.Provider value={value}>
      {children}
      <Toasts />
      <ConfirmDialog />
    </UIContext.Provider>
  )
}

export default UIContext