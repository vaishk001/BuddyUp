import React, { useState, useEffect, useRef } from 'react'
import Lightbox from '../Lightbox/Lightbox'
import ForwardModal from '../ForwardModal/ForwardModal'
import VoiceMessagePlayer from './VoiceMessagePlayer'
import { useAuth } from '../../contexts/AuthContext'
import { useUI } from '../../contexts/UIContext'
import { deleteMessage, editMessage, deleteMessageForMe, toggleStarMessage } from '../../services/firestore'
import { toggleReaction } from '../../services/firestore'
import { motion, AnimatePresence } from 'framer-motion'
import { CheckCheck, Check, SmilePlus, MoreVertical, Reply, Forward, Copy, Trash2, Edit3, Save, X, Star } from 'lucide-react'

export default function MessageBubble({ message }) {
  const { user } = useAuth()
  const { showToast, confirm } = useUI()
  const [showReactions, setShowReactions] = useState(false)
  const [showMenu, setShowMenu] = useState(false)
  const [isHovered, setIsHovered] = useState(false)
  const [showForwardModal, setShowForwardModal] = useState(false)
  const [longPressTimer, setLongPressTimer] = useState(null)
  const [pressPosition, setPressPosition] = useState({ x: 0, y: 0 })
  const [isEditing, setIsEditing] = useState(false)
  const [editText, setEditText] = useState('')
  const editInputRef = useRef(null)
  const [canEdit, setCanEdit] = useState(false)
  const [isStarred, setIsStarred] = useState(false)

  // Check if message is starred by current user
  useEffect(() => {
    if (!message.starred || !user?.uid) {
      setIsStarred(false)
      return
    }
    setIsStarred(message.starred.includes(user.uid))
  }, [message.starred, user])

  // Check if message can be edited (within 15 minutes)
  useEffect(() => {
    if (!message.fromMe || !message.createdAt) {
      setCanEdit(false)
      return
    }
    
    const messageTime = message.createdAt?.toDate?.() || new Date(message.createdAt)
    const now = new Date()
    const diffMinutes = (now - messageTime) / (1000 * 60)
    setCanEdit(diffMinutes < 15)
  }, [message])

  // Focus input when editing starts
  useEffect(() => {
    if (isEditing && editInputRef.current) {
      editInputRef.current.focus()
      editInputRef.current.select()
    }
  }, [isEditing])

  const statusIcon = (status) => {
    switch (status) {
      case 'sent':
        return <Check className="w-3 h-3 text-gray-400" />
      case 'delivered':
        return <CheckCheck className="w-3 h-3 text-gray-400" />
      case 'read':
        return <CheckCheck className="w-3 h-3 text-blue-400" />
      default:
        return <Check className="w-3 h-3 text-gray-400" />
    }
  }

  const reactions = ['👍', '❤️', '😂', '😮', '😢', '🔥', '👎', '🎉']

  const handleReaction = async (emoji) => {
    try {
      if (!message || !message.id || !message.chatId) {
        console.warn('message or chatId missing for reaction')
        setShowReactions(false)
        return
      }
      const uid = user?.uid || 'local'
      await toggleReaction(message.chatId, message.id, emoji, uid)
      setShowReactions(false)
    } catch (e) {
      console.error('toggleReaction failed', e)
      showToast('Failed to add reaction', 'error')
      setShowReactions(false)
    }
  }

  const handleLongPressStart = (e) => {
    e.preventDefault()
    const touch = e.touches?.[0] || e
    setPressPosition({ x: touch.clientX, y: touch.clientY })
    
    const timer = setTimeout(() => {
      setShowReactions(true)
      setShowMenu(false)
      // Haptic feedback if available
      if (navigator.vibrate) {
        navigator.vibrate(50)
      }
    }, 500) // 500ms long press
    
    setLongPressTimer(timer)
  }

  const handleLongPressEnd = () => {
    if (longPressTimer) {
      clearTimeout(longPressTimer)
      setLongPressTimer(null)
    }
  }

  const handleQuickReaction = async (emoji) => {
    await handleReaction(emoji)
  }

  const handleMenuAction = (action) => {
    switch (action) {
      case 'edit':
        if (canEdit && message.text && typeof message.text === 'string') {
          setEditText(message.text)
          setIsEditing(true)
          setShowMenu(false)
          setTimeout(() => editInputRef.current?.focus(), 100)
        }
        break
      case 'reply':
        // emit a global event so the ChatWindow can enter reply-mode
        try {
          window.dispatchEvent(new CustomEvent('chat:reply', { detail: { message } }))
        } catch (e) {
          console.log('Reply to message:', message.id)
        }
        break
      case 'forward':
        // Open forward modal to pick target chat/user
        setShowForwardModal(true)
        break
      case 'copy':
        try {
          let textToCopy = ''
          if (message.type && (message.url || message.mediaUrl)) textToCopy = message.url || message.mediaUrl
          else if (message.text && typeof message.text === 'string') textToCopy = message.text
          else if (message.text && typeof message.text === 'object') textToCopy = JSON.stringify(message.text)
          navigator.clipboard.writeText(textToCopy)
          showToast('Copied to clipboard', 'success')
        } catch (e) {
          console.error('copy failed', e)
        }
        break
      case 'delete':
        handleDeleteMessage()
        break
      case 'deleteForMe':
        handleDeleteForMe()
        break
      case 'star':
        handleStarMessage()
        break
      default:
        break
    }
    setShowMenu(false)
  }

  const handleStarMessage = async () => {
    if (!user?.uid || !message.chatId || !message.id) return
    try {
      const nowStarred = await toggleStarMessage(message.chatId, message.id, user.uid)
      setIsStarred(nowStarred)
      showToast(nowStarred ? 'Message starred' : 'Message unstarred', 'success')
    } catch (e) {
      console.error('toggleStarMessage failed', e)
      showToast('Failed to star message', 'error')
    }
  }

  const handleSaveEdit = async () => {
    if (!editText.trim() || editText === message.text) {
      setIsEditing(false)
      return
    }
    
    try {
      await editMessage(message.chatId, message.id, editText.trim())
      showToast('Message edited', 'success')
      setIsEditing(false)
    } catch (e) {
      console.error('Edit failed', e)
      showToast('Failed to edit message', 'error')
    }
  }

  const handleCancelEdit = () => {
    setIsEditing(false)
    setEditText('')
  }

  const handleDeleteMessage = async () => {
    try {
      const ok = await confirm(
        'Delete this message for everyone? This cannot be undone.',
        'Delete for Everyone'
      )
      if (!ok) return
      
      if (!message.chatId || !message.id) {
        showToast('Missing chat or message id', 'error')
        return
      }
      
      await deleteMessage(message.chatId, message.id)
      showToast('Message deleted for everyone', 'success')
    } catch (e) {
      console.error('Delete failed', e)
      showToast('Failed to delete message', 'error')
    }
  }

  const handleDeleteForMe = async () => {
    try {
      const ok = await confirm(
        'Delete this message for you? Others will still see it.',
        'Delete for Me'
      )
      if (!ok) return
      
      if (!message.chatId || !message.id) {
        showToast('Missing chat or message id', 'error')
        return
      }
      
      await deleteMessageForMe(message.chatId, message.id, user?.uid)
      showToast('Message deleted for you', 'success')
    } catch (e) {
      console.error('Delete for me failed', e)
      showToast('Failed to delete message', 'error')
    }
  }

  const [mediaLoading, setMediaLoading] = useState(true)
  const [mediaError, setMediaError] = useState(false)
  const [showLightbox, setShowLightbox] = useState(false)

  // Precompute mediaUrl and msgType so they are available to Lightbox and render logic
  const msgType = message.type
  const mediaUrl = message.url || message.mediaUrl || (message.text && typeof message.text === 'object' && (message.text.url || message.text.mediaUrl))

  return (
    <div 
      className="relative group max-w-xl max-w-[90vw]"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => {
        setIsHovered(false)
        setShowReactions(false)
      }}
      onTouchStart={handleLongPressStart}
      onTouchEnd={handleLongPressEnd}
      onTouchMove={handleLongPressEnd}
      onContextMenu={(e) => {
        e.preventDefault()
        setShowReactions(true)
        setShowMenu(false)
      }}
    >
      <motion.div
        className={`relative p-3 sm:p-4 rounded-2xl shadow-sm border ${
          message.fromMe 
            ? 'bg-[var(--accent-color,#4f46e5)] text-white rounded-br-[4px] border-transparent' 
            : 'bg-slate-800/95 text-slate-100 rounded-bl-[4px] border-white/5 backdrop-blur-md'
        }`}
      >
    {/* Message Content: support text, stickers/GIFs, images and video payloads */}
        {isEditing ? (
          /* Edit Mode UI */
          <div className="space-y-3">
            <textarea
              ref={editInputRef}
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  handleSaveEdit()
                } else if (e.key === 'Escape') {
                  handleCancelEdit()
                }
              }}
              className="w-full p-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400/50 resize-none"
              rows={3}
              placeholder="Edit message..."
            />
            <div className="flex gap-2 justify-end">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleCancelEdit}
                className="px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-2"
              >
                <X className="w-4 h-4" />
                Cancel
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleSaveEdit}
                disabled={!editText.trim() || editText === message.text}
                className="px-4 py-2 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-500 disabled:cursor-not-allowed rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-2"
              >
                <Save className="w-4 h-4" />
                Save
              </motion.button>
            </div>
          </div>
        ) : (
          <div className="flex flex-wrap items-end gap-2">
            <div className="flex-1 whitespace-pre-wrap break-all overflow-hidden text-sm leading-relaxed">
          {(() => {
            // use precomputed msgType and mediaUrl
            
            if (msgType === 'voice' || message.audioUrl) {
              return <VoiceMessagePlayer audioUrl={message.audioUrl} />
            }
            
            if (msgType === 'video' || (mediaUrl && /\.(mp4|webm|ogg)$/i.test(mediaUrl))) {
              return (
                <div className="w-full max-w-lg rounded overflow-hidden bg-black/30">
                  {mediaLoading && (
                    <div className="w-full h-64 flex items-center justify-center">
                      <div className="loader" aria-hidden />
                    </div>
                  )}
                  <video
                    src={mediaUrl}
                    controls
                    className="w-full h-64 object-contain cursor-pointer"
                    onLoadedData={() => setMediaLoading(false)}
                    onError={() => { setMediaLoading(false); setMediaError(true) }}
                    onClick={() => setShowLightbox(true)}
                  />
                  {mediaError && <div className="text-sm text-red-400 p-2">Failed to load video</div>}
                </div>
              )
            }

            if (msgType === 'sticker' || msgType === 'gif' || (mediaUrl && /\.(gif)$/i.test(mediaUrl))) {
              return (
                <div className="w-48 h-48 rounded overflow-hidden bg-black/10">
                  {mediaLoading && (
                    <div className="w-full h-full flex items-center justify-center">
                      <div className="loader" aria-hidden />
                    </div>
                  )}
                  <img
                    src={mediaUrl}
                    alt="sticker"
                    className="w-full h-full object-contain cursor-zoom-in"
                    onLoad={() => setMediaLoading(false)}
                    onError={() => { setMediaLoading(false); setMediaError(true) }}
                    onClick={() => setShowLightbox(true)}
                  />
                  {mediaError && <div className="text-sm text-red-400 p-2">Failed to load image</div>}
                </div>
              )
            }

            if (msgType === 'image' || (mediaUrl && /\.(jpg|jpeg|png|webp)$/i.test(mediaUrl))) {
              return (
                <div className="w-full max-w-md rounded overflow-hidden bg-black/10">
                  {mediaLoading && (
                    <div className="w-full h-56 flex items-center justify-center">
                      <div className="loader" aria-hidden />
                    </div>
                  )}
                  <img
                    src={mediaUrl}
                    alt="image"
                    className="w-full h-56 object-contain"
                    onLoad={() => setMediaLoading(false)}
                    onError={() => { setMediaLoading(false); setMediaError(true) }}
                  />
                  {mediaError && <div className="text-sm text-red-400 p-2">Failed to load image</div>}
                </div>
              )
            }

            // If message.text itself is an object (legacy payload) and not media
            if (message.text && typeof message.text === 'object') {
              return <pre className="text-xs text-gray-300">{JSON.stringify(message.text)}</pre>
            }

            // default: plain text
            return message.text
          })()}
            </div>
          
          {/* Time and Status - inline with text */}
          <span className="flex items-center gap-1.5 text-xs opacity-70 whitespace-nowrap shrink-0">
            <span>{message.time}</span>
            {message.edited && (
              <span className="flex items-center gap-0.5 opacity-60 italic">
                <Edit3 className="w-3 h-3" />
                <span>edited</span>
              </span>
            )}
            {message.fromMe && statusIcon(message.status)}
          </span>
          </div>
        )}
          {/* Lightbox modal */}
          <Lightbox open={showLightbox} onClose={() => setShowLightbox(false)} src={mediaUrl} type={message.type} />

        {/* Enhanced Reactions Display */}
        {message.reactions && Object.keys(message.reactions).length > 0 && (
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="absolute -bottom-3 left-0 flex gap-1 z-10"
          >
            {Object.entries(message.reactions).map(([emoji, users]) => {
              const isMyReaction = users.includes(user?.uid)
              return (
                <motion.button
                  key={emoji}
                  whileHover={{ scale: 1.15, y: -2 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => handleQuickReaction(emoji)}
                  className={`px-2.5 py-1 rounded-full text-sm flex items-center gap-1.5 border backdrop-blur-md transition-all duration-200 shadow-lg ${
                    isMyReaction
                      ? 'bg-blue-500/30 border-blue-400/50 ring-1 ring-blue-400/30'
                      : 'bg-slate-800/90 border-white/20 hover:border-white/40'
                  }`}
                  title={`${users.length} reaction${users.length > 1 ? 's' : ''}`}
                >
                  <span className="text-base leading-none">{emoji}</span>
                  {users.length > 1 && (
                    <span className={`text-xs font-semibold ${
                      isMyReaction ? 'text-blue-200' : 'text-gray-300'
                    }`}>
                      {users.length}
                    </span>
                  )}
                </motion.button>
              )
            })}
          </motion.div>
        )}

        {/* Enhanced Hover Actions */}
        <AnimatePresence>
          {(isHovered || showMenu) && !showReactions && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.8, y: 10 }}
              transition={{ type: "spring", stiffness: 400, damping: 25 }}
              className={`absolute -top-11 ${message.fromMe ? 'right-0' : 'left-0'} flex gap-1.5 z-30`}
            >
              {/* Quick Reaction Shortcuts */}
              {['❤️', '👍', '😂'].map((emoji, index) => (
                <motion.button
                  key={emoji}
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.05 }}
                  whileHover={{ scale: 1.2, y: -2 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => handleReaction(emoji)}
                  className="p-1.5 bg-slate-800/95 hover:bg-slate-700 rounded-full border border-white/10 transition-all duration-200 shadow-lg backdrop-blur-md"
                  title={`React with ${emoji}`}
                >
                  <span className="text-sm leading-none block">{emoji}</span>
                </motion.button>
              ))}
              
              {/* More reactions button */}
              <motion.button
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.15 }}
                whileHover={{ scale: 1.1, rotate: 15 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => setShowReactions(true)}
                className="p-2 bg-slate-800/95 hover:bg-slate-700 rounded-full border border-white/10 transition-all duration-200 shadow-lg backdrop-blur-md"
              >
                <SmilePlus className="w-4 h-4 text-gray-300" />
              </motion.button>
              
              <motion.button
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2 }}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => setShowMenu(!showMenu)}
                className="p-2 bg-slate-800/95 hover:bg-slate-700 rounded-full border border-white/10 transition-all duration-200 shadow-lg backdrop-blur-md"
              >
                <MoreVertical className="w-4 h-4 text-gray-300" />
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Enhanced Reaction Picker - WhatsApp/Instagram Style */}
      <AnimatePresence>
        {showReactions && (
          <>
            {/* Backdrop to close on click outside */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40"
              onClick={() => setShowReactions(false)}
            />
            
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.9 }}
              transition={{ 
                type: "spring", 
                damping: 25, 
                stiffness: 300 
              }}
              className={`absolute ${
                message.fromMe 
                  ? 'right-0' 
                  : 'left-0'
              } -top-16 z-50`}
              style={{
                maxWidth: 'min(90vw, 400px)'
              }}
            >
              <div className="bg-gradient-to-br from-slate-800 via-slate-800 to-slate-900 backdrop-blur-xl border border-white/20 rounded-2xl p-3 shadow-2xl ring-1 ring-white/10">
                <div className="flex flex-wrap gap-2 items-center justify-center max-w-sm">
                  {reactions.map((emoji, index) => {
                    const isActive = message.reactions?.[emoji]?.includes(user?.uid)
                    return (
                      <motion.button
                        key={emoji}
                        initial={{ opacity: 0, scale: 0.5, y: 10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        transition={{ 
                          delay: index * 0.03,
                          type: "spring",
                          stiffness: 400,
                          damping: 20
                        }}
                        whileHover={{ 
                          scale: 1.3, 
                          y: -8,
                          rotate: [-5, 5, -5, 0],
                          transition: { duration: 0.3 }
                        }}
                        whileTap={{ scale: 0.9 }}
                        className={`relative p-3 rounded-xl transition-all duration-200 ${
                          isActive 
                            ? 'bg-blue-500/30 ring-2 ring-blue-400/50' 
                            : 'hover:bg-white/10'
                        }`}
                        onClick={() => handleReaction(emoji)}
                      >
                        <span className="text-2xl leading-none block">{emoji}</span>
                        {isActive && (
                          <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            className="absolute -top-1 -right-1 w-3 h-3 bg-blue-500 rounded-full border-2 border-slate-800"
                          />
                        )}
                      </motion.button>
                    )
                  })}
                  
                  {/* Add more reactions button */}
                  <motion.button
                    initial={{ opacity: 0, scale: 0.5 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: reactions.length * 0.03 }}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    className="p-2.5 rounded-xl hover:bg-white/10 transition-all duration-200 ml-1 border-l border-white/10"
                  >
                    <SmilePlus className="w-5 h-5 text-gray-300" />
                  </motion.button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Enhanced Message Menu */}
      <AnimatePresence>
        {showMenu && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.8 }}
            className={`absolute -top-2 ${message.fromMe ? 'right-0' : 'left-0'} bg-slate-800/95 backdrop-blur-xl border border-white/10 rounded-xl p-1 shadow-2xl z-50 w-44 max-w-[80vw]`}
          >
            {message.fromMe && canEdit && message.text && typeof message.text === 'string' && (
              <button 
                onClick={() => handleMenuAction('edit')}
                className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-blue-500/20 text-blue-400 text-sm transition-colors"
              >
                <Edit3 className="w-4 h-4" />
                Edit Message
              </button>
            )}
            <button 
              onClick={() => handleMenuAction('reply')}
              className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-white/10 text-sm transition-colors"
            >
              <Reply className="w-4 h-4" />
              Reply
            </button>
            <button 
              onClick={() => handleMenuAction('forward')}
              className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-white/10 text-sm transition-colors"
            >
              <Forward className="w-4 h-4" />
              Forward
            </button>
            <button 
              onClick={() => handleMenuAction('copy')}
              className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-white/10 text-sm transition-colors"
            >
              <Copy className="w-4 h-4" />
              Copy
            </button>
            <button 
              onClick={() => handleMenuAction('star')}
              className={`w-full flex items-center gap-3 p-2 rounded-lg hover:bg-white/10 text-sm transition-colors ${isStarred ? 'text-yellow-400' : ''}`}
            >
              <Star className={`w-4 h-4 ${isStarred ? 'fill-yellow-400' : ''}`} />
              {isStarred ? 'Unstar' : 'Star Message'}
            </button>
            <div className="h-px bg-white/10 my-1" />
            {message.fromMe ? (
              <button 
                onClick={() => handleMenuAction('delete')}
                className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-red-500/20 text-red-400 text-sm transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                Delete for Everyone
              </button>
            ) : (
              <button 
                onClick={() => handleMenuAction('deleteForMe')}
                className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-red-500/20 text-red-400 text-sm transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                Delete for Me
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Forward Modal */}
      <ForwardModal open={showForwardModal} onClose={() => setShowForwardModal(false)} message={message} />
    </div>
  )
}