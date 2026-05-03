import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Plus, 
  Search,
  MoreVertical,
  Filter,
  Upload
} from 'lucide-react'
import ChatList from '../ChatList/ChatList'
import FriendRequestsPanel from '../FriendRequests/FriendRequestsPanel'
import StoriesPanel from '../Stories/StoriesPanel'
import NewChatModal from './NewChatModal'
import { useAuth } from '../../contexts/AuthContext'
import { useUI } from '../../contexts/UIContext'
import { createStory, listenStories } from '../../services/firestore'
import { uploadToCloudinary } from '../../utils/cloudinary'

export default function Sidebar({ 
  onCreateChat, 
  onSelectChat, 
  selectedChatId
}) {
  const [searchQuery, setSearchQuery] = useState('')
  const [showNewChat, setShowNewChat] = useState(false)
  const [showStories, setShowStories] = useState(false)
  const [myStories, setMyStories] = useState([])
  const [uploadingStory, setUploadingStory] = useState(false)
  const { user, userDoc } = useAuth()
  const { showToast } = useUI()

  // Debug: Log when userDoc changes
  useEffect(() => {
    console.log('Sidebar - userDoc updated:', userDoc?.avatarUrl)
  }, [userDoc])

  // Listen to user's stories
  useEffect(() => {
    if (!user?.uid) return
    
    const unsub = listenStories(user.uid, (stories) => {
      setMyStories(stories)
    })
    
    return unsub
  }, [user?.uid])

  const handleStoryClick = () => {
    if (myStories.length > 0) {
      // View existing stories
      setShowStories(true)
    } else {
      // Create new story
      handleCreateStory()
    }
  }

  const handleCreateStory = () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/*,video/*'
    input.onchange = async (e) => {
      const file = e.target.files?.[0]
      if (!file) return

      if (file.size > 50 * 1024 * 1024) {
        showToast('File too large. Maximum size is 50MB', 'error')
        return
      }

      try {
        setUploadingStory(true)
        showToast('Uploading story...', 'info')

        const result = await uploadToCloudinary(file)
        
        if (!result.success) {
          throw new Error(result.error || 'Upload failed')
        }

        const mediaType = file.type.startsWith('video') ? 'video' : 'image'

        await createStory(user.uid, result.url, mediaType)
        showToast('Story created successfully!', 'success')
      } catch (error) {
        console.error('Create story error:', error)
        showToast(error.message || 'Failed to create story', 'error')
      } finally {
        setUploadingStory(false)
      }
    }
    input.click()
  }

  return (
    <div className="w-full h-full flex flex-col bg-slate-900 border-r border-white/5">
      {/* Header */}
      <div className="p-6 pb-2 pt-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white">Messages</h1>
            <p className="text-sm text-gray-400">
              {user?.displayName || 'Welcome back'}
            </p>
          </div>
          <div className="flex gap-2">
            <button 
              onClick={() => setShowNewChat(true)}
              className="p-2 rounded-xl bg-indigo-500 text-white shadow-lg shadow-indigo-500/25 hover:bg-indigo-600 transition-colors"
            >
              <Plus className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="relative mb-6">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            type="text"
            placeholder="Search people, groups..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-800/50 border border-white/5 rounded-xl py-3 pl-10 pr-4 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all"
          />
        </div>

        {/* My Story Only */}
        <div className="mb-6">
          <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
            <div className="flex flex-col items-center gap-2 min-w-[64px] group relative">
              <div 
                onClick={handleStoryClick}
                className={`relative w-16 h-16 rounded-full p-0.5 cursor-pointer ${myStories.length > 0 ? 'bg-gradient-to-br from-purple-500 to-pink-500' : 'border-2 border-dashed border-gray-500'}`}
              >
                <div className="w-full h-full rounded-full border-2 border-slate-900 overflow-hidden bg-slate-800">
                  {(userDoc?.avatarUrl || user?.photoURL) ? (
                    <img src={userDoc?.avatarUrl || user?.photoURL} alt="My Story" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 text-white font-bold text-lg">
                      {user?.displayName?.[0]?.toUpperCase() || '+'}
                    </div>
                  )}
                </div>
                {uploadingStory ? (
                  <div className="absolute bottom-0 right-0 w-5 h-5 bg-slate-700 rounded-full border-2 border-slate-900 flex items-center justify-center">
                    <div className="w-3 h-3 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : (
                  <div className="absolute bottom-0 right-0 w-5 h-5 bg-indigo-500 rounded-full border-2 border-slate-900 flex items-center justify-center text-white group-hover:bg-indigo-600 transition-colors">
                    {myStories.length > 0 ? (
                      <Upload className="w-3 h-3" />
                    ) : (
                      <Plus className="w-3 h-3" />
                    )}
                  </div>
                )}
              </div>
              <div className="flex flex-col items-center gap-1 w-full">
                <span className="text-xs font-medium text-gray-400 group-hover:text-white transition-colors truncate w-full text-center">
                  {myStories.length > 0 ? `My Story (${myStories.length})` : 'My Story'}
                </span>
                {myStories.length > 0 && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      setShowStories(true)
                    }}
                    className="text-[10px] text-indigo-400 hover:text-indigo-300 transition-colors font-medium"
                  >
                    Preview
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Chat List */}
      <div className="flex-1 overflow-hidden">
        <ChatList 
          searchQuery={searchQuery}
          selectedChatId={selectedChatId}
          onSelect={(chatId) => onSelectChat && onSelectChat({ id: chatId })}
        />
      </div>

      <NewChatModal 
        open={showNewChat} 
        onClose={() => setShowNewChat(false)} 
        onCreated={onCreateChat} 
      />

      <StoriesPanel 
        open={showStories}
        onClose={() => setShowStories(false)}
        stories={myStories}
        currentUser={user}
        onAddStory={handleCreateStory}
      />
    </div>
  )
}
