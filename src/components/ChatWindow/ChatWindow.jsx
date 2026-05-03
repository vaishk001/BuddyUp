import React, { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  MoreVertical, 
  Phone, 
  Video, 
  Search, 
  ArrowLeft,
  Pin,
  Users,
  Volume2,
  VolumeX,
  SmilePlus,
  Image,
  Mic,
  Paperclip,
  Info,
  Trash2,
  Star,
  CheckCircle,
  Palette,
  Settings,
  LogOut,
  X
} from 'lucide-react'
import MessageInput from '../Message/MessageInput'
import MessageBubble from './MessageBubble'
import UserProfileModal from '../Profile/UserProfileModal'
import { listenMessages, sendMessage as sendMessageToFs, togglePinnedChat, toggleMutedChat, getGroupMembers, clearChatMessages, getChat, getUser, listenTypingIndicators, setTypingIndicator, listenUserPresence, setUserStatusFlags, toggleStarMessage, markMessagesAsDelivered, markMessagesAsRead } from '../../services/firestore'
import { useAuth } from '../../contexts/AuthContext'
import { useUI } from '../../contexts/UIContext'
import { useCall } from '../../contexts/CallContext'

export default function ChatWindow({ chatId, onBack, onToggleInfo }) {
  const [messages, setMessages] = useState([])
  const messagesEndRef = useRef(null)
  const [headerMenuOpen, setHeaderMenuOpen] = useState(false)
  const [pinned, setPinned] = useState(false)
  const [muted, setMuted] = useState(false)
  const [showGroupInfo, setShowGroupInfo] = useState(false)
  const [groupMembers, setGroupMembers] = useState([])
  const [chatMeta, setChatMeta] = useState(null)
  const [otherUser, setOtherUser] = useState(null)
  const [otherPresence, setOtherPresence] = useState(null)
  const [typingUsers, setTypingUsers] = useState({})
  const [typingUserNames, setTypingUserNames] = useState({})
  const { user, userDoc } = useAuth()
  const { showToast, confirm } = useUI()
  const [replyTo, setReplyTo] = useState(null)
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [showStarredMessages, setShowStarredMessages] = useState(false)
  const [showUserProfile, setShowUserProfile] = useState(false)
  const { startCall } = useCall()

  // Filter starred messages
  const starredMessages = messages.filter(msg => msg.starred && msg.starred.includes(user?.uid))

  // Background customization state
  const [showBackgroundModal, setShowBackgroundModal] = useState(false)
  const [wallpaperType, setWallpaperType] = useState(() => localStorage.getItem('chatWallpaperType') || 'none')
  const [wallpaperColor, setWallpaperColor] = useState(() => localStorage.getItem('chatWallpaperColor') || '#1e293b')
  const [wallpaperGradient, setWallpaperGradient] = useState(() => localStorage.getItem('chatWallpaperGradient') || 'from-purple-900 to-blue-900')
  const [wallpaperImage, setWallpaperImage] = useState(() => localStorage.getItem('chatWallpaperImage') || '')
  const [blurAmount, setBlurAmount] = useState(() => parseInt(localStorage.getItem('chatBlurAmount') || '0'))

  // Persist wallpaper settings
  useEffect(() => {
    localStorage.setItem('chatWallpaperType', wallpaperType)
    localStorage.setItem('chatWallpaperColor', wallpaperColor)
    localStorage.setItem('chatWallpaperGradient', wallpaperGradient)
    localStorage.setItem('chatWallpaperImage', wallpaperImage)
    localStorage.setItem('chatBlurAmount', blurAmount.toString())
  }, [wallpaperType, wallpaperColor, wallpaperGradient, wallpaperImage, blurAmount])

  // Auto-scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])
  
  // Mark messages as read when user is viewing the chat
  useEffect(() => {
    if (!chatId || !user?.uid || messages.length === 0) return
    
    const markAsReadTimer = setTimeout(() => {
      markMessagesAsRead(chatId, user.uid).catch(e => 
        console.warn('Failed to mark as read:', e)
      )
    }, 1000) // Wait 1 second before marking as read
    
    return () => clearTimeout(markAsReadTimer)
  }, [chatId, user?.uid, messages.length])

  // Filter messages based on search
  const filteredMessages = searchQuery 
    ? messages.filter(msg => 
        msg.text?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : messages

  useEffect(() => {
    if (!chatId) {
      setMessages([])
      setTypingUsers({})
      return
    }

    let unsubMessages
    let unsubTyping

    // Load chat metadata
    ;(async () => {
      try {
        const chat = await getChat(chatId)
        setChatMeta(chat)
        setOtherUser(null)
        if (chat && chat.participants && chat.participants.length === 2 && user?.uid) {
          const otherId = chat.participants.find(p => p !== user.uid)
          if (otherId) {
            const ou = await getUser(otherId)
            setOtherUser(ou)
          }
        } else {
          setOtherUser(null)
        }
      } catch (e) {
        console.warn('failed to load chat meta', e)
      }
    })()

    // Set up real-time message listener
    try {
      unsubMessages = listenMessages(chatId, msgs => {
        const processedMessages = msgs.map(m => ({ 
          ...m, // Keep all original fields
          id: m.id, 
          chatId: chatId, // Add chatId for message operations
          text: m.text, 
          fromMe: m.from === user?.uid, 
          time: m.createdAt && m.createdAt.toDate ? 
            new Date(m.createdAt.toDate()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '', 
          status: m.status || 'sent', 
          reactions: m.reactions || {},
          starred: m.starred || [],
          type: m.type || 'text',
          url: m.url || m.mediaUrl || null,
          mediaUrl: m.mediaUrl || m.url || null,
          from: m.from,
          replyTo: m.replyTo || null,
          fileName: m.fileName || null,
          fileSize: m.fileSize || null,
          duration: m.duration || null,
          edited: m.edited || false,
          editedAt: m.editedAt || null,
          deletedFor: m.deletedFor || []
        }))
        
        // Filter out messages deleted for current user
        const visibleMessages = processedMessages.filter(m => 
          !m.deletedFor || !m.deletedFor.includes(user?.uid)
        )
        
        setMessages(visibleMessages)
      })

      unsubTyping = listenTypingIndicators(chatId, (typing) => {
        setTypingUsers(typing)
      })
      
      // Mark messages as delivered when chat is opened
      if (user?.uid) {
        markMessagesAsDelivered(chatId, user.uid).catch(e => 
          console.warn('Failed to mark as delivered:', e)
        )
      }
    } catch (e) {
      console.error('Failed to set up message listeners:', e)
    }

    return () => {
      if (unsubMessages) unsubMessages()
      if (unsubTyping) unsubTyping()
    }
  }, [chatId, user?.uid])

  // Subscribe to other user's presence for 1:1 chats
  useEffect(() => {
    if (!chatMeta || !chatMeta.participants || chatMeta.participants.length !== 2 || !user?.uid) {
      setOtherPresence(null)
      return
    }
    const otherId = chatMeta.participants.find(p => p !== user.uid)
    if (!otherId) return
    const unsub = listenUserPresence(otherId, (data) => setOtherPresence(data))
    return unsub
  }, [chatMeta, user])

  // Fetch typing user names
  useEffect(() => {
    const fetchTypingNames = async () => {
      const typingIds = Object.keys(typingUsers).filter(uid => uid !== user?.uid)
      if (typingIds.length === 0) {
        setTypingUserNames({})
        return
      }

      const names = {}
      for (const uid of typingIds) {
        try {
          const userData = await getUser(uid)
          names[uid] = userData?.displayName || userData?.email?.split('@')[0] || 'Someone'
        } catch (e) {
          names[uid] = 'Someone'
        }
      }
      setTypingUserNames(names)
    }

    fetchTypingNames()
  }, [typingUsers, user])

  useEffect(() => {
    if (!chatId) {
      setPinned(false)
      setMuted(false)
      return
    }
    if (user?.uid && userDoc) {
      const udoc = userDoc
      setPinned(!!(udoc?.pinnedChats || []).includes(chatId))
      setMuted(!!(udoc?.mutedChats || []).includes(chatId))
      return
    }
  }, [chatId, user])

  const handleSendMessage = (newMessage) => {
    if (!chatId) {
      showToast('Please select or create a chat first', 'error')
      return
    }
    try {
      if (typeof newMessage === 'object' && newMessage !== null) {
        const msg = {
          ...newMessage,
          from: user?.uid || 'local',
          status: 'sent',
          createdAt: undefined,
          replyTo: replyTo ? { id: replyTo.id, text: replyTo.text, type: replyTo.type } : undefined
        }
        sendMessageToFs(chatId, msg).catch(err => {
          console.warn('sendMessage failed', err)
          const message = {
            id: Date.now(),
            ...msg,
            fromMe: true,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          }
          setMessages(prev => [...prev, message])
        })
        setReplyTo(null)
        return
      }

      const payload = {
        text: newMessage,
        from: user?.uid || 'local',
        status: 'sent',
        type: 'text',
        replyTo: replyTo ? { id: replyTo.id, text: replyTo.text, type: replyTo.type } : undefined
      }
      sendMessageToFs(chatId, payload).catch(err => {
        console.warn('sendMessage failed', err)
        const message = {
          id: Date.now(),
          text: newMessage,
          fromMe: true,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          status: 'sent',
          type: 'text'
        }
        setMessages(prev => [...prev, message])
      })
      setReplyTo(null)
    } catch (e) {
      console.error('handleSendMessage error', e)
      showToast('Failed to send message', 'error')
    }
  }

  useEffect(() => {
    function onReply(e) {
      const m = e?.detail?.message
      if (!m) return
      setReplyTo(m)
      showToast('Replying to message')
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
    window.addEventListener('chat:reply', onReply)
    return () => window.removeEventListener('chat:reply', onReply)
  }, [messagesEndRef, showToast])

  const sampleMessages = !chatId ? [
    { id: 1, text: "👋 Welcome to ChatWave!", fromMe: false, time: "10:00", status: 'read', type: 'text' },
    { id: 2, text: "Select a chat from the sidebar to start messaging", fromMe: false, time: "10:01", status: 'read', type: 'text' },
    { id: 3, text: "You can also create new chats using the + button", fromMe: false, time: "10:02", status: 'read', type: 'text' }
  ] : []

  const displayMessages = chatId ? filteredMessages : sampleMessages

  // Helper to get background styles
  const getBackgroundStyles = () => {
    const baseStyles = {
      backdropFilter: blurAmount > 0 ? `blur(${blurAmount}px)` : 'none'
    }

    switch (wallpaperType) {
      case 'solid':
        return {
          ...baseStyles,
          background: wallpaperColor
        }
      case 'gradient':
        return {
          ...baseStyles,
          background: `linear-gradient(to bottom right, var(--tw-gradient-stops))`,
          className: wallpaperGradient
        }
      case 'image':
        return {
          ...baseStyles,
          backgroundImage: `url(${wallpaperImage})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat'
        }
      default:
        return {}
    }
  }

  const bgStyles = getBackgroundStyles()

  return (
    <div 
      className={`flex-1 flex flex-col ${wallpaperType === 'gradient' ? `bg-gradient-to-br ${wallpaperGradient}` : 'bg-gradient-to-br from-slate-900 via-purple-900/20 to-slate-900'} text-white relative overflow-hidden`}
      style={wallpaperType !== 'gradient' && wallpaperType !== 'none' ? bgStyles : (wallpaperType === 'gradient' ? bgStyles : {})}
    >
      {/* Enhanced Animated Background */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 via-transparent to-blue-500/5" />
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-purple-500/30 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-blue-500/30 to-transparent" />
        
        {/* Floating particles effect */}
        <div className="absolute inset-0 opacity-10">
          {[...Array(20)].map((_, i) => (
            <div
              key={i}
              className="absolute w-1 h-1 bg-white rounded-full animate-float"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 20}s`,
                animationDuration: `${15 + Math.random() * 10}s`
              }}
            />
          ))}
        </div>
      </div>

      {/* Enhanced Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-20 p-2 sm:p-3 md:p-4 border-b border-white/10 bg-slate-900/90 backdrop-blur-2xl flex items-center justify-between shadow-2xl"
      >
        <div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0">
          {/* Back/Sidebar Toggle Button - Always visible, better styling */}
          {onBack && (
            <button 
              onClick={onBack}
              className="flex-shrink-0 p-2 sm:p-2.5 bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/30 rounded-xl sm:rounded-2xl transition-all duration-300 hover:scale-105 active:scale-95 group"
              aria-label="Open sidebar"
              title="Open sidebar"
            >
              <ArrowLeft className="w-5 h-5 text-purple-400 group-hover:text-purple-300 transition-colors" />
            </button>
          )}
          
          {chatId ? (
            <div className="flex items-center gap-2 sm:gap-3 md:gap-4 flex-1 min-w-0">
              <button
                onClick={() => setShowUserProfile(true)}
                className="relative group flex-shrink-0"
              >
                <div className="w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14 rounded-xl sm:rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 shadow-2xl shadow-purple-500/30 flex items-center justify-center text-white font-bold overflow-hidden group">
                  {otherUser?.photoURL ? (
                    <img 
                      src={otherUser.photoURL} 
                      alt={otherUser.displayName || otherUser.id} 
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                    />
                  ) : (
                    <span className="text-sm sm:text-base md:text-lg">{(otherUser?.displayName || chatMeta?.name || 'U').charAt(0).toUpperCase()}</span>
                  )}
                </div>
                {chatMeta?.participants?.length === 2 && (
                  <div className={`absolute -bottom-0.5 -right-0.5 sm:-bottom-1 sm:-right-1 w-3 h-3 sm:w-4 sm:h-4 rounded-full border-2 border-slate-900 transition-all duration-300 ${
                    otherPresence?.online ? 'bg-green-400 animate-pulse shadow-lg shadow-green-400/50' : 'bg-gray-400'
                  }`} />
                )}
              </button>

              <div className="flex-1 min-w-0">
                <button
                  onClick={() => setShowUserProfile(true)}
                  className="font-semibold text-white flex items-center gap-1.5 sm:gap-2 text-sm sm:text-base md:text-lg hover:text-purple-400 transition-colors text-left w-full"
                >
                  <span className="truncate">{otherUser ? (otherUser.displayName || otherUser.email || otherUser.id) : (chatMeta?.name || 'Conversation')}</span>
                  {pinned && <Pin className="w-3 h-3 sm:w-4 sm:h-4 text-yellow-400 fill-current flex-shrink-0" />}
                </button>
                <AnimatePresence mode="wait">
                  {(() => {
                    const activeTyping = Object.keys(typingUsers).filter(uid => uid !== user?.uid)
                    const isRecording = otherPresence?.status?.recording
                    const onCall = otherPresence?.status?.onCall
                    const liveLoc = otherPresence?.status?.liveLocationEnabled
                    const isOnline = !!otherPresence?.online
                    const lastSeen = otherPresence?.lastSeen

                    if (onCall) {
                      return (
                        <motion.div key="oncall" initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }} className="text-xs sm:text-sm flex items-center gap-1.5 sm:gap-2 text-blue-400 font-medium truncate">
                          <span>On call</span>
                        </motion.div>
                      )
                    }
                    if (isRecording) {
                      return (
                        <motion.div key="recording" initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }} className="text-xs sm:text-sm flex items-center gap-1.5 sm:gap-2 text-red-400 font-medium truncate">
                          <span>Recording voice…</span>
                        </motion.div>
                      )
                    }
                    if (activeTyping.length > 0) {
                      return (
                        <motion.div key="typing" initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }} className="text-xs sm:text-sm flex items-center gap-1.5 sm:gap-2 text-purple-400 font-medium truncate">
                          <div className="flex gap-1">
                            <div className="w-1 h-1 sm:w-1.5 sm:h-1.5 bg-purple-400 rounded-full animate-bounce" />
                            <div className="w-1 h-1 sm:w-1.5 sm:h-1.5 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                            <div className="w-1 h-1 sm:w-1.5 sm:h-1.5 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                          </div>
                          <span>typing…</span>
                        </motion.div>
                      )
                    }
                    if (liveLoc) {
                      return (
                        <motion.div key="liveloc" initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }} className="text-sm flex items-center gap-2 text-green-400 font-medium max-w-[60vw] truncate">
                          <span>Live location enabled</span>
                        </motion.div>
                      )
                    }
                    if (isOnline) {
                      return (
                        <motion.div key="online" initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }} className="text-sm text-green-400 max-w-[60vw] truncate">
                          <span>Online</span>
                        </motion.div>
                      )
                    }
                    if (lastSeen) {
                      const d = lastSeen?.toDate ? lastSeen.toDate() : new Date(lastSeen)
                      const diffMin = Math.max(1, Math.round((Date.now() - d.getTime()) / 60000))
                      const text = diffMin < 60 ? `${diffMin}m ago` : `${Math.round(diffMin/60)}h ago`
                      return (
                        <motion.div key="lastseen" initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }} className="text-sm text-gray-400 max-w-[60vw] truncate">
                          <span>Last seen {text}</span>
                        </motion.div>
                      )
                    }
                    return (
                      <motion.div key="idle" initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }} className="text-sm text-gray-400 max-w-[60vw] truncate">
                        <span className="opacity-0">·</span>
                      </motion.div>
                    )
                  })()}
                </AnimatePresence>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 sm:gap-3 md:gap-4">
              <div className="w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14 rounded-xl sm:rounded-2xl bg-gradient-to-br from-gray-500 to-gray-600 flex items-center justify-center shadow-2xl">
                <Users className="w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7 text-gray-300" />
              </div>
              <div>
                <div className="font-semibold text-white text-sm sm:text-base md:text-lg">Welcome to ChatWave</div>
                <div className="text-xs sm:text-sm text-gray-400 hidden sm:block">Select a chat to start messaging</div>
              </div>
            </div>
          )}
        </div>

        {/* Enhanced Header Actions */}
        {chatId ? (
          <div className="flex items-center gap-0.5 sm:gap-1">
            {/* Search Bar */}
            <AnimatePresence>
              {searchOpen && (
                <motion.div
                  initial={{ width: 0, opacity: 0 }}
                  animate={{ width: 150, opacity: 1 }}
                  exit={{ width: 0, opacity: 0 }}
                  className="overflow-hidden hidden sm:block"
                >
                  <input
                    type="text"
                    placeholder="Search messages..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-white/10 border border-white/20 rounded-xl px-3 py-2 text-xs sm:text-sm backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                    autoFocus
                  />
                </motion.div>
              )}
            </AnimatePresence>

            <button 
              onClick={() => setSearchOpen(!searchOpen)}
              className="p-2 sm:p-2.5 md:p-3 hover:bg-white/10 rounded-lg sm:rounded-xl transition-all duration-300 group hover:scale-105"
            >
              <Search className="w-4 h-4 sm:w-5 sm:h-5 text-gray-300 group-hover:text-yellow-400 transition-colors" />
            </button>

            <button 
              onClick={() => setShowStarredMessages(!showStarredMessages)}
              className={`p-2 sm:p-2.5 md:p-3 hover:bg-white/10 rounded-lg sm:rounded-xl transition-all duration-300 group hover:scale-105 ${showStarredMessages ? 'bg-white/10' : ''}`}
              title="Starred Messages"
            >
              <Star className={`w-4 h-4 sm:w-5 sm:h-5 transition-colors ${showStarredMessages ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300 group-hover:text-yellow-400'}`} />
            </button>
            
            <button 
              className="p-2 sm:p-2.5 md:p-3 hover:bg-white/10 rounded-lg sm:rounded-xl transition-all duration-300 group hover:scale-105"
              onClick={() => {
                if (otherUser?.id) {
                  startCall(otherUser.id, otherUser.displayName || 'User', false)
                } else {
                  showToast('Unable to start call', 'error')
                }
              }}
              title="Voice Call"
            >
              <Phone className="w-4 h-4 sm:w-5 sm:h-5 text-gray-300 group-hover:text-green-400 transition-colors" />
            </button>
            
            <button 
              className="p-2 sm:p-2.5 md:p-3 hover:bg-white/10 rounded-lg sm:rounded-xl transition-all duration-300 group hover:scale-105"
              onClick={() => {
                if (otherUser?.id) {
                  startCall(otherUser.id, otherUser.displayName || 'User', true)
                } else {
                  showToast('Unable to start call', 'error')
                }
              }}
              title="Video Call"
            >
              <Video className="w-4 h-4 sm:w-5 sm:h-5 text-gray-300 group-hover:text-blue-400 transition-colors" />
            </button>
            
            <button 
              onClick={onToggleInfo}
              className="p-2 sm:p-2.5 md:p-3 hover:bg-white/10 rounded-lg sm:rounded-xl transition-all duration-300 group hover:scale-105 hidden sm:block"
              title="Chat Info"
            >
              <Info className="w-4 h-4 sm:w-5 sm:h-5 text-gray-300 group-hover:text-blue-400 transition-colors" />
            </button>
            
            <div className="relative">
              <button 
                onClick={(e) => {
                  e.stopPropagation()
                  setHeaderMenuOpen(!headerMenuOpen)
                }}
                className="p-2 sm:p-2.5 md:p-3 hover:bg-white/10 rounded-lg sm:rounded-xl transition-all duration-300 group hover:scale-105"
              >
                <MoreVertical className="w-4 h-4 sm:w-5 sm:h-5 text-gray-300 group-hover:text-purple-400 transition-colors" />
              </button>

              <AnimatePresence>
                {headerMenuOpen && (
                  <>
                    {/* Invisible backdrop to close menu on outside click */}
                    <div 
                      className="fixed inset-0 z-[100]" 
                      onClick={() => setHeaderMenuOpen(false)}
                    />
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      className="absolute right-0 top-12 sm:top-14 md:top-16 w-56 bg-slate-900 backdrop-blur-2xl border border-white/20 rounded-2xl shadow-2xl p-2 z-[110]"
                      onClick={(e) => e.stopPropagation()}
                    >
                    <button
                      onClick={async (e) => {
                        e.stopPropagation()
                        setHeaderMenuOpen(false)
                        if (!user?.uid) return showToast('Sign in to pin chats', 'error')
                        try {
                          const nowPinned = await togglePinnedChat(chatId, user.uid)
                          setPinned(nowPinned)
                          showToast(nowPinned ? 'Pinned chat' : 'Unpinned chat', 'success')
                        } catch (e) {
                          console.error('togglePinnedChat failed', e)
                          showToast('Failed to update pinned state', 'error')
                        }
                      }}
                      className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-white/10 transition-all duration-200 group cursor-pointer"
                    >
                        <Pin className={`w-4 h-4 transition-colors ${pinned ? 'text-yellow-400 fill-yellow-400' : 'text-gray-400 group-hover:text-yellow-400'}`} />
                        <span className="text-white text-sm font-medium">{pinned ? 'Unpin Chat' : 'Pin Chat'}</span>
                    </button>

                    <button
                      onClick={async (e) => {
                        e.stopPropagation()
                        setHeaderMenuOpen(false)
                        if (!user?.uid) return showToast('Sign in to mute chats', 'error')
                        try {
                          const nowMuted = await toggleMutedChat(chatId, user.uid)
                          setMuted(nowMuted)
                          showToast(nowMuted ? 'Notifications muted' : 'Notifications unmuted', 'success')
                        } catch (e) {
                          console.error('toggleMutedChat failed', e)
                          showToast('Failed to update mute state', 'error')
                        }
                      }}
                      className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-white/10 transition-all duration-200 group cursor-pointer"
                    >
                        {muted ? (
                          <Volume2 className="w-4 h-4 text-green-400 group-hover:text-green-300" />
                        ) : (
                          <VolumeX className="w-4 h-4 text-gray-400 group-hover:text-green-400" />
                        )}
                        <span className="text-white text-sm font-medium">{muted ? 'Unmute' : 'Mute'}</span>
                    </button>

                    {chatMeta && chatMeta.participants && chatMeta.participants.length > 2 && (
                      <button
                        onClick={async (e) => {
                          e.stopPropagation()
                          setHeaderMenuOpen(false)
                          if (!chatId) return
                          try {
                            const members = await getGroupMembers(chatId)
                            setGroupMembers(members)
                            setShowGroupInfo(true)
                          } catch (e) {
                            console.error('getGroupMembers failed', e)
                            showToast('Failed to load group info', 'error')
                          }
                        }}
                        className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-white/10 transition-all duration-200 group cursor-pointer"
                      >
                        <Users className="w-4 h-4 text-blue-400 group-hover:text-blue-300" />
                        <span className="text-white text-sm font-medium">Group Info</span>
                      </button>
                    )}

                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        setHeaderMenuOpen(false)
                        setShowBackgroundModal(true)
                      }}
                      className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-white/10 transition-all duration-200 group cursor-pointer"
                    >
                      <Palette className="w-4 h-4 text-purple-400 group-hover:text-purple-300" />
                      <span className="text-white text-sm font-medium">Background</span>
                    </button>

                    <div className="h-px bg-white/10 my-2" />

                    <button
                      onClick={async (e) => {
                        e.stopPropagation()
                        setHeaderMenuOpen(false)
                        if (!chatId) return showToast('No chat selected', 'error')
                        const ok = await confirm('Clear chat messages? This cannot be undone.', 'Clear Chat')
                        if (!ok) return
                        try {
                          await clearChatMessages(chatId)
                          setMessages([])
                          showToast('Chat cleared', 'success')
                        } catch (e) {
                          console.error('clearChatMessages failed', e)
                          showToast('Failed to clear chat', 'error')
                        }
                      }}
                      className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-red-500/20 text-red-400 transition-all duration-200 group cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4 group-hover:text-red-300" />
                      <span className="text-sm font-medium group-hover:text-red-300">Clear Chat</span>
                    </button>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-1">
            <button className="p-3 hover:bg-white/10 rounded-xl transition-all duration-300 group hover:scale-105">
              <Users className="w-5 h-5 text-gray-300 group-hover:text-blue-400 transition-colors" />
            </button>
            <button className="p-3 hover:bg-white/10 rounded-xl transition-all duration-300 group hover:scale-105">
              <Search className="w-5 h-5 text-gray-300 group-hover:text-yellow-400 transition-colors" />
            </button>
          </div>
        )}
      </motion.div>

      {/* Enhanced Messages Area */}
      <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-white/20 scrollbar-track-transparent hover:scrollbar-thumb-white/30 p-2 sm:p-3 md:p-4 lg:p-6 relative z-10">
        {!chatId && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center py-8 sm:py-12"
          >
            <div className="w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 mx-auto mb-4 sm:mb-6 rounded-2xl sm:rounded-3xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center border border-white/10 shadow-2xl">
              <Users className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 text-purple-400" />
            </div>
            <h3 className="text-lg sm:text-xl md:text-2xl font-bold text-white mb-2 sm:mb-3 bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
              No Chat Selected
            </h3>
            <p className="text-gray-400 max-w-md mx-auto text-lg leading-relaxed">
              Choose a conversation from the sidebar or start a new chat to begin messaging
            </p>
          </motion.div>
        )}

        {/* Search Results Header */}
        {searchQuery && (
          <div className="flex items-center justify-between mb-6 p-4 bg-white/5 rounded-2xl border border-white/10 backdrop-blur-sm">
            <div className="text-sm text-gray-300">
              Found {filteredMessages.length} results for "{searchQuery}"
            </div>
            <button 
              onClick={() => setSearchQuery('')}
              className="text-xs text-gray-400 hover:text-white transition-colors"
            >
              Clear search
            </button>
          </div>
        )}

        {/* Starred Messages Panel */}
        {showStarredMessages && (
          <div className="mb-6">
            <div className="flex items-center justify-between mb-4 p-4 bg-gradient-to-r from-yellow-500/10 to-amber-500/10 rounded-2xl border border-yellow-500/20 backdrop-blur-sm">
              <div className="flex items-center gap-3">
                <Star className="w-5 h-5 text-yellow-400 fill-yellow-400" />
                <div>
                  <h3 className="text-lg font-bold text-white">Starred Messages</h3>
                  <p className="text-sm text-gray-400">{starredMessages.length} message{starredMessages.length !== 1 ? 's' : ''}</p>
                </div>
              </div>
              <button 
                onClick={() => setShowStarredMessages(false)}
                className="p-2 hover:bg-white/10 rounded-xl transition-all"
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>
            
            {starredMessages.length === 0 ? (
              <div className="text-center py-12 bg-white/5 rounded-2xl border border-white/10">
                <Star className="w-16 h-16 mx-auto mb-4 text-gray-500" />
                <p className="text-gray-400">No starred messages yet</p>
                <p className="text-sm text-gray-500 mt-2">Star important messages to find them easily</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[400px] overflow-y-auto scrollbar-thin scrollbar-thumb-yellow-500/20">
                {starredMessages.map((message) => (
                  <motion.div
                    key={message.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className={`flex ${message.fromMe ? 'justify-end' : 'justify-start'}`}
                  >
                    <MessageBubble message={{ ...message, chatId: chatId || message.chatId }} />
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Date Separator */}
        {displayMessages.length > 0 && !showStarredMessages && (
          <div className="flex items-center justify-center my-8">
            <div className="bg-white/5 px-6 py-3 rounded-full border border-white/10 backdrop-blur-sm shadow-lg">
              <span className="text-sm text-gray-300 font-medium">Today</span>
            </div>
          </div>
        )}

        <AnimatePresence>
          {displayMessages.map((message, index) => (
            <motion.div
              key={message.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3, delay: index * 0.05 }}
              className={`flex ${message.fromMe ? 'justify-end' : 'justify-start'} mb-4`}
            >
              <MessageBubble message={{ ...message, chatId: chatId || message.chatId }} />
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Enhanced Typing Indicator */}
        <AnimatePresence>
          {Object.keys(typingUsers).filter(uid => uid !== user?.uid).length > 0 && chatId && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.8, y: 10 }}
              transition={{ type: "spring", stiffness: 400, damping: 25 }}
              className="flex justify-start mb-4"
            >
              <div className="p-4 rounded-3xl rounded-bl-md bg-white/10 border border-white/10 backdrop-blur-sm shadow-lg">
                <div className="flex gap-1.5">
                  <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" />
                  <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                  <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div ref={messagesEndRef} />
      </div>

      {/* Enhanced Message Input */}
      {chatId && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative z-10 p-4 border-t border-white/10 bg-slate-900/90 backdrop-blur-2xl shadow-2xl"
        >
          {/* Reply Preview */}
          <AnimatePresence>
            {replyTo && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="mb-3 p-3 bg-white/5 rounded-xl border border-white/10 backdrop-blur-sm"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-1 h-6 bg-purple-400 rounded-full" />
                    <span className="text-sm text-gray-300 font-medium">Replying to</span>
                    <span className="text-sm text-white truncate flex-1">{replyTo.text}</span>
                  </div>
                  <button 
                    onClick={() => setReplyTo(null)}
                    className="p-1 hover:bg-white/10 rounded-lg transition-colors"
                  >
                    <span className="text-gray-400 hover:text-white">✕</span>
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="max-w-4xl mx-auto">
            <MessageInput onSendMessage={handleSendMessage} chatId={chatId} />
          </div>
        </motion.div>
      )}

      {/* Enhanced Group Info Slide-over */}
      <AnimatePresence>
        {showGroupInfo && (
          <motion.div
            initial={{ x: 300, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 300, opacity: 0 }}
            className="fixed right-0 top-0 h-full w-80 bg-slate-900/98 border-l border-white/10 z-50 p-6 shadow-2xl backdrop-blur-2xl"
          >
            <div className="flex items-center justify-between mb-6">
              <div>
                <div className="text-xl font-bold text-white">Group Info</div>
                <div className="text-sm text-gray-400">{groupMembers.length} members</div>
              </div>
              <button 
                onClick={() => setShowGroupInfo(false)} 
                className="p-2 rounded-xl hover:bg-white/10 transition-all duration-300 hover:scale-105"
              >
                <span className="text-gray-400 hover:text-white text-lg">✕</span>
              </button>
            </div>

            <div className="space-y-3 max-h-[calc(100vh-200px)] overflow-y-auto scrollbar-thin scrollbar-thumb-white/10">
              {groupMembers.length === 0 && (
                <div className="text-center py-8 text-gray-400">
                  <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <div>No members found</div>
                </div>
              )}
              {groupMembers.map((m, index) => (
                <motion.div 
                  key={m.id}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="p-4 bg-white/5 rounded-xl border border-white/5 hover:border-white/10 transition-all duration-300 group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold text-sm">
                      {(m.displayName || m.name || m.id).charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-white truncate">{m.displayName || m.name || m.id}</div>
                      <div className="text-xs text-gray-400 truncate">{m.email || m.id}</div>
                    </div>
                    {m.online && (
                      <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                    )}
                  </div>
                </motion.div>
              ))}
            </div>

            <div className="mt-6 space-y-3">
              <button 
                onClick={() => { showToast('Manage group (demo)', 'info') }} 
                className="w-full p-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 transition-all duration-300 hover:scale-105 group"
              >
                <div className="flex items-center gap-3">
                  <Settings className="w-5 h-5 text-gray-400 group-hover:text-white" />
                  <span className="font-medium">Manage Group</span>
                </div>
              </button>
              
              <button 
                onClick={() => { showToast('Leave group (demo)', 'warning') }} 
                className="w-full p-4 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 transition-all duration-300 hover:scale-105 group"
              >
                <div className="flex items-center gap-3">
                  <LogOut className="w-5 h-5" />
                  <span className="font-medium">Leave Group</span>
                </div>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Background Customization Modal */}
      <AnimatePresence>
        {showBackgroundModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[120] p-4"
            onClick={() => setShowBackgroundModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-slate-900 rounded-3xl p-4 sm:p-6 max-w-md w-full border border-white/10 shadow-2xl max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-4 sm:mb-6">
                <h3 className="text-lg sm:text-xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                  Chat Background
                </h3>
                <button
                  onClick={() => setShowBackgroundModal(false)}
                  className="p-2 hover:bg-white/10 rounded-xl transition-all"
                >
                  <X className="w-5 h-5 text-white" />
                </button>
              </div>

              <div className="space-y-4 sm:space-y-6">
                {/* Wallpaper Type Tabs */}
                <div className="flex gap-2 p-1 bg-white/5 rounded-xl overflow-x-auto">
                  {['none', 'solid', 'gradient', 'image'].map((type) => (
                    <button
                      key={type}
                      onClick={() => setWallpaperType(type)}
                      className={`flex-1 min-w-[70px] py-2 px-3 rounded-lg text-xs sm:text-sm font-medium transition-all whitespace-nowrap ${
                        wallpaperType === type
                          ? 'bg-purple-500 text-white'
                          : 'text-gray-400 hover:text-white hover:bg-white/5'
                      }`}
                    >
                      {type.charAt(0).toUpperCase() + type.slice(1)}
                    </button>
                  ))}
                </div>

                {/* Solid Color Picker */}
                {wallpaperType === 'solid' && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-4"
                  >
                    <label className="block text-sm font-medium text-gray-300">Solid Color</label>
                    <div className="grid grid-cols-4 gap-3">
                      {['#1e293b', '#0f172a', '#18181b', '#27272a', '#374151', '#1f2937', '#1e3a8a', '#312e81', '#581c87', '#701a75', '#831843', '#7f1d1d'].map((color) => (
                        <button
                          key={color}
                          onClick={() => setWallpaperColor(color)}
                          className={`w-full aspect-square rounded-xl transition-all hover:scale-110 ${
                            wallpaperColor === color ? 'ring-2 ring-white ring-offset-2 ring-offset-slate-900' : ''
                          }`}
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </div>
                    <input
                      type="color"
                      value={wallpaperColor}
                      onChange={(e) => setWallpaperColor(e.target.value)}
                      className="w-full h-12 rounded-xl cursor-pointer"
                    />
                  </motion.div>
                )}

                {/* Gradient Picker */}
                {wallpaperType === 'gradient' && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-4"
                  >
                    <label className="block text-sm font-medium text-gray-300">Gradient</label>
                    <div className="grid grid-cols-2 gap-3">
                      {[
                        'from-purple-900 to-blue-900',
                        'from-pink-900 to-purple-900',
                        'from-blue-900 to-cyan-900',
                        'from-green-900 to-teal-900',
                        'from-orange-900 to-red-900',
                        'from-slate-900 to-gray-900'
                      ].map((gradient) => (
                        <button
                          key={gradient}
                          onClick={() => setWallpaperGradient(gradient)}
                          className={`w-full h-16 rounded-xl bg-gradient-to-br ${gradient} transition-all hover:scale-105 ${
                            wallpaperGradient === gradient ? 'ring-2 ring-white ring-offset-2 ring-offset-slate-900' : ''
                          }`}
                        />
                      ))}
                    </div>
                  </motion.div>
                )}

                {/* Image URL Input */}
                {wallpaperType === 'image' && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-4"
                  >
                    <label className="block text-sm font-medium text-gray-300">Image URL</label>
                    <input
                      type="text"
                      value={wallpaperImage}
                      onChange={(e) => setWallpaperImage(e.target.value)}
                      placeholder="https://example.com/image.jpg"
                      className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        'https://images.unsplash.com/photo-1579546929518-9e396f3cc809',
                        'https://images.unsplash.com/photo-1557683316-973673baf926',
                        'https://images.unsplash.com/photo-1558618666-fcd25c85cd64'
                      ].map((url) => (
                        <button
                          key={url}
                          onClick={() => setWallpaperImage(url)}
                          className="aspect-square rounded-xl bg-cover bg-center hover:scale-105 transition-all border-2 border-white/10 hover:border-white/30"
                          style={{ backgroundImage: `url(${url})` }}
                        />
                      ))}
                    </div>
                  </motion.div>
                )}

                {/* Blur Amount */}
                {wallpaperType !== 'none' && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-3"
                  >
                    <label className="block text-sm font-medium text-gray-300">
                      Blur Amount: {blurAmount}px
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="20"
                      value={blurAmount}
                      onChange={(e) => setBlurAmount(parseInt(e.target.value))}
                      className="w-full accent-purple-500"
                    />
                  </motion.div>
                )}

                {/* Apply Button */}
                <button
                  onClick={() => {
                    setShowBackgroundModal(false)
                    showToast('Background applied', 'success')
                  }}
                  className="w-full py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-medium rounded-xl hover:from-purple-600 hover:to-pink-600 transition-all"
                >
                  Apply Background
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* User Profile Modal */}
      <UserProfileModal
        open={showUserProfile}
        onClose={() => setShowUserProfile(false)}
        userId={otherUser?.id || chatMeta?.participants?.find(p => p !== user?.uid)}
        chatId={chatId}
        onAction={async (action) => {
          switch (action) {
            case 'message':
              // Already in chat
              break
            case 'voiceCall':
              if (!user?.uid || !otherUser?.id) return
              startCall(otherUser.id, otherUser.displayName || 'User', false)
              break
            case 'videoCall':
              if (!user?.uid || !otherUser?.id) return
              startCall(otherUser.id, otherUser.displayName || 'User', true)
              break
            case 'mute':
              if (!user?.uid) return
              try {
                const nowMuted = await toggleMutedChat(chatId, user.uid)
                setMuted(nowMuted)
                showToast(nowMuted ? 'Chat muted' : 'Chat unmuted', 'success')
              } catch (e) {
                showToast('Failed to mute chat', 'error')
              }
              break
            case 'clear':
              const ok = await confirm('Clear all messages? This cannot be undone.', 'Clear Chat')
              if (ok) {
                try {
                  await clearChatMessages(chatId)
                  setMessages([])
                  showToast('Chat cleared', 'success')
                } catch (e) {
                  showToast('Failed to clear chat', 'error')
                }
              }
              break
            case 'block':
              showToast('Block user feature coming soon', 'info')
              break
            case 'report':
              showToast('Report user feature coming soon', 'info')
              break
            default:
              break
          }
        }}
      />
    </div>
  )
}