import '../styles/modern-settings.css'
import React, { useEffect, useState } from 'react'
import Sidebar from '../components/Sidebar/Sidebar'
import { motion, AnimatePresence } from 'framer-motion'
import { uploadToCloudinary } from '../utils/cloudinary'
import { useAuth } from '../contexts/AuthContext'
import { doc, updateDoc, getDoc, arrayRemove, setDoc, onSnapshot } from 'firebase/firestore'
import { db } from '../firebase'
import { 
  ArrowLeft, 
  Image, 
  Settings as Cog, 
  Trash2, 
  User,
  Eye, 
  Palette, 
  Bell, 
  Shield, 
  Lock, 
  Globe, 
  MessageCircle,
  Volume2,
  Download,
  Languages,
  Smartphone,
  Check,
  Save,
  X
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useUI } from '../contexts/UIContext'

const ACCENT_COLORS = [
  { name: 'Blue', value: '#3b82f6', gradient: 'from-blue-500 to-cyan-500' },
  { name: 'Purple', value: '#8b5cf6', gradient: 'from-purple-500 to-pink-500' },
  { name: 'Teal', value: '#14b8a6', gradient: 'from-teal-500 to-green-500' },
  { name: 'Neon', value: '#06b6d4', gradient: 'from-cyan-500 to-blue-500' },
  { name: 'Pink', value: '#ec4899', gradient: 'from-pink-500 to-rose-500' },
  { name: 'Orange', value: '#f97316', gradient: 'from-orange-500 to-red-500' },
  { name: 'Emerald', value: '#10b981', gradient: 'from-emerald-500 to-green-500' },
  { name: 'Violet', value: '#8b5cf6', gradient: 'from-violet-500 to-purple-500' }
]
export default function SettingsPage({ onBack }) {
  const { user } = useAuth()
  const { showToast } = useUI()
  const navigate = useNavigate()
  const [userDoc, setUserDoc] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [saveSuccess, setSaveSuccess] = useState(false)

  // Profile fields
  const [displayName, setDisplayName] = useState('')
  const [bio, setBio] = useState('')
  const [username, setUsername] = useState('')
  const [avatarFile, setAvatarFile] = useState(null)
  const [avatarPreview, setAvatarPreview] = useState(null)
  const [showPhotoPreview, setShowPhotoPreview] = useState(false)

  // Appearance
  const [accent, setAccent] = useState(localStorage.getItem('accent') || ACCENT_COLORS[0].value)
  const [fontSize, setFontSize] = useState(parseFloat(localStorage.getItem('fontSize')) || 1)

  // Notifications & prefs
  const [notifyMessages, setNotifyMessages] = useState(true)
  const [vibrateOnMsg, setVibrateOnMsg] = useState(false)
  const [typingIndicator, setTypingIndicator] = useState(true)
  const [readReceipts, setReadReceipts] = useState(true)
  const [messagePreview, setMessagePreview] = useState(true)
  const [liveLocationEnabled, setLiveLocationEnabled] = useState(false)

  // Privacy
  const [blockedUsers, setBlockedUsers] = useState([])
  const [lastSeen, setLastSeen] = useState('everyone')
  const [profilePhoto, setProfilePhoto] = useState('everyone')

  // Storage
  const [storageUsed, setStorageUsed] = useState('0 MB')

  useEffect(() => {
    // Load user doc on mount
    const unsubListeners = []
    if (!user?.uid) return
    try {
      const ref = doc(db, 'users', user.uid)
      const unsub = onSnapshot(ref, (snap) => {
        if (!snap.exists()) return
        const d = snap.data()
        setUserDoc(d)
        setDisplayName(d.displayName || user.displayName || '')
        setBio(d.bio || '')
        setUsername(d.username || '')
        setBlockedUsers(d.blockedUsers || [])
        setNotifyMessages(d.settings?.notifyMessages ?? true)
        setVibrateOnMsg(d.settings?.vibrateOnMsg ?? false)
        setTypingIndicator(d.settings?.typingIndicator ?? true)
        setReadReceipts(d.settings?.readReceipts ?? true)
        setMessagePreview(d.settings?.messagePreview ?? true)
        setLiveLocationEnabled(d.settings?.liveLocationEnabled ?? false)
        setLastSeen(d.settings?.lastSeen || 'everyone')
        setProfilePhoto(d.settings?.profilePhoto || 'everyone')
        // Load avatar URL from Firestore if no file is selected
        if (!avatarFile && (d.avatarUrl || user?.photoURL)) {
          setAvatarPreview(d.avatarUrl || user?.photoURL)
        }
        // load appearance settings from user doc if present (for cross-device sync)
        if (d.settings?.accent) setAccent(d.settings.accent)
        if (typeof d.settings?.fontSize !== 'undefined') setFontSize(d.settings.fontSize)
      })
      unsubListeners.push(unsub)
    } catch (e) {
      console.warn('failed to subscribe to user doc', e)
    }
    return () => unsubListeners.forEach(u => u && u())
  }, [user, avatarFile])

  useEffect(() => {
    document.documentElement.style.setProperty('--accent-color', accent)
    localStorage.setItem('accent', accent)
  }, [accent])

  useEffect(() => {
    document.documentElement.style.setProperty('--chat-font-scale', fontSize)
    localStorage.setItem('fontSize', String(fontSize))
  }, [fontSize])

  function handleAvatarFile(e) {
    const f = e.target.files?.[0]
    if (!f) return
    setAvatarFile(f)
    setAvatarPreview(URL.createObjectURL(f))
  }

  async function handleSaveProfile() {
    if (!user?.uid) return setError('Sign in to update profile')
    setLoading(true)
    setError(null)
    try {
      const userRef = doc(db, 'users', user.uid)
      const update = { 
        displayName, 
        bio, 
        username,
        // persist email to user document so other users can find by email
        email: user?.email || '',
        settings: {
          notifyMessages,
          vibrateOnMsg,
          typingIndicator,
          readReceipts,
          messagePreview,
          lastSeen,
          profilePhoto,
          // persist appearance for cross-device real-time updates
          accent,
          fontSize,
          liveLocationEnabled
        }
      }
      
      // Upload avatar if selected
      if (avatarFile) {
        try {
          showToast('Uploading photo...', 'info')
          const res = await uploadToCloudinary(avatarFile)
          console.log('Upload result:', res) // Debug log
          const url = res?.url
          if (url) {
            update.avatarUrl = url
            console.log('Setting avatarUrl to:', url) // Debug log
            showToast('Photo uploaded successfully!', 'success')
          } else if (res?.error) {
            throw new Error(res.error)
          } else {
            throw new Error('Upload failed - no URL returned')
          }
        } catch (uploadError) {
          console.error('Photo upload error:', uploadError)
          showToast(uploadError.message || 'Failed to upload photo', 'error')
          setLoading(false)
          return
        }
      }
      
  // Use setDoc with merge to create the user document if it doesn't exist
  console.log('Saving update:', update) // Debug log
  await setDoc(userRef, update, { merge: true })
      // also reflect live location in presence flags
      try { await setDoc(userRef, { status: { liveLocationEnabled } }, { merge: true }) } catch {}
      
      // reload userDoc to get the updated avatarUrl
      const snap = await getDoc(userRef)
      if (snap.exists()) {
        const updatedData = snap.data()
        setUserDoc(updatedData)
        // Keep the avatarPreview showing the saved photo
        if (updatedData.avatarUrl) {
          setAvatarPreview(updatedData.avatarUrl)
        }
      }
      
      setLoading(false)
      setSaveSuccess(true)
      showToast('Profile saved successfully!', 'success')
      
      // Clear only the file selection, keep the preview showing saved photo
      setAvatarFile(null)
      setShowPhotoPreview(false)
      
      setTimeout(() => setSaveSuccess(false), 3000)
    } catch (e) {
      console.error('save profile failed', e)
      setError(e.message || 'Save failed')
      setLoading(false)
    }
  }

  async function handleUnblock(uid) {
    if (!user?.uid) return
    try {
      const userRef = doc(db, 'users', user.uid)
      try {
        await updateDoc(userRef, { blockedUsers: arrayRemove(uid) })
      } catch (e) {
        // If the user doc doesn't exist, create it with an empty blockedUsers array
        if (e?.message && e.message.toLowerCase().includes('no document to update')) {
          await setDoc(userRef, { blockedUsers: [] }, { merge: true })
        } else {
          throw e
        }
      }
      setBlockedUsers(prev => prev.filter(x => x !== uid))
    } catch (e) {
      console.error('unblock failed', e)
    }
  }

  function handleClearCache() {
    localStorage.removeItem('accent')
    localStorage.removeItem('fontSize')
    setAccent(ACCENT_COLORS[0].value)
    setFontSize(1)
    if ('caches' in window) caches.keys().then(keys => keys.forEach(k => caches.delete(k)))
    showToast('App cache & appearance settings cleared', 'success')
  }

  const settingsSections = [
    {
      title: "Account",
      icon: User,
      items: [
        {
          type: 'profile',
          avatar: avatarPreview || userDoc?.avatarUrl || user?.photoURL,
          name: displayName || user?.displayName || 'User',
          email: user?.email
        }
      ]
    },
    {
      title: "Appearance",
      icon: Palette,
      items: [
        {
          type: 'accent',
          label: "Accent Color",
          value: accent,
          options: ACCENT_COLORS
        },
        {
          type: 'slider',
          label: "Font Size",
          value: fontSize,
          min: 0.8,
          max: 1.3,
          step: 0.05
        }
      ]
    },
    {
      title: "Notifications",
      icon: Bell,
      items: [
        {
          type: 'toggle',
          label: "Message Notifications",
          value: notifyMessages,
          onChange: setNotifyMessages
        },
        {
          type: 'toggle',
          label: "Vibrate on Message",
          value: vibrateOnMsg,
          onChange: setVibrateOnMsg
        },
        {
          type: 'toggle',
          label: "Message Preview",
          value: messagePreview,
          onChange: setMessagePreview
        }
      ]
    },
    {
      title: "Privacy",
      icon: Shield,
      items: [
        {
          type: 'select',
          label: "Last Seen",
          value: lastSeen,
          options: [
            { label: "Everyone", value: "everyone" },
            { label: "My Contacts", value: "contacts" },
            { label: "Nobody", value: "nobody" }
          ],
          onChange: setLastSeen
        },
        {
          type: 'select',
          label: "Profile Photo",
          value: profilePhoto,
          options: [
            { label: "Everyone", value: "everyone" },
            { label: "My Contacts", value: "contacts" },
            { label: "Nobody", value: "nobody" }
          ],
          onChange: setProfilePhoto
        },
        {
          type: 'toggle',
          label: "Read Receipts",
          value: readReceipts,
          onChange: setReadReceipts
        },
        {
          type: 'toggle',
          label: "Typing Indicator",
          value: typingIndicator,
          onChange: setTypingIndicator
        }
      ]
    },
    {
      title: "Chat Settings",
      icon: MessageCircle,
      items: [
        {
          type: 'toggle',
          label: "Enter is Send",
          value: true,
          onChange: () => {}
        },
        {
          type: 'toggle',
          label: "Media Download",
          value: true,
          onChange: () => {}
        }
      ]
    },
    {
      title: "Storage & Data",
      icon: Download,
      items: [
        {
          type: 'storage',
          label: "Storage Used",
          value: storageUsed
        },
        {
          type: 'button',
          label: "Clear Cache",
          action: handleClearCache,
          destructive: true
        }
      ]
    }
  ]

  const renderSettingItem = (item) => {
    switch (item.type) {
      case 'profile':
  return (
    <div className="glass-card hover-lift rounded-2xl p-6 border border-white/10">
      <div className="flex items-center gap-6">
        <div className="relative group">
          <div className={`w-20 h-20 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold text-xl shadow-lg overflow-hidden ${avatarPreview && avatarFile ? 'ring-4 ring-blue-500 ring-offset-2 ring-offset-slate-900' : ''}`}>
            {item.avatar ? (
              <img 
                src={item.avatar} 
                alt="avatar" 
                className="w-full h-full rounded-2xl object-cover transition-transform duration-300 group-hover:scale-110" 
              />
            ) : (
              <span className="text-2xl">{item.name?.[0] || 'U'}</span>
            )}
          </div>
          {avatarFile && (
            <div className="absolute -top-2 -left-2 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center border-2 border-slate-900 shadow-lg">
              <Check className="w-3 h-3 text-white" />
            </div>
          )}
          <div className="absolute inset-0 rounded-2xl bg-black/50 opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-center justify-center">
            <Image className="w-6 h-6 text-white" />
          </div>
          <button 
            onClick={() => document.getElementById('avatar-file')?.click()}
            className="absolute -bottom-2 -right-2 w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center border-4 border-slate-900 hover:scale-110 transition-all duration-300 shadow-lg"
          >
            <Image className="w-4 h-4 text-white" />
          </button>
          {avatarPreview && (
            <button 
              onClick={() => setShowPhotoPreview(true)}
              className="absolute -top-2 -right-2 w-8 h-8 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-full flex items-center justify-center border-4 border-slate-900 hover:scale-110 transition-all duration-300 shadow-lg"
              title="Preview photo"
            >
              <Eye className="w-4 h-4 text-white" />
            </button>
          )}
          <input id="avatar-file" type="file" accept="image/*" className="hidden" onChange={handleAvatarFile} />
        </div>
        
        <div className="flex-1 space-y-4">
          <div>
            <div className="font-bold text-xl text-white mb-1">{item.name}</div>
            <div className="text-sm text-gray-300 flex items-center gap-2">
              <span>📧</span>
              {item.email}
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="relative">
              <input
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Display Name"
                className="glass-input w-full px-4 py-3 rounded-xl text-white placeholder-gray-400 focus:ring-2 focus:ring-purple-500/50 transition-all duration-300"
              />
            </div>
            <div className="relative">
              <input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Username"
                className="glass-input w-full px-4 py-3 rounded-xl text-white placeholder-gray-400 focus:ring-2 focus:ring-purple-500/50 transition-all duration-300"
              />
            </div>
          </div>
          
          <div className="relative">
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Tell us about yourself..."
              className="glass-input w-full px-4 py-3 rounded-xl text-white placeholder-gray-400 focus:ring-2 focus:ring-purple-500/50 resize-none transition-all duration-300"
              rows={3}
            />
            <div className="absolute bottom-2 right-2 text-xs text-gray-400">
              {bio.length}/150
            </div>
          </div>
        </div>
      </div>
    </div>
  )


      case 'accent':
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="text-white font-medium">{item.label}</div>
        <div className="text-sm text-gray-400">Choose your style</div>
      </div>
      <div className="grid grid-cols-4 gap-4">
        {item.options.map(color => (
          <button
            key={color.name}
            onClick={() => setAccent(color.value)}
            className={`group relative p-1 rounded-2xl transition-all duration-300 hover:scale-110 ${
              accent === color.value 
                ? 'bg-gradient-to-r from-purple-500/30 to-pink-500/30 ring-2 ring-white' 
                : 'bg-white/5 hover:bg-white/10'
            }`}
          >
            <div 
              className="w-full h-12 rounded-xl transition-all duration-300 group-hover:rounded-lg"
              style={{ backgroundColor: color.value }}
            />
            <div className={`absolute inset-0 rounded-xl bg-gradient-to-br ${color.gradient} opacity-0 group-hover:opacity-20 transition-opacity duration-300`} />
            <div className="text-xs text-white mt-1 font-medium">{color.name}</div>
          </button>
        ))}
      </div>
    </div>
  )


      case 'slider':
        return (
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <div className="text-sm text-gray-300">{item.label}</div>
              <div className="text-sm text-gray-400">{Math.round(item.value * 100)}%</div>
            </div>
            <input
              type="range"
              min={item.min}
              max={item.max}
              step={item.step}
              value={item.value}
              onChange={(e) => setFontSize(parseFloat(e.target.value))}
              className="w-full accent-purple-500"
            />
          </div>
        )

      case 'toggle':
  return (
    <div className="glass-card hover-lift rounded-xl p-4 border border-white/10 transition-all duration-300">
      <div className="flex items-center justify-between">
        <div>
          <div className="font-medium text-white mb-1">{item.label}</div>
          <div className="text-xs text-gray-400">Toggle to enable/disable</div>
        </div>
        <div 
          className={`modern-toggle ${item.value ? 'active' : ''}`}
          onClick={() => item.onChange(!item.value)}
        />
      </div>
    </div>
  )

      case 'select':
        return (
          <div className="space-y-2">
            <div className="text-sm text-gray-300">{item.label}</div>
            <select
              value={item.value}
              onChange={(e) => item.onChange(e.target.value)}
              className="w-full p-3 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              {item.options.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        )

      case 'storage':
        return (
          <div className="flex justify-between items-center p-3 bg-white/5 rounded-lg border border-white/10">
            <div className="text-sm text-gray-300">{item.label}</div>
            <div className="text-sm text-gray-400">{item.value}</div>
          </div>
        )

      case 'button':
        return (
          <button
            onClick={item.action}
            className={`w-full p-3 rounded-lg border transition-all duration-200 ${
              item.destructive
                ? 'bg-red-500/10 border-red-500/20 text-red-400 hover:bg-red-500/20'
                : 'bg-white/5 border-white/10 text-gray-300 hover:bg-white/10'
            }`}
          >
            {item.label}
          </button>
        )

      default:
        return null
    }
  }

 return (
  <div className="flex h-screen bg-gradient-to-br from-slate-900 via-purple-900/50 to-slate-900 text-white overflow-hidden">
    <div className="hidden md:block w-80 lg:w-96 relative flex-shrink-0">
      <Sidebar 
        onSelectChat={(chat) => {
          navigate(`/chat/${chat.id}`);
        }}
        onCreateChat={(chatId) => {
          navigate(`/chat/${chatId}`);
        }}
        onClose={() => navigate('/chat')}
      />
    </div>

    <div className="flex-1 overflow-y-auto settings-scrollbar">
      {/* Enhanced Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="sticky top-0 z-50 p-6 border-b border-white/10 glass-card backdrop-blur-xl"
      >
        <div className="flex items-center gap-4">
          <button
            onClick={() => onBack ? onBack() : navigate('/chat')}
            className="p-3 hover:bg-white/10 rounded-2xl transition-all duration-300 hover:scale-105 group"
          >
            <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform duration-300" />
          </button>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-lg float-animation">
              <Cog className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold gradient-text">Settings</h1>
              <p className="text-sm text-gray-300">Customize your ChatWave experience</p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Enhanced Settings Content */}
      <div className="p-6 max-w-4xl mx-auto">
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, x: -100 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 100 }}
              className="mb-6 p-4 bg-red-500/20 border border-red-500/30 rounded-2xl text-red-300 text-sm backdrop-blur-lg"
            >
              ⚠️ {error}
            </motion.div>
          )}

          {saveSuccess && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="mb-6 p-4 bg-green-500/20 border border-green-500/30 rounded-2xl text-green-300 text-sm backdrop-blur-lg flex items-center gap-3"
            >
              <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                <Check className="w-4 h-4 text-white" />
              </div>
              Settings saved successfully! Changes applied across all devices.
            </motion.div>
          )}
        </AnimatePresence>

        <div className="space-y-8">
          {settingsSections.map((section, sectionIndex) => (
            <motion.div
              key={section.title}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: sectionIndex * 0.15 }}
              className="glass-card rounded-3xl border border-white/10 overflow-hidden hover-lift"
            >
              {/* Enhanced Section Header */}
              <div className="p-6 border-b border-white/10 bg-gradient-to-r from-white/5 to-transparent">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center border border-white/10">
                    <section.icon className="w-5 h-5 text-purple-400" />
                  </div>
                  <div>
                    <h2 className="font-bold text-xl text-white">{section.title}</h2>
                    <p className="text-sm text-gray-400">Manage your {section.title.toLowerCase()} preferences</p>
                  </div>
                </div>
              </div>

              {/* Enhanced Section Content */}
              <div className="p-6 space-y-6">
                {section.items.map((item, itemIndex) => (
                  <motion.div
                    key={itemIndex}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: sectionIndex * 0.15 + itemIndex * 0.08 }}
                  >
                    {renderSettingItem(item)}
                  </motion.div>
                ))}
              </div>
            </motion.div>
          ))}
        </div>

        {/* Enhanced Save Button */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1 }}
          className="mt-12 flex justify-center"
        >
          <button
            onClick={handleSaveProfile}
            disabled={loading}
            className="group flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 disabled:opacity-50 text-white font-bold rounded-2xl shadow-2xl transition-all duration-300 hover:scale-105 pulse-glow"
          >
            {loading ? (
              <div className="flex items-center gap-3">
                <div className="w-6 h-6 border-3 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Saving Changes...</span>
              </div>
            ) : (
              <>
                <Save className="w-5 h-5 group-hover:scale-110 transition-transform duration-300" />
                <span>Save All Changes</span>
                <div className="text-xs opacity-70">Sync across devices</div>
              </>
            )}
          </button>
        </motion.div>
      </div>

      {/* Photo Preview Modal */}
      <AnimatePresence>
        {showPhotoPreview && avatarPreview && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
            onClick={() => setShowPhotoPreview(false)}
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              className="relative max-w-2xl w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => setShowPhotoPreview(false)}
                className="absolute -top-4 -right-4 w-10 h-10 bg-red-500 hover:bg-red-600 rounded-full flex items-center justify-center text-white shadow-lg transition-all z-10"
              >
                <X className="w-5 h-5" />
              </button>
              <div className="bg-slate-900 rounded-3xl overflow-hidden border-4 border-purple-500/50 shadow-2xl">
                <img
                  src={avatarPreview}
                  alt="Profile Preview"
                  className="w-full h-auto max-h-[80vh] object-contain"
                />
                <div className="p-4 bg-gradient-to-r from-purple-500/20 to-pink-500/20 border-t border-white/10">
                  <p className="text-white text-center font-medium">Profile Photo Preview</p>
                  {avatarFile && (
                    <p className="text-gray-400 text-center text-sm mt-1">
                      {avatarFile.name} • {(avatarFile.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  )}
                  <div className="flex gap-3 mt-4">
                    <button
                      onClick={() => {
                        setAvatarFile(null)
                        setAvatarPreview(null)
                        setShowPhotoPreview(false)
                        if (document.getElementById('avatar-file')) {
                          document.getElementById('avatar-file').value = ''
                        }
                      }}
                      className="flex-1 py-3 px-4 bg-red-500/20 hover:bg-red-500/30 border border-red-500/50 rounded-xl text-red-400 font-medium transition-all"
                    >
                      Remove Photo
                    </button>
                    <button
                      onClick={() => setShowPhotoPreview(false)}
                      className="flex-1 py-3 px-4 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 rounded-xl text-white font-medium transition-all"
                    >
                      Looks Good!
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  </div>
)
  
}