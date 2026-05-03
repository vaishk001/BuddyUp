import React, { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { uploadToCloudinary } from '../../utils/cloudinary'
import { useAuth } from '../../contexts/AuthContext'
import { useUI } from '../../contexts/UIContext'
import { doc, updateDoc, getDoc, arrayRemove } from 'firebase/firestore'
import { db } from '../../firebase'
import { X, Image, User, Settings as Cog, Palette, Bell, Trash2, Lock, Globe, Info, Shield, Smartphone, MessageSquare, Check } from 'lucide-react'

const ACCENT_COLORS = [
  { name: 'Blue', value: '#3b82f6', class: 'bg-blue-500' },
  { name: 'Purple', value: '#8b5cf6', class: 'bg-purple-500' },
  { name: 'Teal', value: '#14b8a6', class: 'bg-teal-500' },
  { name: 'Pink', value: '#ec4899', class: 'bg-pink-500' },
  { name: 'Orange', value: '#f97316', class: 'bg-orange-500' }
]

export default function SettingsModal({ open, onClose }) {
  const { user } = useAuth()
  const { showToast } = useUI()
  const [userDoc, setUserDoc] = useState(null)
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState('account')

  // Profile fields
  const [displayName, setDisplayName] = useState('')
  const [bio, setBio] = useState('')
  const [username, setUsername] = useState('')
  const [avatarFile, setAvatarFile] = useState(null)
  const [avatarPreview, setAvatarPreview] = useState(null)

  // Appearance
  const [accent, setAccent] = useState(localStorage.getItem('accent') || ACCENT_COLORS[0].value)
  const [fontSize, setFontSize] = useState(parseFloat(localStorage.getItem('fontSize')) || 1)

  // Notifications & prefs
  const [notifyMessages, setNotifyMessages] = useState(true)
  const [vibrateOnMsg, setVibrateOnMsg] = useState(false)
  const [typingIndicator, setTypingIndicator] = useState(true)
  const [readReceipts, setReadReceipts] = useState(true)

  // Privacy
  const [blockedUsers, setBlockedUsers] = useState([])

  useEffect(() => {
    if (!open) return
    // Load user doc
    ;(async () => {
      if (!user?.uid) return
      try {
        const ref = doc(db, 'users', user.uid)
        const snap = await getDoc(ref)
        if (snap.exists()) {
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
        }
      } catch (e) {
        console.warn('failed to load user doc', e)
      }
    })()
  }, [open, user])


  useEffect(() => {
    document.documentElement.style.setProperty('--accent-color', accent)
    localStorage.setItem('accent', accent)
  }, [accent])

  useEffect(() => {
    document.documentElement.style.setProperty('--chat-font-scale', fontSize)
    localStorage.setItem('fontSize', String(fontSize))
  }, [fontSize])

  if (!open) return null

  function handleAvatarFile(e) {
    const f = e.target.files?.[0]
    if (!f) return
    setAvatarFile(f)
    setAvatarPreview(URL.createObjectURL(f))
  }

  async function handleSaveProfile() {
    if (!user?.uid) return showToast('Sign in to update profile', 'error')
    setLoading(true)
    try {
      const userRef = doc(db, 'users', user.uid)
      const update = { displayName, bio, username, email: user?.email || '' }
      if (avatarFile) {
        const res = await uploadToCloudinary(avatarFile)
        const url = res?.secure_url || res?.url
        if (url) update.avatarUrl = url
      }
      await updateDoc(userRef, update)
      setLoading(false)
      showToast('Profile updated successfully', 'success')
      onClose()
    } catch (e) {
      console.error('save profile failed', e)
      showToast(e.message || 'Save failed', 'error')
      setLoading(false)
    }
  }

  async function toggleUserSetting(key, value) {
    if (!user?.uid) {
      localStorage.setItem(key, JSON.stringify(value))
      return
    }
    try {
      const userRef = doc(db, 'users', user.uid)
      await updateDoc(userRef, { [`settings.${key}`]: value })
    } catch (e) {
      console.warn('toggle setting failed', e)
    }
  }

  async function handleUnblock(uid) {
    if (!user?.uid) return
    try {
      const userRef = doc(db, 'users', user.uid)
      await updateDoc(userRef, { blockedUsers: arrayRemove(uid) })
      setBlockedUsers(prev => prev.filter(x => x !== uid))
      showToast('User unblocked', 'success')
    } catch (e) {
      console.error('unblock failed', e)
      showToast('Failed to unblock user', 'error')
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

  const tabs = [
    { id: 'account', label: 'Account', icon: User },
    { id: 'appearance', label: 'Appearance', icon: Palette },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'privacy', label: 'Privacy', icon: Shield },
  ]

  return (
    <AnimatePresence>
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
          className="absolute inset-0 bg-black/60 backdrop-blur-sm" 
          onClick={onClose} 
        />
        
        <motion.div 
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          className="relative z-10 w-full max-w-4xl bg-slate-900 rounded-3xl shadow-2xl border border-white/10 overflow-hidden flex flex-col md:flex-row max-h-[85vh]"
        >
          {/* Sidebar */}
          <div className="w-full md:w-64 bg-slate-950/50 border-b md:border-b-0 md:border-r border-white/10 p-4 md:p-6 flex flex-col">
            <div className="flex items-center gap-3 mb-8">
              <div className="p-2 bg-purple-500/20 rounded-xl">
                <Cog className="w-6 h-6 text-purple-400" />
              </div>
              <h2 className="text-xl font-bold text-white">Settings</h2>
            </div>

            <div className="flex md:flex-col gap-2 overflow-x-auto md:overflow-visible pb-2 md:pb-0">
              {tabs.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all whitespace-nowrap ${
                    activeTab === tab.id
                      ? 'bg-purple-500/20 text-purple-400 border border-purple-500/20'
                      : 'text-gray-400 hover:bg-white/5 hover:text-white'
                  }`}
                >
                  <tab.icon className="w-5 h-5" />
                  <span className="font-medium">{tab.label}</span>
                </button>
              ))}
            </div>

            <div className="mt-auto pt-6 border-t border-white/10 hidden md:block">
              <button 
                onClick={handleClearCache}
                className="flex items-center gap-3 px-4 py-3 rounded-xl text-red-400 hover:bg-red-500/10 transition-all w-full"
              >
                <Trash2 className="w-5 h-5" />
                <span className="font-medium">Clear Cache</span>
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 p-6 md:p-8 overflow-y-auto scrollbar-thin scrollbar-thumb-white/10">
            <div className="flex justify-between items-center mb-6 md:hidden">
              <h3 className="text-lg font-bold text-white capitalize">{activeTab}</h3>
              <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full">
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>
            <button onClick={onClose} className="absolute top-6 right-6 p-2 hover:bg-white/10 rounded-full hidden md:block">
              <X className="w-5 h-5 text-gray-400 hover:text-white transition-colors" />
            </button>

            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
              >
                {activeTab === 'account' && (
                  <div className="space-y-6">
                    <div className="flex items-center gap-6">
                      <div className="relative group">
                        <div className="w-24 h-24 rounded-2xl overflow-hidden bg-white/5 border-2 border-white/10 group-hover:border-purple-500/50 transition-all">
                          <img 
                            src={avatarPreview || userDoc?.avatarUrl || user?.photoURL || `https://ui-avatars.com/api/?name=${displayName}&background=random`} 
                            alt="avatar" 
                            className="w-full h-full object-cover" 
                          />
                          <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer" onClick={() => document.getElementById('avatar-file')?.click()}>
                            <Image className="w-8 h-8 text-white" />
                          </div>
                        </div>
                        <input id="avatar-file" type="file" accept="image/*" className="hidden" onChange={handleAvatarFile} />
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-white">{displayName || 'User'}</h3>
                        <p className="text-gray-400 text-sm">{user?.email}</p>
                        <button 
                          onClick={() => document.getElementById('avatar-file')?.click()}
                          className="mt-2 text-sm text-purple-400 hover:text-purple-300 font-medium"
                        >
                          Change Profile Photo
                        </button>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-gray-400">Display Name</label>
                          <input 
                            value={displayName} 
                            onChange={e => setDisplayName(e.target.value)} 
                            className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-purple-500/50 transition-colors"
                            placeholder="Your name"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-gray-400">Username</label>
                          <input 
                            value={username} 
                            onChange={e => setUsername(e.target.value)} 
                            className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-purple-500/50 transition-colors"
                            placeholder="@username"
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-400">Bio</label>
                        <textarea 
                          value={bio} 
                          onChange={e => setBio(e.target.value)} 
                          className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-purple-500/50 transition-colors resize-none h-24"
                          placeholder="Tell us about yourself..."
                        />
                      </div>
                    </div>

                    <div className="flex justify-end pt-4">
                      <button 
                        onClick={handleSaveProfile} 
                        disabled={loading}
                        className="px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-medium rounded-xl shadow-lg shadow-purple-500/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                      >
                        {loading ? (
                          <>
                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            Saving...
                          </>
                        ) : (
                          <>
                            <Check className="w-4 h-4" />
                            Save Changes
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                )}

                {activeTab === 'appearance' && (
                  <div className="space-y-8">
                    <div className="space-y-4">
                      <h4 className="text-lg font-medium text-white">Accent Color</h4>
                      <div className="flex flex-wrap gap-3">
                        {ACCENT_COLORS.map(c => (
                          <button 
                            key={c.name} 
                            onClick={() => setAccent(c.value)} 
                            className={`w-12 h-12 rounded-xl transition-all transform hover:scale-110 flex items-center justify-center ${c.class} ${
                              accent === c.value ? 'ring-2 ring-white ring-offset-2 ring-offset-slate-900 scale-110' : ''
                            }`}
                          >
                            {accent === c.value && <Check className="w-6 h-6 text-white" />}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <h4 className="text-lg font-medium text-white">Font Size</h4>
                        <span className="text-sm text-gray-400">{Math.round(fontSize * 100)}%</span>
                      </div>
                      <div className="flex items-center gap-4 p-4 bg-white/5 rounded-xl border border-white/10">
                        <span className="text-xs text-gray-400">Aa</span>
                        <input 
                          type="range" 
                          min="0.8" 
                          max="1.2" 
                          step="0.1" 
                          value={fontSize} 
                          onChange={e => setFontSize(parseFloat(e.target.value))} 
                          className="w-full accent-purple-500 h-2 bg-white/10 rounded-lg appearance-none cursor-pointer" 
                        />
                        <span className="text-xl text-white">Aa</span>
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'notifications' && (
                  <div className="space-y-6">
                    <div className="space-y-4">
                      <ToggleItem 
                        label="Message Notifications" 
                        description="Get notified when you receive a new message"
                        icon={MessageSquare}
                        checked={notifyMessages}
                        onChange={(checked) => {
                          setNotifyMessages(checked)
                          toggleUserSetting('notifyMessages', checked)
                        }}
                      />
                      <ToggleItem 
                        label="Vibrate on Message" 
                        description="Vibrate when a new message arrives"
                        icon={Smartphone}
                        checked={vibrateOnMsg}
                        onChange={(checked) => {
                          setVibrateOnMsg(checked)
                          toggleUserSetting('vibrateOnMsg', checked)
                        }}
                      />
                    </div>
                  </div>
                )}

                {activeTab === 'privacy' && (
                  <div className="space-y-8">
                    <div className="space-y-4">
                      <h4 className="text-lg font-medium text-white mb-4">Chat Privacy</h4>
                      <ToggleItem 
                        label="Typing Indicators" 
                        description="Show others when you're typing"
                        icon={MessageSquare}
                        checked={typingIndicator}
                        onChange={(checked) => {
                          setTypingIndicator(checked)
                          toggleUserSetting('typingIndicator', checked)
                        }}
                      />
                      <ToggleItem 
                        label="Read Receipts" 
                        description="Show others when you've read their messages"
                        icon={Check}
                        checked={readReceipts}
                        onChange={(checked) => {
                          setReadReceipts(checked)
                          toggleUserSetting('readReceipts', checked)
                        }}
                      />
                    </div>

                    <div className="space-y-4">
                      <h4 className="text-lg font-medium text-white">Blocked Users</h4>
                      <div className="bg-white/5 rounded-xl border border-white/10 overflow-hidden">
                        {blockedUsers.length === 0 ? (
                          <div className="p-8 text-center text-gray-400">
                            <Shield className="w-12 h-12 mx-auto mb-3 opacity-50" />
                            <p>No blocked users</p>
                          </div>
                        ) : (
                          <div className="divide-y divide-white/10">
                            {blockedUsers.map(uid => (
                              <div key={uid} className="flex items-center justify-between p-4 hover:bg-white/5 transition-colors">
                                <div className="flex items-center gap-3">
                                  <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center">
                                    <User className="w-5 h-5 text-gray-400" />
                                  </div>
                                  <span className="text-sm font-medium text-white">{uid.slice(0, 8)}...</span>
                                </div>
                                <button 
                                  onClick={() => handleUnblock(uid)} 
                                  className="px-3 py-1.5 text-xs font-medium text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                                >
                                  Unblock
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

const ToggleItem = ({ label, description, icon: Icon, checked, onChange }) => (
  <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/10 hover:border-white/20 transition-all">
    <div className="flex items-center gap-4">
      <div className="p-2 bg-white/5 rounded-lg">
        <Icon className="w-5 h-5 text-gray-400" />
      </div>
      <div>
        <div className="font-medium text-white">{label}</div>
        <div className="text-xs text-gray-400">{description}</div>
      </div>
    </div>
    <button
      onClick={() => onChange(!checked)}
      className={`relative w-12 h-7 rounded-full transition-colors duration-300 ${
        checked ? 'bg-purple-500' : 'bg-gray-700'
      }`}
    >
      <motion.div
        layout
        transition={{ type: 'spring', stiffness: 700, damping: 30 }}
        className={`absolute top-1 w-5 h-5 bg-white rounded-full ${
          checked ? 'left-6' : 'left-1'
        }`}
      />
    </button>
  </div>
)

