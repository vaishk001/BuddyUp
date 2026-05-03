import React, { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  X, 
  Edit2, 
  Image, 
  Shield, 
  Bell, 
  LogOut,
  Camera,
  QrCode,
  Star,
  User,
  Mail,
  Calendar,
  MapPin,
  Link,
  Download,
  Share,
  Verified,
  Crown,
  Sparkles,
  Zap,
  Trophy,
  Settings,
  Heart
} from 'lucide-react'

export default function ProfileModal({ open, onClose, user }) {
  const [activeTab, setActiveTab] = useState('profile')
  const [isEditing, setIsEditing] = useState(false)
  const [editedBio, setEditedBio] = useState(user?.bio || '🌟 Available for chat')
  const fileInputRef = useRef(null)

  if (!open) return null

  const stats = [
    { label: 'Messages', value: '1.2K', icon: MessageCircle, color: 'text-blue-400' },
    { label: 'Groups', value: '8', icon: Users, color: 'text-green-400' },
    { label: 'Media', value: '156', icon: Image, color: 'text-purple-400' },
    { label: 'Streak', value: '47', icon: Zap, color: 'text-orange-400' }
  ]

  const achievements = [
    { icon: Trophy, label: 'Chat Master', progress: 100, color: 'from-yellow-400 to-orange-500' },
    { icon: Sparkles, label: 'Early Adopter', progress: 100, color: 'from-purple-400 to-pink-500' },
    { icon: Crown, label: 'Social Butterfly', progress: 75, color: 'from-blue-400 to-cyan-500' },
    { icon: Heart, label: 'Helper', progress: 60, color: 'from-red-400 to-pink-500' }
  ]

  const quickActions = [
    { icon: Edit2, label: 'Edit Profile', color: 'text-blue-400', description: 'Update your information' },
    { icon: Image, label: 'Change Theme', color: 'text-green-400', description: 'Customize appearance' },
    { icon: Bell, label: 'Notifications', color: 'text-yellow-400', description: 'Manage alerts' },
    { icon: Shield, label: 'Privacy', color: 'text-purple-400', description: 'Security settings' },
    { icon: QrCode, label: 'QR Code', color: 'text-orange-400', description: 'Share your profile' },
    { icon: Star, label: 'Starred', color: 'text-yellow-400', description: 'Saved messages' }
  ]

  const handleImageUpload = (event) => {
    const file = event.target.files[0]
    if (file) {
      // Handle image upload logic here
      console.log('Uploading image:', file)
    }
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 flex items-center justify-center z-50 p-4"
      >
        {/* Enhanced Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-gradient-to-br from-purple-900/40 via-blue-900/40 to-pink-900/40 backdrop-blur-xl light:bg-gray-900/20"
          onClick={onClose}
        />
        
        {/* Enhanced Modal */}
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          className="relative w-full max-w-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-3xl shadow-2xl border border-white/10 overflow-hidden backdrop-blur-xl z-10 light:from-white light:via-gray-50 light:to-white light:border-black/10"
        >
          {/* Enhanced Header */}
          <div className="relative p-6 border-b border-white/10 bg-gradient-to-r from-slate-800/50 to-slate-900/50 light:border-black/10 light:bg-gray-100/50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white shadow-lg light:from-blue-500 light:to-cyan-500">
                  <User className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-white light:text-black">Profile</h3>
                  <p className="text-sm text-gray-400 mt-1 light:text-gray-500">Manage your account and preferences</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-3 hover:bg-white/10 rounded-2xl transition-all duration-300 group hover:scale-105 light:hover:bg-black/5"
              >
                <X className="w-5 h-5 text-gray-400 group-hover:text-white transition-colors light:text-gray-600 light:group-hover:text-black" />
              </button>
            </div>

            {/* Enhanced Tabs */}
            <div className="flex gap-4 mt-6">
              {['profile', 'achievements', 'settings'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-4 py-2 rounded-xl font-medium transition-all duration-300 capitalize ${
                    activeTab === tab
                      ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30 shadow-lg shadow-purple-500/20 light:bg-blue-500/20 light:text-blue-600 light:border-blue-500/30 light:shadow-blue-500/20'
                      : 'text-gray-400 hover:text-white hover:bg-white/5 light:text-gray-500 light:hover:text-black light:hover:bg-black/5'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>

          {/* Content Area */}
          <div className="max-h-[70vh] overflow-y-auto scrollbar-thin scrollbar-thumb-white/10 light:scrollbar-thumb-black/10">
            {activeTab === 'profile' && (
              <div className="p-6 space-y-6">
                {/* Enhanced Profile Header */}
                <div className="flex flex-col items-center text-center">
                  <div className="relative mb-6 group">
                    <div className="w-32 h-32 rounded-3xl bg-gradient-to-br from-purple-500 via-pink-500 to-orange-500 flex items-center justify-center text-white font-bold text-4xl shadow-2xl shadow-purple-500/25 relative overflow-hidden">
                      {user?.displayName?.[0]?.toUpperCase() || 'U'}
                      <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent" />
                    </div>
                    
                    {/* Enhanced Status Badge */}
                    <div className="absolute -bottom-2 -right-2">
                      <div className="bg-emerald-500 text-white px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 shadow-lg">
                        <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
                        Online
                      </div>
                    </div>

                    {/* Enhanced Upload Button */}
                    <button 
                      onClick={() => fileInputRef.current?.click()}
                      className="absolute bottom-2 left-2 w-10 h-10 bg-blue-500 rounded-2xl flex items-center justify-center border-2 border-slate-800 hover:bg-blue-600 transition-all duration-300 shadow-lg hover:scale-105 group/upload light:border-white"
                    >
                      <Camera className="w-4 h-4 text-white group-hover/upload:scale-110 transition-transform" />
                    </button>
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleImageUpload}
                      accept="image/*"
                      className="hidden"
                    />
                  </div>
                  
                  <div className="mb-4">
                    <div className="flex items-center justify-center gap-2 mb-2">
                      <div className="font-bold text-white text-2xl bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent light:text-black light:bg-none">
                        {user?.displayName || 'Unknown User'}
                      </div>
                      <Verified className="w-5 h-5 text-blue-400 fill-current" />
                    </div>
                    <div className="text-gray-400 flex items-center justify-center gap-2 light:text-gray-500">
                      <Mail className="w-4 h-4" />
                      {user?.email || 'No email provided'}
                    </div>
                  </div>

                  {/* Enhanced Bio Section */}
                  <div className="w-full max-w-md">
                    {isEditing ? (
                      <div className="space-y-3">
                        <textarea
                          value={editedBio}
                          onChange={(e) => setEditedBio(e.target.value)}
                          className="w-full p-4 bg-white/5 border border-white/10 rounded-2xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500/50 resize-none light:bg-black/5 light:border-black/10 light:text-black light:placeholder-gray-500 light:focus:ring-blue-500/50"
                          placeholder="Tell us about yourself..."
                          rows={3}
                        />
                        <div className="flex gap-2">
                          <button 
                            onClick={() => setIsEditing(false)}
                            className="flex-1 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-white transition-all duration-300 light:bg-black/5 light:hover:bg-black/10 light:border-black/10 light:text-black"
                          >
                            Cancel
                          </button>
                          <button 
                            onClick={() => setIsEditing(false)}
                            className="flex-1 py-3 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 rounded-xl text-white font-medium transition-all duration-300 light:from-blue-500 light:to-cyan-500 light:hover:from-blue-600 light:hover:to-cyan-600"
                          >
                            Save Bio
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="relative group">
                        <p className="text-gray-300 text-center light:text-gray-600">
                          {editedBio}
                        </p>
                        <button 
                          onClick={() => setIsEditing(true)}
                          className="absolute -top-2 -right-2 p-2 bg-white/10 rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity light:bg-black/10 light:text-black"
                        >
                          <Edit2 className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Enhanced Stats Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {stats.map((stat) => (
                    <div key={stat.label} className="bg-white/5 p-4 rounded-2xl text-center border border-white/10 hover:border-white/20 transition-all duration-300 light:bg-black/5 light:border-black/10 light:hover:border-black/20">
                      <stat.icon className={`w-6 h-6 mx-auto mb-2 ${stat.color}`} />
                      <div className="text-xl font-bold text-white light:text-black">{stat.value}</div>
                      <div className="text-xs text-gray-400 light:text-gray-500">{stat.label}</div>
                    </div>
                  ))}
                </div>

                {/* Enhanced Social Links */}
                <div className="bg-white/5 p-4 rounded-2xl border border-white/10 light:bg-black/5 light:border-black/10">
                  <h4 className="font-bold text-white mb-3 light:text-black">Social Links</h4>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 text-sm">
                      <MapPin className="w-4 h-4 text-gray-400" />
                      <span className="text-gray-300 light:text-gray-600">Planet Earth</span>
                    </div>
                    <div className="flex items-center gap-3 text-sm">
                      <Link className="w-4 h-4 text-gray-400" />
                      <a href="#" className="text-purple-400 hover:underline light:text-blue-500">chatwave.com</a>
                    </div>
                    <div className="flex items-center gap-3 text-sm">
                      <Calendar className="w-4 h-4 text-gray-400" />
                      <span className="text-gray-300 light:text-gray-600">Joined November 2023</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'achievements' && (
              <div className="p-6">
                <h4 className="font-bold text-white text-lg mb-4 light:text-black">Your Achievements</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {achievements.map((ach) => (
                    <div key={ach.label} className="bg-white/5 p-4 rounded-2xl border border-white/10 flex items-center gap-4 light:bg-black/5 light:border-black/10">
                      <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${ach.color} flex items-center justify-center text-white shadow-lg`}>
                        <ach.icon className="w-6 h-6" />
                      </div>
                      <div className="flex-1">
                        <div className="font-semibold text-white light:text-black">{ach.label}</div>
                        <div className="text-xs text-gray-400 mb-1 light:text-gray-500">Progress</div>
                        <div className="w-full bg-white/10 rounded-full h-1.5 light:bg-black/10">
                          <div 
                            className={`bg-gradient-to-r ${ach.color} h-1.5 rounded-full`}
                            style={{ width: `${ach.progress}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'settings' && (
              <div className="p-6">
                <h4 className="font-bold text-white text-lg mb-4 light:text-black">Quick Settings</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {quickActions.map((action) => (
                    <button key={action.label} className="text-left bg-white/5 p-4 rounded-2xl border border-white/10 hover:border-white/20 transition-all duration-300 flex items-center gap-4 light:bg-black/5 light:border-black/10 light:hover:border-black/20">
                      <div className={`w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center ${action.color} light:bg-black/5`}>
                        <action.icon className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="font-semibold text-white light:text-black">{action.label}</div>
                        <div className="text-xs text-gray-400 light:text-gray-500">{action.description}</div>
                      </div>
                    </button>
                  ))}
                </div>
                <div className="mt-6 flex justify-between items-center bg-red-500/10 p-4 rounded-2xl border border-red-500/20">
                  <div className="flex items-center gap-3">
                    <LogOut className="w-5 h-5 text-red-400" />
                    <div>
                      <div className="font-semibold text-red-300">Logout</div>
                      <div className="text-xs text-red-400/80">Sign out from this device</div>
                    </div>
                  </div>
                  <button className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 rounded-xl text-red-300 font-medium transition-colors">
                    Logout
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Enhanced Footer */}
          <div className="p-6 border-t border-white/10 bg-slate-800/50">
            <button
              className="w-full flex items-center justify-center gap-3 p-4 rounded-2xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 transition-all duration-300 group hover:scale-105"
            >
              <LogOut className="w-5 h-5" />
              <span className="font-medium">Sign Out</span>
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

// Add missing icon imports
const MessageCircle = ({ className }) => <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
const Users = ({ className }) => <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" /></svg>
const Globe = ({ className }) => <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9v-9m0-9v9m0 9a9 9 0 01-9-9m9 9c0 5-4 9-9 9s-9-4-9-9m9-9a9 9 0 00-9 9" /></svg>