import React, { useEffect, useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, User, Mail, Save, Camera, Upload, ImageIcon, Trash2 } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { useUI } from '../../contexts/UIContext'
import { doc, setDoc } from 'firebase/firestore'
import { db } from '../../firebase'
import { uploadToCloudinary } from '../../utils/cloudinary'

export default function EditProfileModal({ open, onClose }) {
  const { user, userDoc } = useAuth()
  const { showToast } = useUI()
  const [displayName, setDisplayName] = useState('')
  const [email, setEmail] = useState('')
  const [bio, setBio] = useState('')
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  
  // Photo preview states
  const [selectedFile, setSelectedFile] = useState(null)
  const [photoPreview, setPhotoPreview] = useState(null)
  const [showPhotoPreview, setShowPhotoPreview] = useState(false)
  const fileInputRef = useRef(null)

  useEffect(() => {
    if (!open) return
    setDisplayName(userDoc?.displayName || user?.displayName || '')
    setEmail(userDoc?.email || user?.email || '')
    setBio(userDoc?.bio || '')
    setPhotoPreview(userDoc?.avatarUrl || user?.photoURL || null)
    setSelectedFile(null)
    setShowPhotoPreview(false)
  }, [open, userDoc, user])

  if (!open) return null

  const handlePhotoSelect = (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith('image/')) {
      showToast('Please select an image file', 'error')
      return
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      showToast('Image must be less than 10MB', 'error')
      return
    }

    setSelectedFile(file)
    const reader = new FileReader()
    reader.onload = (e) => {
      setPhotoPreview(e.target.result)
      setShowPhotoPreview(true)
    }
    reader.readAsDataURL(file)
  }

  const handleRemovePhoto = () => {
    setSelectedFile(null)
    setPhotoPreview(userDoc?.avatarUrl || user?.photoURL || null)
    setShowPhotoPreview(false)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleUploadPhoto = async () => {
    if (!selectedFile) return null

    setUploading(true)
    try {
      const result = await uploadToCloudinary(selectedFile, (progress) => {
        // Optional: Show progress
      })

      if (!result.success) {
        throw new Error(result.error || 'Upload failed')
      }

      showToast('Photo uploaded successfully!', 'success')
      return result.url
    } catch (error) {
      console.error('Upload error:', error)
      showToast(error.message || 'Failed to upload photo', 'error')
      return null
    } finally {
      setUploading(false)
    }
  }

  async function handleSave() {
    if (!user?.uid) return showToast('Sign in to edit profile', 'error')
    setSaving(true)
    try {
      const updateData = { 
        displayName: displayName || '', 
        email: email || '',
        bio: bio || '',
        updatedAt: new Date()
      }

      // Upload photo if selected
      if (selectedFile) {
        const photoUrl = await handleUploadPhoto()
        if (photoUrl) {
          updateData.avatarUrl = photoUrl
        }
      }

      const ref = doc(db, 'users', user.uid)
      await setDoc(ref, updateData, { merge: true })
      
      showToast('Profile updated successfully', 'success')
      setShowPhotoPreview(false)
      setSelectedFile(null)
      onClose()
    } catch (e) {
      console.error('update profile failed', e)
      showToast('Failed to save profile', 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center p-4">
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm light:bg-gray-900/20" 
        onClick={onClose} 
      />
      
      <motion.div
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        className="relative z-10 w-full max-w-md bg-gradient-to-br from-slate-900 to-slate-800 rounded-3xl border border-white/10 shadow-2xl overflow-hidden light:from-white light:to-gray-50 light:border-black/10 max-h-[90vh] flex flex-col"
      >
        {/* Enhanced Header */}
        <div className="relative p-6 bg-gradient-to-r from-slate-800/50 to-slate-900/50 border-b border-white/10 light:bg-gray-100/50 light:border-black/10 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white shadow-lg light:from-blue-500 light:to-cyan-500">
                <User className="w-6 h-6" />
              </div>
              <div>
                <div className="font-bold text-white text-lg light:text-black">Edit Profile</div>
                <div className="text-sm text-gray-400 mt-1 light:text-gray-500">Update your personal information</div>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-xl hover:bg-white/10 transition-all duration-200 group light:hover:bg-black/5"
            >
              <X className="w-5 h-5 text-gray-400 group-hover:text-white transition-colors light:text-gray-600 light:group-hover:text-black" />
            </button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto scrollbar-thin">
          {/* Photo Preview Section */}
          <AnimatePresence>
            {showPhotoPreview && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="p-6 bg-white/5 border-b border-white/10 light:bg-black/5"
              >
                <div className="text-center">
                  <p className="text-sm font-medium text-white mb-4 light:text-black">Photo Preview</p>
                  <div className="relative inline-block">
                    <img
                      src={photoPreview}
                      alt="Preview"
                      className="w-32 h-32 rounded-3xl object-cover border-4 border-purple-500/50 shadow-xl"
                    />
                    <button
                      onClick={handleRemovePhoto}
                      className="absolute -top-2 -right-2 w-8 h-8 bg-red-500 hover:bg-red-600 rounded-full flex items-center justify-center shadow-lg transition-all"
                    >
                      <Trash2 className="w-4 h-4 text-white" />
                    </button>
                  </div>
                  <p className="text-xs text-gray-400 mt-3 light:text-gray-500">
                    {selectedFile ? `${(selectedFile.size / 1024 / 1024).toFixed(2)} MB` : 'Current photo'}
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Enhanced Form */}
          <div className="p-6 space-y-6">
            {/* Profile Photo Upload */}
            <div className="group">
              <label className="flex items-center gap-2 text-sm font-medium text-gray-300 mb-3 light:text-gray-600">
                <div className="p-2 bg-white/5 rounded-lg light:bg-black/5">
                  <Camera className="w-4 h-4 text-pink-400 light:text-pink-500" />
                </div>
                Profile Photo
              </label>
              
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handlePhotoSelect}
                className="hidden"
                id="photo-upload"
              />
              
              <div className="flex items-center gap-3">
                {/* Current/Preview Avatar */}
                <div className="relative w-20 h-20 rounded-2xl overflow-hidden bg-gradient-to-br from-purple-500 to-pink-500 flex-shrink-0">
                  {photoPreview ? (
                    <img src={photoPreview} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-white text-2xl font-bold">
                      {(displayName || user?.displayName || 'U')[0].toUpperCase()}
                    </div>
                  )}
                </div>

                {/* Upload Button */}
                <label
                  htmlFor="photo-upload"
                  className="flex-1 py-3 px-4 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-purple-500/50 rounded-2xl cursor-pointer transition-all duration-300 group light:bg-black/5 light:hover:bg-black/10 light:border-black/10 light:hover:border-blue-500/50"
                >
                  <div className="flex items-center justify-center gap-2 text-gray-300 group-hover:text-white light:text-gray-600 light:group-hover:text-black">
                    <Upload className="w-4 h-4" />
                    <span className="text-sm font-medium">Choose Photo</span>
                  </div>
                </label>
              </div>
              
              <p className="text-xs text-gray-500 mt-2 light:text-gray-400">
                Recommended: Square image, max 10MB
              </p>
            </div>

            <div className="space-y-4">
              {/* Display Name Field */}
              <div className="group">
                <label className="flex items-center gap-2 text-sm font-medium text-gray-300 mb-3 light:text-gray-600">
                  <div className="p-2 bg-white/5 rounded-lg light:bg-black/5">
                    <User className="w-4 h-4 text-purple-400 light:text-blue-500" />
                  </div>
                  Display Name
                </label>
                <input
                  value={displayName}
                  onChange={e => setDisplayName(e.target.value)}
                  placeholder="Enter your display name"
                  className="w-full px-4 py-4 bg-white/5 border border-white/10 rounded-2xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 transition-all duration-300 backdrop-blur-sm group-hover:bg-white/10 light:bg-black/5 light:border-black/10 light:text-black light:placeholder-gray-500 light:focus:ring-blue-500/50 light:focus:border-blue-500/50 light:group-hover:bg-black/10"
                />
              </div>

              {/* Bio Field */}
              <div className="group">
                <label className="flex items-center gap-2 text-sm font-medium text-gray-300 mb-3 light:text-gray-600">
                  <div className="p-2 bg-white/5 rounded-lg light:bg-black/5">
                    <ImageIcon className="w-4 h-4 text-blue-400" />
                  </div>
                  Bio
                </label>
                <textarea
                  value={bio}
                  onChange={e => setBio(e.target.value)}
                  placeholder="Tell us about yourself..."
                  maxLength={150}
                  rows={3}
                  className="w-full px-4 py-4 bg-white/5 border border-white/10 rounded-2xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all duration-300 backdrop-blur-sm group-hover:bg-white/10 resize-none light:bg-black/5 light:border-black/10 light:text-black light:placeholder-gray-500 light:focus:ring-blue-500/50 light:focus:border-blue-500/50 light:group-hover:bg-black/10"
                />
                <p className="text-xs text-gray-500 mt-1 text-right light:text-gray-400">{bio.length}/150</p>
              </div>

              {/* Email Field */}
              <div className="group">
                <label className="flex items-center gap-2 text-sm font-medium text-gray-300 mb-3 light:text-gray-600">
                  <div className="p-2 bg-white/5 rounded-lg light:bg-black/5">
                    <Mail className="w-4 h-4 text-green-400" />
                  </div>
                  Email Address
                </label>
                <input
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  type="email"
                  className="w-full px-4 py-4 bg-white/5 border border-white/10 rounded-2xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500/50 focus:border-green-500/50 transition-all duration-300 backdrop-blur-sm group-hover:bg-white/10 light:bg-black/5 light:border-black/10 light:text-black light:placeholder-gray-500 light:focus:ring-blue-500/50 light:focus:border-blue-500/50 light:group-hover:bg-black/10"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Enhanced Action Buttons - Fixed at bottom */}
        <div className="p-6 border-t border-white/10 bg-slate-900/50 flex-shrink-0 light:bg-gray-100/50 light:border-black/10">
          <div className="flex gap-3">
            <button
              onClick={onClose}
              disabled={saving || uploading}
              className="flex-1 py-4 px-6 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl text-white font-medium transition-all duration-300 hover:border-white/20 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed light:bg-black/5 light:hover:bg-black/10 light:border-black/10 light:text-black light:hover:border-black/20"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving || uploading}
              className="flex-1 py-4 px-6 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 disabled:from-gray-500 disabled:to-gray-600 rounded-2xl text-white font-medium transition-all duration-300 hover:scale-105 flex items-center justify-center gap-3 disabled:cursor-not-allowed light:from-blue-500 light:to-cyan-500 light:hover:from-blue-600 light:hover:to-cyan-600"
            >
              {saving || uploading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  {uploading ? 'Uploading...' : 'Saving...'}
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Save Changes
                </>
              )}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  )
}

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center p-4">
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm light:bg-gray-900/20" 
        onClick={onClose} 
      />
      
      <motion.div
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        className="relative z-10 w-full max-w-md bg-gradient-to-br from-slate-900 to-slate-800 rounded-3xl border border-white/10 shadow-2xl overflow-hidden light:from-white light:to-gray-50 light:border-black/10"
      >
        {/* Enhanced Header */}
        <div className="relative p-6 bg-gradient-to-r from-slate-800/50 to-slate-900/50 border-b border-white/10 light:bg-gray-100/50 light:border-black/10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white shadow-lg light:from-blue-500 light:to-cyan-500">
                <User className="w-6 h-6" />
              </div>
              <div>
                <div className="font-bold text-white text-lg light:text-black">Edit Profile</div>
                <div className="text-sm text-gray-400 mt-1 light:text-gray-500">Update your personal information</div>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-xl hover:bg-white/10 transition-all duration-200 group light:hover:bg-black/5"
            >
              <X className="w-5 h-5 text-gray-400 group-hover:text-white transition-colors light:text-gray-600 light:group-hover:text-black" />
            </button>
          </div>
        </div>

        {/* Enhanced Form */}
        <div className="p-6 space-y-6">
          <div className="space-y-4">
            {/* Display Name Field */}
            <div className="group">
              <label className="flex items-center gap-2 text-sm font-medium text-gray-300 mb-3 light:text-gray-600">
                <div className="p-2 bg-white/5 rounded-lg light:bg-black/5">
                  <User className="w-4 h-4 text-purple-400 light:text-blue-500" />
                </div>
                Display Name
              </label>
              <input
                value={displayName}
                onChange={e => setDisplayName(e.target.value)}
                placeholder="Enter your display name"
                className="w-full px-4 py-4 bg-white/5 border border-white/10 rounded-2xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 transition-all duration-300 backdrop-blur-sm group-hover:bg-white/10 light:bg-black/5 light:border-black/10 light:text-black light:placeholder-gray-500 light:focus:ring-blue-500/50 light:focus:border-blue-500/50 light:group-hover:bg-black/10"
              />
            </div>

            {/* Email Field */}
            <div className="group">
              <label className="flex items-center gap-2 text-sm font-medium text-gray-300 mb-3 light:text-gray-600">
                <div className="p-2 bg-white/5 rounded-lg light:bg-black/5">
                  <Mail className="w-4 h-4 text-blue-400" />
                </div>
                Email Address
              </label>
              <input
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="your@email.com"
                className="w-full px-4 py-4 bg-white/5 border border-white/10 rounded-2xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all duration-300 backdrop-blur-sm group-hover:bg-white/10 light:bg-black/5 light:border-black/10 light:text-black light:placeholder-gray-500 light:focus:ring-blue-500/50 light:focus:border-blue-500/50 light:group-hover:bg-black/10"
              />
            </div>
          </div>

          {/* Enhanced Action Buttons */}
          <div className="flex gap-3 pt-4">
            <button
              onClick={onClose}
              className="flex-1 py-4 px-6 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl text-white font-medium transition-all duration-300 hover:border-white/20 hover:scale-105 light:bg-black/5 light:hover:bg-black/10 light:border-black/10 light:text-black light:hover:border-black/20"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 py-4 px-6 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 disabled:from-gray-500 disabled:to-gray-600 rounded-2xl text-white font-medium transition-all duration-300 hover:scale-105 flex items-center justify-center gap-3 light:from-blue-500 light:to-cyan-500 light:hover:from-blue-600 light:hover:to-cyan-600"
            >
              {saving ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Save Changes
                </>
              )}
            </button>
          </div>
        </div>

        {/* Enhanced Footer */}
        <div className="p-4 bg-slate-800/50 border-t border-white/10 light:bg-gray-100/50 light:border-black/10">
          <div className="text-xs text-gray-400 text-center light:text-gray-500">
            Your profile information is secure and encrypted
          </div>
        </div>
      </motion.div>
    </div>
  )
}