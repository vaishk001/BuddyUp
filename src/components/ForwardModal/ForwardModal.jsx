import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Search, Send, Users, MessageCircle, Clock, Check } from 'lucide-react'
import { listenChats, listenUsers, sendMessage, getOrCreateDirectChat } from '../../services/firestore'
import { useAuth } from '../../contexts/AuthContext'
import { useUI } from '../../contexts/UIContext'

export default function ForwardModal({ open, onClose, message }) {
  const { user } = useAuth()
  const { showToast } = useUI()
  const [chats, setChats] = useState([])
  const [users, setUsers] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedTargets, setSelectedTargets] = useState(new Set())
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState('chats')
  const [recentChats, setRecentChats] = useState([])

  useEffect(() => {
    if (!open || !user?.uid) return
    
    const unsubChats = listenChats(user.uid, (chatList) => {
      setChats(chatList || [])
      // Get recent chats (last 7 days)
      const recent = (chatList || [])
        .filter(chat => chat.lastMessageTime)
        .sort((a, b) => {
          const timeA = a.lastMessageTime?.toDate?.() || new Date(a.lastMessageTime)
          const timeB = b.lastMessageTime?.toDate?.() || new Date(b.lastMessageTime)
          return timeB - timeA
        })
        .slice(0, 10)
      setRecentChats(recent)
    })
    
    const unsubUsers = listenUsers((userList) => {
      setUsers(userList || [])
    })
    
    return () => {
      unsubChats?.()
      unsubUsers?.()
    }
  }, [open, user])

  const filteredChats = chats.filter(chat => {
    if (!searchTerm) return true
    const term = searchTerm.toLowerCase()
    const name = chat.name || chat.participants?.join(',') || ''
    return name.toLowerCase().includes(term)
  })

  const filteredUsers = users.filter(u => {
    if (u.id === user?.uid) return false
    if (!searchTerm) return true
    const term = searchTerm.toLowerCase()
    const name = (u.displayName || u.email || u.id).toLowerCase()
    return name.includes(term)
  })

  const toggleSelection = (target) => {
    const key = `${target.type}-${target.id}`
    const newSelected = new Set(selectedTargets)
    
    if (newSelected.has(key)) {
      newSelected.delete(key)
    } else {
      newSelected.add(key)
    }
    
    setSelectedTargets(newSelected)
  }

  const isSelected = (target) => {
    const key = `${target.type}-${target.id}`
    return selectedTargets.has(key)
  }

  async function handleForward() {
    if (selectedTargets.size === 0) return
    
    setLoading(true)
    try {
      const targets = Array.from(selectedTargets).map(key => {
        const [type, id] = key.split('-')
        return { type, id }
      })

      let successCount = 0
      
      for (const target of targets) {
        try {
          let targetChatId = null
          
          if (target.type === 'chat') {
            targetChatId = target.id
          } else if (target.type === 'user') {
            targetChatId = await getOrCreateDirectChat(user.uid, target.id)
          }

          if (!targetChatId) continue

          const payload = {
            from: user.uid,
            status: 'sent',
            forwarded: true,
            forwardedFrom: message.id,
            forwardedAt: new Date()
          }

          if (message.type && (message.url || message.mediaUrl)) {
            payload.type = message.type
            payload.url = message.url || message.mediaUrl
            payload.text = message.text || ''
          } else if (message.text) {
            payload.text = message.text
            payload.type = 'text'
          }

          await sendMessage(targetChatId, payload)
          successCount++
        } catch (error) {
          console.error(`Failed to forward to ${target.id}:`, error)
        }
      }

      if (successCount > 0) {
        showToast(`Message forwarded to ${successCount} conversation${successCount > 1 ? 's' : ''}`, 'success')
        onClose()
        setSelectedTargets(new Set())
      } else {
        showToast('Failed to forward message', 'error')
      }
    } catch (e) {
      console.error('Forward failed:', e)
      showToast('Failed to forward message', 'error')
    } finally {
      setLoading(false)
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm light:bg-black/30"
        onClick={onClose}
      />
      
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        className="relative w-full max-w-md bg-gradient-to-br from-slate-900 to-slate-800 rounded-3xl border border-white/10 shadow-2xl overflow-hidden light:from-white light:to-gray-50 light:border-black/10"
        onClick={e => e.stopPropagation()}
      >
        {/* Enhanced Header */}
        <div className="p-6 border-b border-white/10 bg-gradient-to-r from-slate-800/50 to-slate-900/50 light:border-black/10 light:bg-gray-100/50">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white shadow-lg light:from-blue-500 light:to-cyan-500">
                <Send className="w-6 h-6" />
              </div>
              <div>
                <div className="font-bold text-white text-lg light:text-black">Forward Message</div>
                <div className="text-sm text-gray-400 light:text-gray-500">Select conversations to forward to</div>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-3 hover:bg-white/10 rounded-2xl transition-all duration-300 group hover:scale-105 light:hover:bg-black/5"
            >
              <X className="w-5 h-5 text-gray-400 group-hover:text-white transition-colors light:text-gray-600 light:group-hover:text-black" />
            </button>
          </div>

          {/* Selected Count */}
          {selectedTargets.size > 0 && (
            <div className="flex items-center gap-2 text-sm text-purple-400 light:text-blue-600">
              <Check className="w-4 h-4" />
              {selectedTargets.size} conversation{selectedTargets.size > 1 ? 's' : ''} selected
            </div>
          )}
        </div>

        {/* Enhanced Tabs */}
        <div className="flex border-b border-white/10 light:border-black/10">
          <button
            onClick={() => setActiveTab('chats')}
            className={`flex-1 p-4 text-sm font-medium transition-all duration-300 flex items-center justify-center gap-2 ${
              activeTab === 'chats' 
                ? 'text-purple-400 border-b-2 border-purple-400 bg-purple-500/10 light:text-blue-600 light:border-blue-600 light:bg-blue-500/10' 
                : 'text-gray-400 hover:text-gray-200 hover:bg-white/5 light:text-gray-500 light:hover:text-black light:hover:bg-black/5'
            }`}
          >
            <MessageCircle className="w-4 h-4" />
            Chats
          </button>
          <button
            onClick={() => setActiveTab('users')}
            className={`flex-1 p-4 text-sm font-medium transition-all duration-300 flex items-center justify-center gap-2 ${
              activeTab === 'users' 
                ? 'text-purple-400 border-b-2 border-purple-400 bg-purple-500/10 light:text-blue-600 light:border-blue-600 light:bg-blue-500/10' 
                : 'text-gray-400 hover:text-gray-200 hover:bg-white/5 light:text-gray-500 light:hover:text-black light:hover:bg-black/5'
            }`}
          >
            <Users className="w-4 h-4" />
            People
          </button>
        </div>

        {/* Search and Content */}
        <div className="p-4 space-y-4">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 light:text-gray-500" />
            <input
              type="text"
              placeholder="Search..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-transparent transition-all duration-300 light:bg-black/5 light:border-black/10 light:text-black light:placeholder-gray-500 light:focus:ring-blue-500/50"
            />
          </div>

          <div className="h-80 overflow-y-auto scrollbar-thin scrollbar-thumb-white/10 pr-2 -mr-2 light:scrollbar-thumb-black/10">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
              >
                {activeTab === 'chats' && (
                  <div className="space-y-2">
                    {/* Recents */}
                    {recentChats.length > 0 && !searchTerm && (
                      <div className="mb-4">
                        <div className="flex items-center gap-2 text-sm text-gray-400 mb-2 px-2 light:text-gray-500">
                          <Clock className="w-4 h-4" />
                          <span>Recent Chats</span>
                        </div>
                        {recentChats.map(chat => (
                          <TargetItem 
                            key={chat.id}
                            target={{ ...chat, type: 'chat' }}
                            isSelected={isSelected({ ...chat, type: 'chat' })}
                            onToggle={toggleSelection}
                          />
                        ))}
                      </div>
                    )}
                    
                    {/* All Chats */}
                    <div className="flex items-center gap-2 text-sm text-gray-400 mb-2 px-2 light:text-gray-500">
                      <MessageCircle className="w-4 h-4" />
                      <span>All Chats</span>
                    </div>
                    {filteredChats.map(chat => (
                      <TargetItem 
                        key={chat.id}
                        target={{ ...chat, type: 'chat' }}
                        isSelected={isSelected({ ...chat, type: 'chat' })}
                        onToggle={toggleSelection}
                      />
                    ))}
                    {filteredChats.length === 0 && <EmptyState type="chats" />}
                  </div>
                )}

                {activeTab === 'users' && (
                  <div className="space-y-2">
                    {filteredUsers.map(u => (
                      <TargetItem 
                        key={u.id}
                        target={{ ...u, type: 'user', name: u.displayName, photoURL: u.photoURL }}
                        isSelected={isSelected({ ...u, type: 'user' })}
                        onToggle={toggleSelection}
                      />
                    ))}
                    {filteredUsers.length === 0 && <EmptyState type="users" />}
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        {/* Footer and Action Button */}
        <div className="p-6 border-t border-white/10 bg-gradient-to-r from-slate-800/50 to-slate-900/50 light:border-black/10 light:bg-gray-100/50">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleForward}
            disabled={loading || selectedTargets.size === 0}
            className="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-3 transition-all duration-300 shadow-lg hover:shadow-purple-500/25 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none light:from-blue-500 light:to-cyan-500 light:hover:shadow-blue-500/25"
          >
            {loading ? (
              <>
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                  className="w-5 h-5 border-2 border-white/50 border-t-white rounded-full" 
                />
                <span>Forwarding...</span>
              </>
            ) : (
              <>
                <Send className="w-5 h-5" />
                <span>Forward to {selectedTargets.size} conversation{selectedTargets.size !== 1 && 's'}</span>
              </>
            )}
          </motion.button>
        </div>
      </motion.div>
    </div>
  )
}

function TargetItem({ target, isSelected, onToggle }) {
  const avatar = target.photoURL || `https://ui-avatars.com/api/?name=${target.name}&background=random`
  
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 10 }}
      onClick={() => onToggle(target)}
      className={`flex items-center gap-4 p-3 rounded-2xl cursor-pointer transition-all duration-200 ${
        isSelected 
          ? 'bg-purple-500/20 border border-purple-500/30 light:bg-blue-500/20 light:border-blue-500/30' 
          : 'hover:bg-white/5 light:hover:bg-black/5'
      }`}
    >
      <img src={avatar} alt={target.name} className="w-10 h-10 rounded-full object-cover" />
      <div className="flex-1 overflow-hidden">
        <div className="font-semibold text-white truncate light:text-black">{target.name}</div>
        <div className="text-sm text-gray-400 truncate light:text-gray-500">
          {target.type === 'chat' ? (target.last || 'No messages yet') : (target.email || 'No email')}
        </div>
      </div>
      <div className={`w-6 h-6 rounded-full flex items-center justify-center border-2 transition-all duration-300 ${
        isSelected 
          ? 'bg-purple-500 border-purple-400 light:bg-blue-500 light:border-blue-400' 
          : 'bg-white/10 border-white/20 light:bg-black/10 light:border-black/20'
      }`}>
        {isSelected && <Check className="w-4 h-4 text-white" />}
      </div>
    </motion.div>
  )
}

function EmptyState({ type }) {
  return (
    <div className="flex flex-col items-center justify-center h-48 text-gray-500">
      {type === 'chats' ? <MessageCircle className="w-12 h-12 mb-3 opacity-50" /> : <Users className="w-12 h-12 mb-3 opacity-50" />}
      <p className="font-medium">No {type} found</p>
      <p className="text-sm text-center">Try a different search term or switch tabs.</p>
    </div>
  )
}