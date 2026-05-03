import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Smile, Paperclip, Mic, Image, Video, 
  Send, X, Camera, FileText, MapPin, 
  Gift, Music, Code, Zap, Sparkles,
  Plus, Minus
} from 'lucide-react';
import VoiceMessage from '../ChatWindow/VoiceMessage';
import EmojiPicker from '../EmojiPicker/EmojiPicker';
import { setTypingIndicator, setUserStatusFlags } from '../../services/firestore';
import { useAuth } from '../../contexts/AuthContext';

export default function MessageInput({ onSendMessage, chatId }) {
  const [message, setMessage] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showAttachmentMenu, setShowAttachmentMenu] = useState(false);
  const [showVoiceMessage, setShowVoiceMessage] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const textareaRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);
  const documentInputRef = useRef(null);
  const audioInputRef = useRef(null);
  const { user } = useAuth();

  const attachments = [
    { icon: Image, label: 'Photo & Video', color: 'text-green-400', description: 'Share images and videos' },
    { icon: Camera, label: 'Camera', color: 'text-blue-400', description: 'Take a photo' },
    { icon: FileText, label: 'Document', color: 'text-orange-400', description: 'Upload files' },
    { icon: Video, label: 'Video Call', color: 'text-purple-400', description: 'Start video call' },
    { icon: MapPin, label: 'Location', color: 'text-red-400', description: 'Share your location' },
    { icon: Gift, label: 'Gift', color: 'text-pink-400', description: 'Send a gift' },
    { icon: Music, label: 'Audio', color: 'text-yellow-400', description: 'Share music' },
    { icon: Code, label: 'Code', color: 'text-indigo-400', description: 'Share code snippet' },
  ];

  const quickReactions = ['👍', '❤️', '😂', '🎉', '🔥', '👏'];

  const handleSend = () => {
    if (message.trim()) {
      onSendMessage(message);
      setMessage('');
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
      // Clear typing indicator
      if (chatId && user?.uid) {
        setTypingIndicator(chatId, user.uid, false);
      }
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleTextareaChange = (e) => {
    setMessage(e.target.value);
    
    // Auto-resize textarea
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      // Allow taller expansion (was 120px cap)
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 200) + 'px';
    }

    // Set typing indicator
    if (chatId && user?.uid) {
      setTypingIndicator(chatId, user.uid, true);
      
      // Clear previous timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      
      // Set new timeout to clear typing after 3 seconds of inactivity
      typingTimeoutRef.current = setTimeout(() => {
        setTypingIndicator(chatId, user.uid, false);
      }, 3000);
    }
  };

  // Clear typing indicator on unmount
  useEffect(() => {
    return () => {
      if (chatId && user?.uid) {
        setTypingIndicator(chatId, user.uid, false);
      }
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, [chatId, user]);

  const handleQuickReaction = (reaction) => {
    onSendMessage(reaction);
  };

  // Handle Photo & Video Upload
  const handlePhotoVideoUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setIsUploading(true);
      setShowAttachmentMenu(false);
      
      const { uploadToCloudinary } = await import('../../utils/cloudinary');
      const result = await uploadToCloudinary(file, (progress) => {
        setUploadProgress(progress);
      });

      if (result.success) {
        const fileType = file.type.startsWith('video/') ? 'video' : 'image';
        onSendMessage({
          type: fileType,
          url: result.url,
          mediaUrl: result.url,
          fileName: file.name,
          fileSize: file.size
        });
      } else {
        alert('Upload failed: ' + result.error);
      }
    } catch (error) {
      console.error('Upload error:', error);
      alert('Failed to upload file');
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
      if (event.target) event.target.value = '';
    }
  };

  // Handle Camera Capture
  const handleCameraCapture = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setIsUploading(true);
      setShowAttachmentMenu(false);
      
      const { uploadToCloudinary } = await import('../../utils/cloudinary');
      const result = await uploadToCloudinary(file, (progress) => {
        setUploadProgress(progress);
      });

      if (result.success) {
        onSendMessage({
          type: 'image',
          url: result.url,
          mediaUrl: result.url,
          fileName: file.name,
          fileSize: file.size
        });
      } else {
        alert('Upload failed: ' + result.error);
      }
    } catch (error) {
      console.error('Camera capture error:', error);
      alert('Failed to capture photo');
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
      if (event.target) event.target.value = '';
    }
  };

  // Handle Document Upload
  const handleDocumentUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setIsUploading(true);
      setShowAttachmentMenu(false);
      
      const { uploadToCloudinary } = await import('../../utils/cloudinary');
      const result = await uploadToCloudinary(file, (progress) => {
        setUploadProgress(progress);
      });

      if (result.success) {
        onSendMessage({
          type: 'document',
          url: result.url,
          mediaUrl: result.url,
          fileName: file.name,
          fileSize: file.size,
          text: `📄 ${file.name}`
        });
      } else {
        alert('Upload failed: ' + result.error);
      }
    } catch (error) {
      console.error('Document upload error:', error);
      alert('Failed to upload document');
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
      if (event.target) event.target.value = '';
    }
  };

  // Handle Audio Upload
  const handleAudioUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setIsUploading(true);
      setShowAttachmentMenu(false);
      
      const { uploadToCloudinary } = await import('../../utils/cloudinary');
      const result = await uploadToCloudinary(file, (progress) => {
        setUploadProgress(progress);
      });

      if (result.success) {
        onSendMessage({
          type: 'audio',
          url: result.url,
          mediaUrl: result.url,
          fileName: file.name,
          fileSize: file.size,
          text: `🎵 ${file.name}`
        });
      } else {
        alert('Upload failed: ' + result.error);
      }
    } catch (error) {
      console.error('Audio upload error:', error);
      alert('Failed to upload audio');
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
      if (event.target) event.target.value = '';
    }
  };

  // Handle Location Share
  const handleLocationShare = () => {
    setShowAttachmentMenu(false);
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          onSendMessage({
            type: 'location',
            text: `📍 Location: ${latitude.toFixed(6)}, ${longitude.toFixed(6)}`,
            latitude,
            longitude,
            url: `https://www.google.com/maps?q=${latitude},${longitude}`
          });
        },
        (error) => {
          console.error('Location error:', error);
          alert('Unable to get location. Please enable location services.');
        }
      );
    } else {
      alert('Geolocation is not supported by your browser');
    }
  };

  // Handle Video Call
  const handleVideoCall = () => {
    setShowAttachmentMenu(false);
    onSendMessage({
      type: 'text',
      text: '📹 Video call started'
    });
    alert('Video call feature coming soon!');
  };

  // Handle Gift
  const handleGift = () => {
    setShowAttachmentMenu(false);
    const gifts = ['🎁', '🎉', '🎂', '🎈', '💝', '🌹', '🍰', '🎊'];
    const randomGift = gifts[Math.floor(Math.random() * gifts.length)];
    onSendMessage({
      type: 'text',
      text: `${randomGift} Sent you a gift!`
    });
  };

  // Handle Code Share
  const handleCodeShare = () => {
    setShowAttachmentMenu(false);
    const code = prompt('Enter your code snippet:');
    if (code) {
      onSendMessage({
        type: 'code',
        text: `\`\`\`\n${code}\n\`\`\``,
        code: code
      });
    }
  };

  const handleVoiceMessageToggle = () => {
    const next = !isRecording;
    setIsRecording(next);
    setShowVoiceMessage(!isRecording);
    if (chatId && user?.uid) {
      setUserStatusFlags(user.uid, { recording: next });
    }
  };

  if (showVoiceMessage) {
    return (
      <VoiceMessage
        onSend={(audioBlob) => {
          onSendMessage({ type: 'voice', blob: audioBlob });
          setShowVoiceMessage(false);
          setIsRecording(false);
          if (chatId && user?.uid) setUserStatusFlags(user.uid, { recording: false });
        }}
        onClose={() => {
          setShowVoiceMessage(false);
          setIsRecording(false);
          if (chatId && user?.uid) setUserStatusFlags(user.uid, { recording: false });
        }}
      />
    );
  }

  return (
    <div className="w-full p-2 sm:p-3 md:p-4 bg-slate-900/80 backdrop-blur-xl border-t border-white/10 relative">
      {/* Quick Reactions */}
      <AnimatePresence>
        {message.length === 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="flex gap-1.5 sm:gap-2 mb-2 sm:mb-3 overflow-x-auto scrollbar-thin"
          >
            {quickReactions.map((reaction, index) => (
              <motion.button
                key={reaction}
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.1 }}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => handleQuickReaction(reaction)}
                className="px-2 sm:px-3 py-1.5 sm:py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg sm:rounded-xl text-base sm:text-lg transition-all duration-200 hover:border-white/20"
              >
                {reaction}
              </motion.button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Emoji Picker as anchored dropdown */}
      <AnimatePresence>
        {showEmojiPicker && (
          <>
            {/* click-away overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40"
              onClick={() => setShowEmojiPicker(false)}
            />
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.98 }}
              className="absolute z-50 bottom-[64px] sm:bottom-[72px] md:bottom-[88px] left-1 sm:left-2 md:left-4"
            >
              <EmojiPicker
                onEmojiClick={(emoji) => {
                  setMessage(prev => prev + emoji.emoji);
                  setShowEmojiPicker(false);
                }}
                onClose={() => setShowEmojiPicker(false)}
              />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Enhanced Input Area */}
      <div className="flex items-end gap-3 w-full">
        {/* Enhanced Emoji Button */}
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={() => setShowEmojiPicker(!showEmojiPicker)}
          className={`p-3 rounded-2xl transition-all duration-300 backdrop-blur-sm flex-shrink-0 ${
            showEmojiPicker 
              ? 'bg-purple-500/20 border border-purple-500/30 text-purple-400' 
              : 'bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 hover:text-white'
          }`}
        >
          <Smile className="w-5 h-5" />
        </motion.button>

        {/* Enhanced Attachment Button */}
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={() => setShowAttachmentMenu(!showAttachmentMenu)}
          className={`p-3 rounded-2xl transition-all duration-300 backdrop-blur-sm flex-shrink-0 ${
            showAttachmentMenu 
              ? 'bg-blue-500/20 border border-blue-500/30 text-blue-400' 
              : 'bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 hover:text-white'
          }`}
        >
          <Paperclip className="w-5 h-5" />
        </motion.button>

        {/* Enhanced Text Input - Fully Expanded */}
        <div className="flex-1 relative" style={{ minWidth: '0', flexGrow: 1 }}>
          <motion.div
            className={`relative rounded-2xl border backdrop-blur-sm transition-all duration-300 w-full ${
              message ? 'border-purple-500/50 bg-purple-500/5' : 'border-white/10 bg-white/5'
            }`}
            whileFocus={{ scale: 1.01 }}
          >
            <textarea
              ref={textareaRef}
              value={message}
              onChange={handleTextareaChange}
              onKeyPress={handleKeyPress}
              placeholder="Type a message..."
              className="w-full px-5 py-3.5 bg-transparent border-none outline-none text-white placeholder-gray-400 resize-none max-h-32 scrollbar-thin"
              rows={1}
              style={{ height: 'auto', minWidth: '100%' }}
            />
            
            {/* Character Counter */}
            {/* Character Counter - Always visible when typing */}
            {message.length > 0 && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                className="absolute right-2 bottom-2"
              >
                <div className={`text-xs px-2.5 py-1 rounded-lg font-medium transition-all duration-300 ${
                  message.length > 800 
                    ? 'bg-red-500/20 text-red-400 border border-red-500/30 animate-pulse' 
                    : message.length > 500
                    ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
                    : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                }`}>
                  {message.length}/1000
                </div>
              </motion.div>
            )}
          </motion.div>
        </div>

        {/* Enhanced Action Buttons */}
        <div className="flex gap-2 flex-shrink-0">
          {message ? (
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={handleSend}
              className="p-3 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 rounded-2xl text-white shadow-lg transition-all duration-300 hover:shadow-purple-500/25"
            >
              <Send className="w-5 h-5" />
            </motion.button>
          ) : (
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={handleVoiceMessageToggle}
              className={`p-3 rounded-2xl transition-all duration-300 ${
                isRecording
                  ? 'bg-red-500/20 border border-red-500/30 text-red-400 animate-pulse'
                  : 'bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white shadow-lg'
              }`}
            >
              <Mic className="w-5 h-5" />
            </motion.button>
          )}
        </div>
      </div>

      {/* Upload Progress Indicator */}
      <AnimatePresence>
        {isUploading && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="mt-2 p-3 bg-blue-500/10 border border-blue-500/30 rounded-xl"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-blue-400 font-medium">Uploading...</span>
              <span className="text-sm text-blue-400 font-medium">{uploadProgress}%</span>
            </div>
            <div className="w-full bg-white/10 rounded-full h-2 overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${uploadProgress}%` }}
                className="h-full bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full"
                transition={{ duration: 0.3 }}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Enhanced Attachment Menu - Below Input */}
      <AnimatePresence>
        {showAttachmentMenu && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className="mt-3 p-4 bg-slate-800/95 backdrop-blur-xl rounded-2xl border border-white/10 shadow-2xl"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Paperclip className="w-5 h-5 text-purple-400" />
                <span className="text-white font-semibold">Send Files & Media</span>
              </div>
              <button
                onClick={() => setShowAttachmentMenu(false)}
                className="p-1 hover:bg-white/10 rounded-lg transition-colors"
              >
                <X className="w-4 h-4 text-gray-400" />
              </button>
            </div>
            
            <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
              {attachments.map((attachment, index) => {
                const Icon = attachment.icon;
                const getClickHandler = () => {
                  switch(attachment.label) {
                    case 'Photo & Video':
                      return () => fileInputRef.current?.click();
                    case 'Camera':
                      return () => cameraInputRef.current?.click();
                    case 'Document':
                      return () => documentInputRef.current?.click();
                    case 'Audio':
                      return () => audioInputRef.current?.click();
                    case 'Location':
                      return handleLocationShare;
                    case 'Video Call':
                      return handleVideoCall;
                    case 'Gift':
                      return handleGift;
                    case 'Code':
                      return handleCodeShare;
                    default:
                      return () => {};
                  }
                };
                return (
                  <motion.button
                    key={attachment.label}
                    initial={{ opacity: 0, scale: 0.8, x: -20 }}
                    animate={{ opacity: 1, scale: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    whileHover={{ scale: 1.05, y: -2 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={getClickHandler()}
                    className="flex flex-col items-center gap-2 p-3 min-w-[100px] bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-all duration-200 group"
                  >
                    <div className={`p-2 rounded-lg bg-white/5 group-hover:scale-110 transition-transform duration-200 ${attachment.color}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="text-center">
                      <div className="text-white text-xs font-medium whitespace-nowrap">{attachment.label}</div>
                      <div className="text-gray-400 text-[10px] mt-1 whitespace-nowrap">{attachment.description}</div>
                    </div>
                  </motion.button>
                );
              })}
            </div>
            
            {/* Hidden File Inputs */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,video/*"
              onChange={handlePhotoVideoUpload}
              className="hidden"
            />
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleCameraCapture}
              className="hidden"
            />
            <input
              ref={documentInputRef}
              type="file"
              accept=".pdf,.doc,.docx,.txt,.xls,.xlsx,.ppt,.pptx"
              onChange={handleDocumentUpload}
              className="hidden"
            />
            <input
              ref={audioInputRef}
              type="file"
              accept="audio/*,.mp3,.wav,.ogg"
              onChange={handleAudioUpload}
              className="hidden"
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Typing Indicators */}
      <AnimatePresence>
        {message.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="flex items-center gap-2 mt-2 text-xs text-gray-400"
          >
            <div className="flex gap-1">
              <motion.div
                animate={{ opacity: [0.3, 1, 0.3] }}
                transition={{ duration: 1.5, repeat: Infinity }}
                className="w-1 h-1 bg-gray-400 rounded-full"
              />
              <motion.div
                animate={{ opacity: [0.3, 1, 0.3] }}
                transition={{ duration: 1.5, repeat: Infinity, delay: 0.2 }}
                className="w-1 h-1 bg-gray-400 rounded-full"
              />
              <motion.div
                animate={{ opacity: [0.3, 1, 0.3] }}
                transition={{ duration: 1.5, repeat: Infinity, delay: 0.4 }}
                className="w-1 h-1 bg-gray-400 rounded-full"
              />
            </div>
            <span>Press Enter to send, Shift+Enter for new line</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}