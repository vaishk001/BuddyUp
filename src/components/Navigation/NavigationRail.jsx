import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  MessageCircle, 
  Phone, 
  Users, 
  Settings, 
  ChevronRight,
  ChevronLeft,
  Sparkles,
  UserPlus
} from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { useEnhancedTheme } from '../../hooks/useEnhancedTheme'

export default function NavigationRail({ activeTab, onTabChange }) {
  const { user, userDoc, logout } = useAuth()
  const { theme } = useEnhancedTheme()
  const [isExpanded, setIsExpanded] = useState(false)

  const tabs = [
    { id: 'chats', icon: MessageCircle, label: 'Chats', color: 'from-blue-500 to-cyan-500' },
    { id: 'friend-requests', icon: UserPlus, label: 'Friend Requests', color: 'from-pink-500 to-rose-500' },
    { id: 'calls', icon: Phone, label: 'Calls', color: 'from-green-500 to-emerald-500' },
    { id: 'contacts', icon: Users, label: 'Contacts', color: 'from-purple-500 to-pink-500' },
  ]

  return (
    <>
      {/* Floating Toggle Button */}
      <motion.button
        onClick={() => setIsExpanded(!isExpanded)}
        className="fixed left-4 bottom-4 z-[60] w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center shadow-2xl shadow-indigo-500/30 hover:shadow-indigo-500/50 transition-shadow duration-300 group"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        <motion.div
          animate={{ rotate: isExpanded ? 180 : 0 }}
          transition={{ duration: 0.3 }}
        >
          {isExpanded ? (
            <ChevronLeft className="w-5 h-5 text-white" />
          ) : (
            <ChevronRight className="w-5 h-5 text-white" />
          )}
        </motion.div>
        
        {/* Sparkle effect */}
        <motion.div
          className="absolute inset-0 rounded-2xl bg-gradient-to-br from-white/20 to-transparent"
          animate={{
            opacity: [0, 0.5, 0],
            scale: [0.8, 1.2, 0.8],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
      </motion.button>

      {/* Backdrop */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsExpanded(false)}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[55]"
          />
        )}
      </AnimatePresence>

      {/* Sliding Navigation Panel */}
      <motion.div
        initial={{ x: -320 }}
        animate={{ x: isExpanded ? 0 : -320 }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className={`fixed left-0 top-0 h-full w-80 z-[58] shadow-2xl border-r ${
          theme === 'dark' 
            ? 'bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800 border-white/10' 
            : 'bg-white border-gray-200'
        }`}
      >
        {/* Header with User Profile */}
        <div className={`p-6 border-b ${
          theme === 'dark' ? 'border-white/10' : 'border-gray-200'
        }`}>
          <div className="flex items-center gap-4">
            <motion.div 
              className="relative"
              whileHover={{ scale: 1.05 }}
            >
              <div className="w-16 h-16 rounded-3xl bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-purple-500/30">
                {(userDoc?.displayName || user?.displayName || 'U')?.[0]?.toUpperCase()}
              </div>
              <motion.div
                className="absolute -top-1 -right-1 w-5 h-5 bg-green-500 rounded-full border-2 border-slate-900"
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
              />
            </motion.div>
            
            <div className="flex-1">
              <h2 className={`font-semibold text-lg ${
                theme === 'dark' ? 'text-white' : 'text-gray-900'
              }`}>
                {userDoc?.displayName || user?.displayName || 'User'}
              </h2>
              <p className={`text-sm flex items-center gap-1 ${
                theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
              }`}>
                <Sparkles className="w-3 h-3" />
                Online
              </p>
            </div>
          </div>
        </div>

        {/* Navigation Items */}
        <div className="p-4 space-y-2">
          {tabs.map((tab, index) => {
            const isActive = activeTab === tab.id
            return (
              <motion.button
                key={tab.id}
                onClick={() => {
                  onTabChange(tab.id)
                  setIsExpanded(false)
                }}
                className={`w-full rounded-2xl p-4 flex items-center gap-4 transition-all duration-300 group relative overflow-hidden ${
                  isActive 
                    ? theme === 'dark' ? 'bg-white/10 shadow-lg' : 'bg-gray-100 shadow-lg'
                    : theme === 'dark' ? 'hover:bg-white/5' : 'hover:bg-gray-50'
                }`}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                whileHover={{ x: 4 }}
              >
                {/* Background gradient on hover/active */}
                {isActive && (
                  <motion.div
                    layoutId="activeBackground"
                    className={`absolute inset-0 bg-gradient-to-r ${tab.color} opacity-20`}
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                  />
                )}
                
                {/* Icon container */}
                <div className={`relative w-11 h-11 rounded-xl flex items-center justify-center ${
                  isActive 
                    ? `bg-gradient-to-br ${tab.color}` 
                    : theme === 'dark' ? 'bg-white/5 group-hover:bg-white/10' : 'bg-gray-100 group-hover:bg-gray-200'
                } transition-all duration-300`}>
                  <tab.icon className={`w-5 h-5 ${
                    isActive ? 'text-white' : theme === 'dark' ? 'text-gray-400 group-hover:text-gray-300' : 'text-gray-600 group-hover:text-gray-900'
                  }`} />
                </div>
                
                {/* Label */}
                <span className={`text-base font-medium ${
                  isActive ? 'text-white' : theme === 'dark' ? 'text-gray-400 group-hover:text-gray-300' : 'text-gray-600 group-hover:text-gray-900'
                }`}>
                  {tab.label}
                </span>

                {/* Active indicator */}
                {isActive && (
                  <motion.div
                    className={`ml-auto w-2 h-2 rounded-full bg-gradient-to-r ${tab.color}`}
                    layoutId="activeIndicator"
                    animate={{ scale: [1, 1.3, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  />
                )}
              </motion.button>
            )
          })}
        </div>

        {/* Bottom Actions */}
        <div className={`absolute bottom-0 left-0 right-0 p-4 pb-20 border-t backdrop-blur-xl space-y-2 ${
          theme === 'dark' ? 'border-white/10 bg-slate-900/80' : 'border-gray-200 bg-white/80'
        }`}>
          <motion.button
            onClick={() => {
              onTabChange('settings')
              setIsExpanded(false)
            }}
            className={`w-full rounded-2xl p-4 flex items-center gap-4 transition-all duration-300 group ${
              activeTab === 'settings' 
                ? theme === 'dark' ? 'bg-white/10' : 'bg-gray-100'
                : theme === 'dark' ? 'hover:bg-white/5' : 'hover:bg-gray-50'
            }`}
            whileHover={{ x: 4 }}
          >
            <div className={`w-11 h-11 rounded-xl flex items-center justify-center transition-all duration-300 ${
              activeTab === 'settings'
                ? 'bg-gradient-to-br from-orange-500 to-red-500'
                : theme === 'dark' ? 'bg-white/5 group-hover:bg-white/10' : 'bg-gray-100 group-hover:bg-gray-200'
            }`}>
              <Settings className={`w-5 h-5 ${
                activeTab === 'settings' ? 'text-white' : theme === 'dark' ? 'text-gray-400 group-hover:text-gray-300' : 'text-gray-600 group-hover:text-gray-900'
              }`} />
            </div>
            <span className={`font-medium ${
              activeTab === 'settings' ? 'text-white' : theme === 'dark' ? 'text-gray-400 group-hover:text-gray-300' : 'text-gray-600 group-hover:text-gray-900'
            }`}>
              Settings
            </span>
          </motion.button>
        </div>
      </motion.div>
    </>
  )
}
