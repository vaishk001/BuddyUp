import React, { useEffect, useState } from 'react'
import { X, UserPlus, Check, XCircle, MoreVertical, Clock, UserCheck } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '../../contexts/AuthContext'
import { useUI } from '../../contexts/UIContext'
import { listenFriendRequests, respondFriendRequest, getUser } from '../../services/firestore'

export default function FriendRequestsPanel({ open, onClose }) {
  const { user } = useAuth()
  const { showToast } = useUI()
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedRequest, setSelectedRequest] = useState(null)
  const [userDetails, setUserDetails] = useState({})

  useEffect(() => {
    if (!open) return
    if (!user) {
      setRequests([])
      setLoading(false)
      return
    }
    setLoading(true)
    const unsub = listenFriendRequests(user.uid, async (list) => {
      const pending = (list || []).filter(r => !r.status || r.status === 'pending')
      setRequests(pending)
      
      // Fetch user details for each request
      const details = {}
      for (const req of pending) {
        if (req.from && !userDetails[req.from]) {
          try {
            const userData = await getUser(req.from)
            details[req.from] = userData
          } catch (error) {
            console.warn('Failed to fetch user details for:', req.from)
          }
        }
      }
      setUserDetails(prev => ({ ...prev, ...details }))
      
      setLoading(false)
    })
    return unsub
  }, [open, user])

  async function handleRespond(reqId, accept) {
    try {
      setRequests(prev => prev.filter(r => r.id !== reqId))
      const chatId = await respondFriendRequest(user.uid, reqId, accept)
      
      if (accept) {
        showToast('Friend request accepted! You can now chat.', 'success')
        // Optional: notify parent component to switch to chats tab and open the new chat
        if (chatId && onClose) {
          // Give a small delay for the chat to appear in the list
          setTimeout(() => {
            onClose()
          }, 500)
        }
      } else {
        showToast('Friend request declined', 'success')
      }
    } catch (e) {
      console.error('respondFriendRequest failed', e)
      showToast('Failed to update request', 'error')
    }
  }

  const formatTime = (timestamp) => {
    if (!timestamp) return ''
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp)
    const now = new Date()
    const diff = now - date
    
    if (diff < 60 * 1000) return 'Just now'
    if (diff < 60 * 60 * 1000) return `${Math.floor(diff / (60 * 1000))}m ago`
    if (diff < 24 * 60 * 60 * 1000) return `${Math.floor(diff / (60 * 60 * 1000))}h ago`
    return `${Math.floor(diff / (24 * 60 * 60 * 1000))}d ago`
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.aside
          initial={{ x: 300, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: 300, opacity: 0 }}
          transition={{ type: "spring", damping: 25 }}
          className="fixed right-0 top-0 h-full w-96 bg-slate-900/95 backdrop-blur-xl border-l border-white/10 shadow-2xl z-50 light:bg-gray-50/95 light:border-black/10"
        >
          {/* Enhanced Header */}
          <div className="p-6 border-b border-white/10 bg-gradient-to-r from-slate-800/50 to-slate-900/50 light:border-black/10 light:bg-gray-100/50">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white shadow-lg light:from-blue-500 light:to-cyan-500">
                  <UserPlus className="w-6 h-6" />
                </div>
                <div>
                  <div className="font-bold text-white text-lg light:text-black">Friend Requests</div>
                  <div className="text-sm text-gray-400 light:text-gray-500">Connect with people you know</div>
                </div>
              </div>
              <button 
                onClick={onClose} 
                className="p-3 hover:bg-white/10 rounded-2xl transition-all duration-300 group hover:scale-105 light:hover:bg-black/5"
              >
                <X className="w-5 h-5 text-gray-400 group-hover:text-white transition-colors light:text-gray-600 light:group-hover:text-black" />
              </button>
            </div>

            {/* Stats */}
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" />
                <span className="text-gray-300 light:text-gray-600">{requests.length} pending</span>
              </div>
              <div className="flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-green-400" />
                <span className="text-gray-300 light:text-gray-600">24 friends</span>
              </div>
            </div>
          </div>

          {/* Enhanced Content */}
          <div className="h-[calc(100%-140px)] overflow-y-auto scrollbar-thin scrollbar-thumb-white/10 p-4 light:scrollbar-thumb-black/10">
            {loading && (
              <div className="flex flex-col items-center justify-center py-12">
                <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin mb-3 light:border-blue-500 light:border-t-transparent" />
                <div className="text-gray-400 text-sm light:text-gray-500">Loading requests...</div>
              </div>
            )}
            
            {!loading && requests.length === 0 && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col items-center justify-center py-16 text-center"
              >
                <div className="w-20 h-20 bg-white/5 rounded-2xl flex items-center justify-center mb-4 light:bg-black/5">
                  <UserPlus className="w-8 h-8 text-gray-400 light:text-gray-500" />
                </div>
                <div className="text-white font-medium mb-2 light:text-black">No pending requests</div>
                <div className="text-gray-400 text-sm light:text-gray-500">When someone sends you a friend request, it will appear here.</div>
              </motion.div>
            )}

            {/* Enhanced Request Cards */}
            <div className="space-y-3">
              {requests.map((request, index) => {
                const userDetail = userDetails[request.from]
                return (
                  <motion.div
                    key={request.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="bg-white/5 rounded-2xl border border-white/10 hover:border-white/20 transition-all duration-300 group overflow-hidden light:bg-white light:border-black/10 light:hover:border-black/20"
                  >
                    <div className="p-4">
                      <div className="flex items-start gap-3">
                        {/* Enhanced Avatar */}
                        <div className="relative">
                          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-lg shadow-lg">
                            {userDetail?.displayName?.[0] || request.fromName?.[0] || 'U'}
                          </div>
                          <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-400 rounded-full border-2 border-slate-900 light:border-white" />
                        </div>

                        {/* Enhanced Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <div className="font-semibold text-white text-sm light:text-black">
                                {userDetail?.displayName || request.fromName || request.from}
                              </div>
                              <div className="text-xs text-gray-400 mt-1 light:text-gray-500">
                                {userDetail?.email || request.from}
                              </div>
                            </div>
                            <button className="p-2 hover:bg-white/10 rounded-xl transition-colors opacity-0 group-hover:opacity-100 light:hover:bg-black/5">
                              <MoreVertical className="w-4 h-4 text-gray-400 light:text-gray-600" />
                            </button>
                          </div>
                          
                          <div className="text-sm text-gray-300 mb-3 light:text-gray-600">
                            {request.message || 'Wants to connect with you'}
                          </div>

                          {/* Meta Information */}
                          <div className="flex items-center gap-3 text-xs text-gray-400 light:text-gray-500">
                            <div className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {formatTime(request.timestamp)}
                            </div>
                            {request.mutualFriends > 0 && (
                              <div className="flex items-center gap-1">
                                <UserCheck className="w-3 h-3" />
                                {request.mutualFriends} mutual friends
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Enhanced Action Buttons */}
                      <div className="flex gap-2 mt-4">
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => handleRespond(request.id, true)}
                          className="flex-1 py-3 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 rounded-xl text-white font-medium transition-all duration-300 flex items-center justify-center gap-2"
                        >
                          <Check className="w-4 h-4" />
                          Accept
                        </motion.button>
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => handleRespond(request.id, false)}
                          className="flex-1 py-3 bg-white/10 hover:bg-white/20 rounded-xl text-white font-medium transition-all duration-300 flex items-center justify-center gap-2 light:bg-black/10 light:hover:bg-black/20 light:text-black"
                        >
                          <XCircle className="w-4 h-4" />
                          Decline
                        </motion.button>
                      </div>
                    </div>
                  </motion.div>
                )
              })}
            </div>
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  )
}