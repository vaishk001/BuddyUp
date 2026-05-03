import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Search, UserPlus, MessageCircle, User } from 'lucide-react'
import { findUserByEmail, findUsersByName, getOrCreateDirectChat, sendFriendRequest, listenUsers } from '../../services/firestore'
import { useAuth } from '../../contexts/AuthContext'
import { useUI } from '../../contexts/UIContext'

export default function NewChatModal({ open, onClose, onCreated }) {
  const { user } = useAuth()
  const { showToast } = useUI()
  const [email, setEmail] = useState('')
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [allUsers, setAllUsers] = useState([])

  useEffect(() => {
    if (!open) return
    const unsub = listenUsers((list) => {
      setAllUsers(list || [])
    })
    return () => unsub?.()
  }, [open])

  async function handleSearch() {
    setLoading(true)
    setResult(null)
    try {
      const term = email.trim()
      if (!term) {
        setResult([])
        return
      }

      const lower = term.toLowerCase()
      const clientMatches = allUsers
        .filter(u => !!u)
        .filter(u => {
          const name = (u.displayName || '').toLowerCase()
          const emailField = (u.email || u.emailAddress || u.contactEmail || '').toLowerCase()
          const idField = (u.id || '').toLowerCase()
          return name.includes(lower) || emailField.includes(lower) || idField.includes(lower)
        })

      if (clientMatches.length > 0) {
        setResult(clientMatches)
        return
      }

      const byEmail = term ? await findUserByEmail(term) : null
      const byName = term ? await findUsersByName(term) : []
      const combined = []
      if (byEmail) combined.push(byEmail)
      for (const u of byName) {
        if (!combined.find(c => c.id === u.id)) combined.push(u)
      }
      setResult(combined)
    } catch (e) {
      console.error('search failed', e)
      setResult([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!email) {
      setResult(null)
      return
    }
    const t = setTimeout(() => {
      handleSearch()
    }, 200)
    return () => clearTimeout(t)
  }, [email])

  async function handleCreateChatWith(userId) {
    try {
      const chatId = await getOrCreateDirectChat(user?.uid || 'local', userId)
      if (onCreated) onCreated(chatId)
      onClose()
    } catch (e) {
      console.error('createChat failed', e)
      showToast('Failed to create chat', 'error')
    }
  }

  async function handleSendRequest(targetId) {
    try {
      await sendFriendRequest(targetId, { uid: user.uid, displayName: user.displayName, email: user.email })
      showToast('Friend request sent', 'success')
      onClose()
    } catch (e) {
      console.error('sendFriendRequest failed', e)
      showToast('Failed to send friend request', 'error')
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
        >
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm light:bg-gray-900/20"
            onClick={onClose}
          />
          
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            className="relative w-full max-w-md bg-gradient-to-br from-slate-900 to-slate-800 rounded-3xl border border-white/10 shadow-2xl overflow-hidden light:from-white light:to-gray-50 light:border-black/10"
          >
            {/* Enhanced Header */}
            <div className="relative p-6 bg-gradient-to-r from-slate-800/50 to-slate-900/50 border-b border-white/10 light:bg-gray-100/50 light:border-black/10">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white shadow-lg light:from-blue-500 light:to-cyan-500">
                    <UserPlus className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="font-bold text-white text-lg light:text-black">New Conversation</div>
                    <div className="text-sm text-gray-400 mt-1 light:text-gray-500">Find users to start chatting</div>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="p-2 rounded-xl hover:bg-white/10 transition-all duration-200 group light:hover:bg-black/5"
                >
                  <X className="w-5 h-5 text-gray-400 group-hover:text-white transition-colors light:text-gray-600 light:group-hover:text-black" />
                </button>
              </div>
            </div>

            {/* Enhanced Search Section */}
            <div className="p-6">
              <div className="relative group mb-6">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 group-hover:text-purple-400 transition-colors duration-300 light:group-hover:text-blue-500" />
                <input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Search by name or email..."
                  className="w-full pl-12 pr-4 py-4 bg-white/5 border border-white/10 rounded-2xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 transition-all duration-300 text-sm backdrop-blur-sm group-hover:bg-white/10 light:bg-black/5 light:border-black/10 light:text-black light:placeholder-gray-500 light:focus:ring-blue-500/50 light:focus:border-blue-500/50 light:group-hover:bg-black/10"
                />
                {loading && (
                  <div className="absolute right-4 top-1/2 transform -translate-y-1/2">
                    <div className="w-4 h-4 border-2 border-purple-500/30 border-t-purple-500 rounded-full animate-spin light:border-blue-500/30 light:border-t-blue-500" />
                  </div>
                )}
              </div>

              {/* Enhanced Results */}
              <div className="space-y-3 max-h-96 overflow-y-auto scrollbar-thin scrollbar-thumb-white/10 light:scrollbar-thumb-black/10">
                {result === null && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-center py-8"
                  >
                    <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center mx-auto mb-4 light:bg-black/5">
                      <Search className="w-6 h-6 text-gray-400 light:text-gray-500" />
                    </div>
                    <div className="text-gray-400 text-sm light:text-gray-500">Enter a name or email to search</div>
                  </motion.div>
                )}
                
                {Array.isArray(result) && result.length === 0 && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-center py-8"
                  >
                    <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center mx-auto mb-4 light:bg-black/5">
                      <User className="w-6 h-6 text-gray-400 light:text-gray-500" />
                    </div>
                    <div className="text-gray-400 text-sm light:text-gray-500">No users found</div>
                  </motion.div>
                )}
                
                {Array.isArray(result) && result.map((u, index) => (
                  <motion.div
                    key={u.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="group relative"
                  >
                    <div className="p-4 bg-white/5 rounded-2xl border border-white/10 hover:border-white/20 transition-all duration-300 light:bg-black/5 light:border-black/10 light:hover:border-black/20">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold shadow-lg light:from-blue-600 light:to-cyan-500">
                            {u.displayName ? u.displayName[0].toUpperCase() : (u.email || 'U')[0].toUpperCase()}
                          </div>
                          <div>
                            <div className="font-semibold text-white text-sm light:text-black">
                              {u.displayName || u.email || u.id}
                            </div>
                            <div className="text-xs text-gray-400 mt-1 light:text-gray-500">
                              {u.email || u.id}
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                          <button
                            onClick={() => handleCreateChatWith(u.id)}
                            className="p-3 bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/30 rounded-xl transition-all duration-200 group/btn light:bg-emerald-500/10 light:hover:bg-emerald-500/20 light:border-emerald-500/20"
                          >
                            <MessageCircle className="w-4 h-4 text-emerald-400 group-hover/btn:scale-110 transition-transform" />
                          </button>
                          <button
                            onClick={() => handleSendRequest(u.id)}
                            className="p-3 bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/30 rounded-xl transition-all duration-200 group/btn light:bg-blue-500/10 light:hover:bg-blue-500/20 light:border-blue-500/20"
                          >
                            <UserPlus className="w-4 h-4 text-blue-400 group-hover/btn:scale-110 transition-transform" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Enhanced Footer */}
            <div className="p-4 bg-slate-800/50 border-t border-white/10 light:bg-gray-100/50 light:border-black/10">
              <div className="text-xs text-gray-400 text-center light:text-gray-500">
                Start meaningful conversations with friends and colleagues
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}