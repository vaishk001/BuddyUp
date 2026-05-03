import React, { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Pin, Volume2, VolumeX, CheckCheck, Check, Users, 
  MoreVertical, Star, Archive, Trash2, Edit3, UserX
} from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { listenChats, togglePinnedChat, toggleMutedChat, getUser, removeFriend, deleteChat, archiveChat } from '../../services/firestore'
import { useUI } from '../../contexts/UIContext'

export default function ChatList({ selectedChatId, onSelect, searchQuery, activeFilter }) {
  const { user } = useAuth()
  const { showToast } = useUI()
  const [chats, setChats] = useState([])
  const [filteredChats, setFilteredChats] = useState([])
  const [hoveredChat, setHoveredChat] = useState(null)
  const [menuOpen, setMenuOpen] = useState(null)
  const [chatDisplayData, setChatDisplayData] = useState({})

  useEffect(() => {
    if (!user) return
    const unsub = listenChats(user.uid, (list) => {
      // Filter out archived chats
      const activeChats = (list || []).filter(chat => {
        const archivedBy = chat.archivedBy || []
        return !archivedBy.includes(user.uid)
      })
      setChats(activeChats)
      // Fetch display names for 1:1 chats
      fetchChatDisplayData(activeChats)
    })
    return unsub
  }, [user])

  const fetchChatDisplayData = async (chatList) => {
    const displayData = {}
    
    for (const chat of chatList) {
      // For 1:1 chats, get the other user's info
      if (chat.participants?.length === 2 && user?.uid) {
        const otherUserId = chat.participants.find(p => p !== user.uid)
        if (otherUserId) {
          try {
            const otherUser = await getUser(otherUserId)
            if (otherUser) {
              displayData[chat.id] = {
                name: otherUser.displayName || otherUser.email || 'User',
                photoURL: otherUser.photoURL,
                isGroup: false
              }
            }
          } catch (error) {
            console.error('Error fetching user data:', error)
          }
        }
      } else if (chat.type === 'group') {
        // For group chats, use the group name
        displayData[chat.id] = {
          name: chat.name || 'Group Chat',
          photoURL: chat.photoURL,
          isGroup: true
        }
      }
    }
    
    setChatDisplayData(displayData)
  }

  useEffect(() => {
    let filtered = chats
    
    // Apply search filter
    if (searchQuery) {
      filtered = filtered.filter(chat => 
        chat.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        chat.last?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }

    // Apply category filter
    switch (activeFilter) {
      case 'unread':
        filtered = filtered.filter(chat => chat.unread > 0)
        break
      case 'pinned':
        filtered = filtered.filter(chat => chat.pinned)
        break
      case 'groups':
        filtered = filtered.filter(chat => chat.type === 'group')
        break
      case 'favorites':
        // Assuming favorites logic is implemented or just placeholder
        filtered = filtered.filter(chat => chat.pinned) // Using pinned as favorites for now
        break
      default:
        break
    }

    setFilteredChats(filtered)
  }, [chats, searchQuery, activeFilter])

  const getStatusIcon = (chat) => {
    if (chat.type === 'group') {
      return chat.muted ? 
        <VolumeX className="w-3 h-3 text-gray-400" /> : 
        <Volume2 className="w-3 h-3 text-green-400" />
    }
    return chat.online ? 
      <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]" /> :
      <div className="w-2.5 h-2.5 bg-slate-500 rounded-full" />
  }

  const handlePinChat = async (chatId, e) => {
    e.stopPropagation()
    try {
      await togglePinnedChat(chatId, user.uid)
      showToast('Chat pinned', 'success')
    } catch (error) {
      showToast('Failed to pin chat', 'error')
    }
  }

  const handleMuteChat = async (chatId, e) => {
    e.stopPropagation()
    try {
      await toggleMutedChat(chatId, user.uid)
      showToast('Chat muted', 'success')
    } catch (error) {
      showToast('Failed to mute chat', 'error')
    }
  }

  const handleRemoveFriend = async (chat, e) => {
    e.stopPropagation()
    setMenuOpen(null)
    
    try {
      // Get the friend's ID (the other participant in the chat)
      const friendId = chat.participants?.find(id => id !== user.uid)
      
      if (!friendId) {
        showToast('Could not identify friend', 'error')
        return
      }
      
      // Remove friend relationship
      await removeFriend(user.uid, friendId)
      
      // Also archive the chat so it disappears from the list
      await archiveChat(chat.id, user.uid)
      
      showToast('Friend removed and chat archived', 'success')
      
      // The chat list will automatically update via the onSnapshot listener
    } catch (error) {
      console.error('Remove friend error:', error)
      showToast('Failed to remove friend', 'error')
    }
  }

  const handleArchiveChat = async (chatId, e) => {
    e.stopPropagation()
    setMenuOpen(null)
    
    try {
      const archived = await archiveChat(chatId, user.uid)
      showToast(archived ? 'Chat archived' : 'Chat unarchived', 'success')
    } catch (error) {
      console.error('Archive chat error:', error)
      showToast('Failed to archive chat', 'error')
    }
  }

  const handleDeleteChat = async (chatId, e) => {
    e.stopPropagation()
    setMenuOpen(null)
    
    // Confirm before deleting
    if (!window.confirm('Are you sure you want to delete this chat? This action cannot be undone.')) {
      return
    }
    
    try {
      await deleteChat(chatId, user.uid)
      showToast('Chat deleted', 'success')
    } catch (error) {
      console.error('Delete chat error:', error)
      showToast('Failed to delete chat', 'error')
    }
  }

  const formatTime = (timestamp) => {
    if (!timestamp) return ''
    
    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp)
      
      // Check if date is valid
      if (isNaN(date.getTime())) return ''
      
      const now = new Date()
      const diff = now - date
      
      if (diff < 24 * 60 * 60 * 1000) {
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      } else if (diff < 7 * 24 * 60 * 60 * 1000) {
        return date.toLocaleDateString([], { weekday: 'short' })
      } else {
        return date.toLocaleDateString([], { month: 'short', day: 'numeric' })
      }
    } catch (error) {
      console.error('Error formatting time:', error)
      return ''
    }
  }

  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-white/10 p-2">
        <AnimatePresence mode="wait">
          {filteredChats.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center h-64 text-gray-400"
            >
              <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mb-4">
                <Users className="w-8 h-8 opacity-50" />
              </div>
              <p className="text-sm font-medium">No conversations found</p>
            </motion.div>
          ) : (
            <div className="space-y-1">
              {filteredChats.map((chat, index) => (
                <motion.div
                  key={chat.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.03, type: "spring", stiffness: 120 }}
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                  onMouseEnter={() => setHoveredChat(chat.id)}
                  onMouseLeave={() => setHoveredChat(null)}
                  className={`relative group rounded-xl transition-all duration-300 backdrop-blur-sm border ${
                    selectedChatId === chat.id 
                      ? 'bg-indigo-500/20 border-indigo-500/30 shadow-lg shadow-indigo-500/10' 
                      : 'bg-transparent hover:bg-white/5 border-transparent hover:border-white/5'
                  } ${menuOpen === chat.id ? 'z-[100]' : 'z-0'}`}
                >
                  <div 
                    onClick={() => onSelect && onSelect(chat.id)} 
                    className="flex items-center gap-3 p-3 cursor-pointer"
                  >
                    {/* Enhanced Avatar */}
                    <div className="relative flex-shrink-0">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-lg shadow-lg relative overflow-hidden ${
                        chatDisplayData[chat.id]?.isGroup || chat.type === 'group'
                          ? 'bg-gradient-to-br from-violet-500 to-fuchsia-500' 
                          : 'bg-gradient-to-br from-blue-500 to-cyan-500'
                      }`}>
                        {chatDisplayData[chat.id]?.photoURL ? (
                          <img 
                            src={chatDisplayData[chat.id].photoURL} 
                            alt={chatDisplayData[chat.id].name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <>
                            {(chatDisplayData[chat.id]?.isGroup || chat.type === 'group') ? (
                              <Users className="w-6 h-6" />
                            ) : (
                              (chatDisplayData[chat.id]?.name?.[0] || chat.name?.[0] || '?').toUpperCase()
                            )}
                          </>
                        )}
                      </div>
                      
                      {/* Status Indicator */}
                      <div className="absolute -bottom-1 -right-1 bg-slate-900 rounded-full p-0.5">
                        {getStatusIcon(chat)}
                      </div>

                      {/* Unread Indicator */}
                      {chat.unread > 0 && (
                        <div className="absolute -top-1 -right-1 min-w-[20px] h-5 bg-rose-500 rounded-full flex items-center justify-center text-[10px] text-white font-bold shadow-lg px-1 border-2 border-slate-900">
                          {chat.unread > 99 ? '99+' : chat.unread}
                        </div>
                      )}
                    </div>

                    {/* Enhanced Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2 min-w-0">
                          <h4 className={`font-semibold truncate text-sm ${
                            selectedChatId === chat.id ? 'text-white' : 'text-slate-200'
                          }`}>
                            {chatDisplayData[chat.id]?.name || chat.name || 'Chat'}
                          </h4>
                          {chat.pinned && (
                            <Pin className="w-3 h-3 text-amber-400 fill-current flex-shrink-0" />
                          )}
                        </div>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <span className={`text-xs ${
                            chat.unread > 0 ? 'text-indigo-400 font-medium' : 'text-slate-500'
                          }`}>
                            {formatTime(chat.lastMessage || chat.lastMessageTime || chat.createdAt)}
                          </span>
                          {chat.muted && (
                            <VolumeX className="w-3 h-3 text-slate-500" />
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-1.5">
                        {chat.unread === 0 && chat.lastMessageText && (
                          <CheckCheck className="w-3.5 h-3.5 text-indigo-400 flex-shrink-0" />
                        )}
                        <p className={`text-xs truncate flex-1 ${
                          chat.unread > 0 ? 'text-slate-300 font-medium' : 'text-slate-500'
                        }`}>
                          {chat.lastMessageText || chat.last || 'No messages yet'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Hover Actions */}
                  <div className={`absolute right-2 top-1/2 transform -translate-y-1/2 flex gap-1 transition-opacity duration-200 ${
                    hoveredChat === chat.id || menuOpen === chat.id ? 'opacity-100' : 'opacity-0 pointer-events-none'
                  }`}>
                    <button 
                      onClick={(e) => handlePinChat(chat.id, e)}
                      className="p-1.5 bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-amber-400 rounded-lg backdrop-blur-sm border border-white/5 transition-colors"
                      title={chat.pinned ? "Unpin" : "Pin"}
                    >
                      <Pin className="w-3.5 h-3.5" />
                    </button>
                    
                    <button 
                      onClick={(e) => {
                        e.stopPropagation()
                        setMenuOpen(menuOpen === chat.id ? null : chat.id)
                      }}
                      className="p-1.5 bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white rounded-lg backdrop-blur-sm border border-white/5 transition-colors"
                    >
                      <MoreVertical className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Context Menu */}
                  <AnimatePresence>
                    {menuOpen === chat.id && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 10 }}
                        className="absolute right-2 top-10 w-40 bg-slate-900/95 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl z-50 overflow-hidden"
                      >
                        <div className="p-1">
                          <button 
                            onClick={(e) => handleMuteChat(chat.id, e)}
                            className="w-full flex items-center gap-2 p-2 rounded-lg hover:bg-white/5 text-xs text-slate-300 transition-colors"
                          >
                            {chat.muted ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
                            <span>{chat.muted ? 'Unmute' : 'Mute'}</span>
                          </button>
                          <button 
                            onClick={(e) => handleArchiveChat(chat.id, e)}
                            className="w-full flex items-center gap-2 p-2 rounded-lg hover:bg-white/5 text-xs text-slate-300 transition-colors"
                          >
                            <Archive className="w-3.5 h-3.5" />
                            <span>Archive</span>
                          </button>
                          <div className="h-px bg-white/5 my-1" />
                          <button 
                            onClick={(e) => handleRemoveFriend(chat, e)}
                            className="w-full flex items-center gap-2 p-2 rounded-lg hover:bg-orange-500/10 text-xs text-orange-400 transition-colors"
                          >
                            <UserX className="w-3.5 h-3.5" />
                            <span>Remove Friend</span>
                          </button>
                          <button 
                            onClick={(e) => handleDeleteChat(chat.id, e)}
                            className="w-full flex items-center gap-2 p-2 rounded-lg hover:bg-rose-500/10 text-xs text-rose-400 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Delete</span>
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              ))}
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}