import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  X, 
  Phone, 
  Video, 
  MessageCircle,
  Ban,
  Flag,
  VolumeX,
  Trash2,
  Camera,
  Mail,
  Calendar,
  MapPin,
  Link as LinkIcon,
  Image as ImageIcon,
  FileText,
  Mic,
  MapPinned,
  Film,
  Star,
  Clock,
  Eye,
  EyeOff,
  Shield,
  CheckCircle,
  Circle
} from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { useUI } from '../../contexts/UIContext'
import { getUser, updateUserSettings, listenMessages } from '../../services/firestore'

export default function UserProfileModal({ open, onClose, userId, chatId, onAction }) {
  const { user: currentUser } = useAuth()
  const { showToast, confirm } = useUI()
  const [user, setUser] = useState(null)
  const [activeTab, setActiveTab] = useState('media')
  const [loading, setLoading] = useState(true)
  const [sharedMedia, setSharedMedia] = useState({
    photos: [],
    videos: [],
    documents: [],
    voiceNotes: [],
    links: [],
    gifs: [],
    locations: []
  })

  // Privacy settings (only for self)
  const [privacySettings, setPrivacySettings] = useState({
    showLastSeen: true,
    showProfilePhoto: true,
    showStatus: true
  })

  const isSelf = currentUser?.uid === userId

  useEffect(() => {
    if (!userId) return
    loadUserData()
  }, [userId])

  useEffect(() => {
    if (!chatId) return
    const unsubscribe = listenMessages(chatId, (messages) => {
      categorizeMedia(messages)
    })
    return () => unsubscribe()
  }, [chatId])

  const loadUserData = async () => {
    try {
      setLoading(true)
      const userData = await getUser(userId)
      setUser(userData)
      
      if (isSelf && userData?.privacy) {
        setPrivacySettings({
          showLastSeen: userData.privacy.showLastSeen !== false,
          showProfilePhoto: userData.privacy.showProfilePhoto !== false,
          showStatus: userData.privacy.showStatus !== false
        })
      }
    } catch (error) {
      console.error('Failed to load user data:', error)
      showToast('Failed to load profile', 'error')
    } finally {
      setLoading(false)
    }
  }

  const categorizeMedia = (messages) => {
    const media = {
      photos: [],
      videos: [],
      documents: [],
      voiceNotes: [],
      links: [],
      gifs: [],
      locations: []
    }

    messages.forEach(msg => {
      if (msg.type === 'image') media.photos.push(msg)
      else if (msg.type === 'video') media.videos.push(msg)
      else if (msg.type === 'document') media.documents.push(msg)
      else if (msg.type === 'voice') media.voiceNotes.push(msg)
      else if (msg.type === 'gif') media.gifs.push(msg)
      else if (msg.type === 'location') media.locations.push(msg)
      else if (msg.text && /https?:\/\//.test(msg.text)) media.links.push(msg)
    })

    setSharedMedia(media)
  }

  const handlePrivacyChange = async (setting, value) => {
    try {
      const newSettings = { ...privacySettings, [setting]: value }
      setPrivacySettings(newSettings)
      
      await updateUserSettings(currentUser.uid, {
        privacy: newSettings
      })
      showToast('Privacy settings updated', 'success')
    } catch (error) {
      console.error('Failed to update privacy:', error)
      showToast('Failed to update settings', 'error')
    }
  }

  const handleAction = (action) => {
    onClose()
    if (onAction) onAction(action)
  }

  const getLastSeen = () => {
    if (!user?.lastSeen) return 'Never'
    const lastSeen = user.lastSeen.toDate ? user.lastSeen.toDate() : new Date(user.lastSeen)
    const now = new Date()
    const diff = now - lastSeen
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(minutes / 60)
    const days = Math.floor(hours / 24)

    if (minutes < 1) return 'Just now'
    if (minutes < 60) return `${minutes}m ago`
    if (hours < 24) return `${hours}h ago`
    return `${days}d ago`
  }

  if (!open) return null

  const tabs = [
    { id: 'media', label: 'Media', icon: ImageIcon },
    { id: 'about', label: 'About', icon: Mail },
    ...(isSelf ? [{ id: 'privacy', label: 'Privacy', icon: Shield }] : [])
  ]

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 flex items-center justify-center z-50 p-4"
      >
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/60 backdrop-blur-sm light:bg-gray-900/20"
          onClick={onClose}
        />
        
        {/* Modal */}
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          className="relative w-full max-w-2xl max-h-[90vh] bg-slate-900 rounded-3xl shadow-2xl border border-white/10 overflow-hidden z-10 light:bg-white light:border-black/10"
        >
          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 z-20 p-2 bg-black/40 hover:bg-black/60 rounded-full transition-all light:bg-white/40 light:hover:bg-white/60"
          >
            <X className="w-5 h-5 text-white light:text-black" />
          </button>

          <div className="overflow-y-auto max-h-[90vh] scrollbar-thin scrollbar-thumb-white/10 light:scrollbar-thumb-black/10">
            {/* Profile Header */}
            <div className="relative">
              {/* Cover gradient */}
              <div className="h-32 bg-gradient-to-br from-purple-600 via-pink-600 to-blue-600 light:from-blue-500 light:via-cyan-500 light:to-sky-500" />
              
              {/* Profile Picture */}
              <div className="absolute left-6 -bottom-16 z-10">
                <div className="relative">
                  <img
                    src={user?.photoURL || `https://ui-avatars.com/api/?name=${user?.displayName}&background=random`}
                    alt={user?.displayName}
                    className="w-32 h-32 rounded-3xl object-cover border-4 border-slate-900 shadow-lg light:border-white"
                  />
                  {user?.online && (
                    <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-400 rounded-full border-2 border-slate-900 animate-pulse light:border-white" />
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="absolute top-24 right-6 flex gap-2">
                {!isSelf && (
                  <>
                    <ActionButton icon={MessageCircle} onClick={() => handleAction('message')} />
                    <ActionButton icon={Phone} onClick={() => handleAction('voiceCall')} />
                    <ActionButton icon={Video} onClick={() => handleAction('videoCall')} />
                  </>
                )}
              </div>
            </div>

            {/* User Info */}
            <div className="pt-20 px-6 pb-4 border-b border-white/10 light:border-black/10">
              <h3 className="text-2xl font-bold text-white light:text-black">{user?.displayName || 'Unknown User'}</h3>
              <p className="text-sm text-gray-400 light:text-gray-500">@{user?.username || 'username'}</p>
              
              <p className="text-gray-300 mt-3 text-sm light:text-gray-600">
                {user?.bio || 'No bio available.'}
              </p>

              <div className="flex items-center gap-4 mt-4 text-xs text-gray-400 light:text-gray-500">
                <div className="flex items-center gap-1">
                  <Star className="w-3 h-3 text-yellow-400" />
                  <span>{user?.friendCount || 0} Friends</span>
                </div>
                <div className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  <span>Last seen {getLastSeen()}</span>
                </div>
              </div>
            </div>

            {/* Tabs */}
            <div className="px-6 py-2 border-b border-white/10 light:border-black/10">
              <div className="flex gap-4">
                {tabs.map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                      activeTab === tab.id
                        ? 'text-purple-300 bg-purple-500/10 light:text-blue-600 light:bg-blue-500/10'
                        : 'text-gray-400 hover:text-white hover:bg-white/5 light:text-gray-500 light:hover:text-black light:hover:bg-black/5'
                    }`}
                  >
                    <tab.icon className="w-4 h-4" />
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Tab Content */}
            <div className="p-6">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeTab}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                >
                  {activeTab === 'media' && <MediaTab sharedMedia={sharedMedia} />}
                  {activeTab === 'about' && <AboutTab user={user} />}
                  {activeTab === 'privacy' && isSelf && (
                    <PrivacyTab 
                      settings={privacySettings} 
                      onToggle={handlePrivacyChange} 
                    />
                  )}
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Danger Zone */}
            {!isSelf && (
              <div className="p-6 border-t border-white/10 space-y-2 light:border-black/10">
                <DangerButton icon={VolumeX} text="Mute Notifications" onClick={() => handleAction('mute')} />
                <DangerButton icon={Ban} text="Block User" onClick={() => handleAction('block')} />
                <DangerButton icon={Flag} text="Report User" onClick={() => handleAction('report')} />
                <DangerButton icon={Trash2} text="Clear Chat History" onClick={() => handleAction('clear')} />
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

const ActionButton = ({ icon: Icon, onClick }) => (
  <motion.button
    whileHover={{ scale: 1.1 }}
    whileTap={{ scale: 0.9 }}
    onClick={onClick}
    className="p-3 bg-black/40 backdrop-blur-sm rounded-full text-white hover:bg-black/60 transition-all light:bg-white/40 light:hover:bg-white/60 light:text-black"
  >
    <Icon className="w-5 h-5" />
  </motion.button>
)

const DangerButton = ({ icon: Icon, text, onClick }) => (
  <button onClick={onClick} className="w-full flex items-center gap-3 p-3 rounded-lg text-red-400 hover:bg-red-500/10 transition-colors text-sm">
    <Icon className="w-4 h-4" />
    {text}
  </button>
)

const MediaTab = ({ sharedMedia }) => {
  const mediaTypes = [
    { id: 'photos', label: 'Photos', icon: ImageIcon, count: sharedMedia.photos.length },
    { id: 'videos', label: 'Videos', icon: Film, count: sharedMedia.videos.length },
    { id: 'documents', label: 'Docs', icon: FileText, count: sharedMedia.documents.length },
    { id: 'voice', label: 'Voice', icon: Mic, count: sharedMedia.voiceNotes.length },
    { id: 'links', label: 'Links', icon: LinkIcon, count: sharedMedia.links.length },
  ]

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
        {mediaTypes.map(type => (
          <div key={type.id} className="bg-white/5 p-3 rounded-lg text-center border border-white/10 light:bg-black/5 light:border-black/10">
            <type.icon className="w-6 h-6 mx-auto mb-1 text-gray-300 light:text-gray-600" />
            <p className="text-xs font-medium text-white light:text-black">{type.label}</p>
            <p className="text-xs text-gray-400 light:text-gray-500">{type.count}</p>
          </div>
        ))}
      </div>
      <h4 className="font-semibold text-white pt-4 light:text-black">Recent Photos & Videos</h4>
      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
        {[...sharedMedia.photos, ...sharedMedia.videos].slice(0, 8).map(item => (
          <div key={item.id} className="aspect-square bg-white/5 rounded-lg overflow-hidden light:bg-black/5">
            {item.type === 'image' ? (
              <img src={item.mediaUrl} className="w-full h-full object-cover" />
            ) : (
              <div className="relative w-full h-full">
                <video src={item.mediaUrl} className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                  <Film className="w-6 h-6 text-white" />
                </div>
              </div>
            )}
          </div>
        ))}
        {sharedMedia.photos.length === 0 && sharedMedia.videos.length === 0 && (
          <p className="col-span-full text-center text-sm text-gray-400 py-4 light:text-gray-500">No photos or videos shared yet.</p>
        )}
      </div>
    </div>
  )
}

const AboutTab = ({ user }) => (
  <div className="space-y-4">
    <InfoItem icon={Mail} label="Email" value={user?.email} />
    <InfoItem icon={Calendar} label="Joined" value={user?.createdAt ? new Date(user.createdAt.seconds * 1000).toLocaleDateString() : 'N/A'} />
    <InfoItem icon={MapPin} label="Location" value={user?.location || 'Not specified'} />
    <InfoItem icon={LinkIcon} label="Website" value={user?.website} isLink />
  </div>
)

const InfoItem = ({ icon: Icon, label, value, isLink }) => (
  <div className="flex items-start gap-4 p-3 bg-white/5 rounded-lg border border-white/10 light:bg-black/5 light:border-black/10">
    <Icon className="w-5 h-5 text-gray-400 mt-1" />
    <div>
      <p className="text-xs text-gray-400 light:text-gray-500">{label}</p>
      {isLink && value ? (
        <a href={value} target="_blank" rel="noopener noreferrer" className="text-purple-400 hover:underline light:text-blue-500">
          {value}
        </a>
      ) : (
        <p className="font-medium text-white light:text-black">{value || 'Not specified'}</p>
      )}
    </div>
  </div>
)

const PrivacyTab = ({ settings, onToggle }) => (
  <div className="space-y-3">
    <PrivacyToggle
      label="Show Last Seen"
      description="Allow others to see when you were last active."
      icon={Eye}
      enabled={settings.showLastSeen}
      onToggle={(val) => onToggle('showLastSeen', val)}
    />
    <PrivacyToggle
      label="Show Profile Photo"
      description="Allow others to see your profile picture."
      icon={Camera}
      enabled={settings.showProfilePhoto}
      onToggle={(val) => onToggle('showProfilePhoto', val)}
    />
    <PrivacyToggle
      label="Show Status / Bio"
      description="Allow others to see your status and bio."
      icon={FileText}
      enabled={settings.showStatus}
      onToggle={(val) => onToggle('showStatus', val)}
    />
  </div>
)

const PrivacyToggle = ({ label, description, icon: Icon, enabled, onToggle }) => (
  <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg border border-white/10 light:bg-black/5 light:border-black/10">
    <div className="flex items-center gap-4">
      <Icon className="w-5 h-5 text-gray-400" />
      <div>
        <p className="font-medium text-white light:text-black">{label}</p>
        <p className="text-xs text-gray-400 light:text-gray-500">{description}</p>
      </div>
    </div>
    <button
      onClick={() => onToggle(!enabled)}
      className={`relative w-12 h-7 rounded-full transition-colors duration-300 ${
        enabled ? 'bg-purple-500 light:bg-blue-500' : 'bg-gray-600 light:bg-gray-300'
      }`}
    >
      <motion.div
        layout
        transition={{ type: 'spring', stiffness: 700, damping: 30 }}
        className={`absolute top-1 w-5 h-5 bg-white rounded-full ${
          enabled ? 'left-6' : 'left-1'
        }`}
      />
    </button>
  </div>
)
