import React, { useState } from 'react'
import Lightbox from '../Lightbox/Lightbox'
import ForwardModal from '../ForwardModal/ForwardModal'
import { useAuth } from '../../contexts/AuthContext'
import { useUI } from '../../contexts/UIContext'
import { deleteMessage } from '../../services/firestore'
import { toggleReaction } from '../../services/firestore'
import { motion, AnimatePresence } from 'framer-motion'
import { CheckCheck, Check, SmilePlus, MoreVertical, Reply, Forward, Copy, Trash2, Download, Share, Eye } from 'lucide-react'

export default function MessageBubble({ message }) {
  const { user } = useAuth()
  const { showToast, confirm } = useUI()
  const [showReactions, setShowReactions] = useState(false)
  const [showMenu, setShowMenu] = useState(false)
  const [isHovered, setIsHovered] = useState(false)
  const [showForwardModal, setShowForwardModal] = useState(false)
  const [mediaLoading, setMediaLoading] = useState(true)
  const [mediaError, setMediaError] = useState(false)
  const [showLightbox, setShowLightbox] = useState(false)

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

  const reactions = ['👍', '❤️', '😂', '😮', '😢', '👏', '🔥', '🎉']

  const handleReaction = async (emoji) => {
    try {
      if (!message || !message.id || !message.chatId) {
        console.warn('message or chatId missing for reaction')
        setShowReactions(false)
        return
      }
      const uid = user?.uid || 'local'
      await toggleReaction(message.chatId, message.id, emoji, uid)
    } catch (e) {
      console.error('toggleReaction failed', e)
    } finally {
      setShowReactions(false)
    }
  }

  const handleMenuAction = (action) => {
    switch (action) {
      case 'reply':
        try {
          window.dispatchEvent(new CustomEvent('chat:reply', { detail: { message } }))
        } catch (e) {
          console.log('Reply to message:', message.id)
        }
        break
      case 'forward':
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
      case 'download':
        try {
          const link = document.createElement('a')
          link.href = message.url || message.mediaUrl
          link.download = `download-${Date.now()}`
          link.click()
          showToast('Download started', 'success')
        } catch (e) {
          console.error('download failed', e)
          showToast('Download failed', 'error')
        }
        break
      case 'delete':
        ;(async () => {
          try {
            const ok = await confirm('Delete this message? This cannot be undone.', 'Delete message')
            if (!ok) return
            if (!message.chatId || !message.id) {
              showToast('Missing chat or message id', 'error')
              return
            }
            await deleteMessage(message.chatId, message.id)
            showToast('Message deleted', 'success')
          } catch (e) {
            console.error('delete failed', e)
            showToast('Failed to delete message', 'error')
          }
        })()
        break
    }
    setShowMenu(false)
  }

  const msgType = message.type
  const mediaUrl = message.url || message.mediaUrl || (message.text && typeof message.text === 'object' && (message.text.url || message.text.mediaUrl))

  const renderMediaContent = () => {
    const isMedia = msgType === 'video' || msgType === 'image' || msgType === 'sticker' || msgType === 'gif'
    
    if (isMedia) {
      return (
        <motion.div 
          className="relative group/media overflow-hidden rounded-2xl"
          whileHover={{ scale: 1.02 }}
          transition={{ duration: 0.2 }}
        >
          {/* Enhanced Media Overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover/media:opacity-100 transition-opacity duration-300 z-10" />
          
          {/* Enhanced Action Buttons */}
          <div className="absolute top-3 right-3 flex gap-1 opacity-0 group-hover/media:opacity-100 transition-opacity duration-300 z-20">
            <button
              onClick={() => setShowLightbox(true)}
              className="p-2 bg-black/50 hover:bg-black/70 rounded-lg text-white transition-all duration-200 hover:scale-110"
            >
              <Eye className="w-3 h-3" />
            </button>
            <button
              onClick={() => handleMenuAction('download')}
              className="p-2 bg-black/50 hover:bg-black/70 rounded-lg text-white transition-all duration-200 hover:scale-110"
            >
              <Download className="w-3 h-3" />
            </button>
          </div>

          {/* Media Content */}
          {msgType === 'video' || (mediaUrl && /\.(mp4|webm|ogg)$/i.test(mediaUrl)) ? (
            <div className="w-full max-w-lg rounded-2xl overflow-hidden bg-black/30">
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
          ) : (
            <div className={`${msgType === 'sticker' || msgType === 'gif' ? 'w-48 h-48' : 'w-full max-w-md'} rounded-2xl overflow-hidden bg-black/10`}>
              {mediaLoading && (
                <div className="w-full h-full flex items-center justify-center">
                  <div className="loader" aria-hidden />
                </div>
              )}
              <img
                src={mediaUrl}
                alt={msgType}
                className={`w-full h-full object-contain cursor-zoom-in ${msgType === 'sticker' ? '' : 'max-h-96'}`}
                onLoad={() => setMediaLoading(false)}
                onError={() => { setMediaLoading(false); setMediaError(true) }}
                onClick={() => setShowLightbox(true)}
              />
              {mediaError && <div className="text-sm text-red-400 p-2">Failed to load image</div>}
            </div>
          )}
        </motion.div>
      )
    }

    // If message.text itself is an object (legacy payload) and not media
    if (message.text && typeof message.text === 'object') {
      return <pre className="text-xs text-gray-300 bg-white/5 p-3 rounded-xl">{JSON.stringify(message.text, null, 2)}</pre>
    }

    // default: plain text with enhanced styling
    return (
      <motion.div 
        className="whitespace-pre-wrap text-sm leading-relaxed"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        {message.text}
      </motion.div>
    )
  }

  return (
    <div 
      className="relative group max-w-xl"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <motion.div
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.99 }}
        className={`relative p-4 rounded-3xl backdrop-blur-sm border shadow-lg ${
          message.fromMe 
            ? 'bg-gradient-to-br from-blue-500 to-purple-600 text-white rounded-br-md border-blue-500/30' 
            : 'bg-white/10 text-white rounded-bl-md border-white/10'
        }`}
      >
        {/* Message Content */}
        <div className="mb-2">
          {renderMediaContent()}
        </div>

        {/* Lightbox modal */}
        <Lightbox open={showLightbox} onClose={() => setShowLightbox(false)} src={mediaUrl} type={message.type} />

        {/* Message Footer */}
        <div className="flex items-center justify-between mt-2">
          <div className="text-xs opacity-70 flex items-center gap-2">
            {message.time}
          </div>
          <div className="flex items-center gap-1">
            {statusIcon(message.status)}
          </div>
        </div>

        {/* Enhanced Reactions */}
        {message.reactions && Object.keys(message.reactions).length > 0 && (
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className={`flex gap-1 mt-2 ${message.fromMe ? 'justify-end' : 'justify-start'}`}
          >
            {Object.entries(message.reactions).map(([emoji, users]) => (
              <motion.div
                key={emoji}
                whileHover={{ scale: 1.1 }}
                className="bg-black/40 px-2 py-1 rounded-full text-xs flex items-center gap-1 border border-white/20 backdrop-blur-sm hover:bg-black/60 transition-colors duration-200 cursor-pointer"
                onClick={() => handleReaction(emoji)}
              >
                <span>{emoji}</span>
                {users.length > 1 && (
                  <span className="text-xs opacity-70">{users.length}</span>
                )}
              </motion.div>
            ))}
          </motion.div>
        )}

        {/* Enhanced Hover Actions */}
        <AnimatePresence>
          {(isHovered || showMenu) && !showReactions && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.8, y: 10 }}
              className={`absolute -top-8 ${message.fromMe ? 'left-0' : 'right-0'} flex gap-1`}
            >
              <button
                onClick={() => setShowReactions(true)}
                className="p-2 bg-slate-800 hover:bg-slate-700 rounded-full border border-white/10 transition-all duration-200 shadow-lg hover:scale-110"
              >
                <SmilePlus className="w-3 h-3 text-gray-300" />
              </button>
              <button
                onClick={() => setShowMenu(!showMenu)}
                className="p-2 bg-slate-800 hover:bg-slate-700 rounded-full border border-white/10 transition-all duration-200 shadow-lg hover:scale-110"
              >
                <MoreVertical className="w-3 h-3 text-gray-300" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Enhanced Reaction Picker */}
      <AnimatePresence>
        {showReactions && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.8 }}
            className={`absolute -top-12 ${message.fromMe ? 'left-0' : 'right-0'} bg-slate-800/95 backdrop-blur-xl border border-white/10 rounded-2xl p-3 shadow-2xl z-50`}
          >
            <div className="grid grid-cols-4 gap-1">
              {reactions.map((emoji) => (
                <motion.button
                  key={emoji}
                  whileHover={{ scale: 1.3 }}
                  whileTap={{ scale: 0.9 }}
                  className="p-2 transition-all duration-200 text-lg hover:bg-white/10 rounded-lg"
                  onClick={() => handleReaction(emoji)}
                >
                  {emoji}
                </motion.button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Enhanced Message Menu */}
      <AnimatePresence>
        {showMenu && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.8 }}
            className={`absolute -top-2 ${message.fromMe ? 'right-0' : 'left-0'} bg-slate-800/95 backdrop-blur-xl border border-white/10 rounded-2xl p-2 shadow-2xl z-50 w-48`}
          >
            {[
              { icon: Reply, label: 'Reply', action: 'reply' },
              { icon: Forward, label: 'Forward', action: 'forward' },
              { icon: Copy, label: 'Copy', action: 'copy' },
              ...(mediaUrl ? [{ icon: Download, label: 'Download', action: 'download' }] : []),
              { icon: Trash2, label: 'Delete', action: 'delete', destructive: true }
            ].map((item, index) => {
              const Icon = item.icon
              return (
                <motion.button
                  key={item.label}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  onClick={() => handleMenuAction(item.action)}
                  className={`w-full flex items-center gap-3 p-3 rounded-xl text-sm transition-all duration-200 group ${
                    item.destructive
                      ? 'hover:bg-red-500/20 text-red-400'
                      : 'hover:bg-white/10 text-white'
                  }`}
                >
                  <Icon className="w-4 h-4 group-hover:scale-110 transition-transform" />
                  <span>{item.label}</span>
                </motion.button>
              )
            })}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Forward Modal */}
      <ForwardModal open={showForwardModal} onClose={() => setShowForwardModal(false)} message={message} />
    </div>
  )
}