import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import NavigationRail from '../components/Navigation/NavigationRail'
import Sidebar from '../components/Sidebar/Sidebar'
import ChatWindow from '../components/ChatWindow/ChatWindow'
import InfoPanel from '../components/InfoPanel/InfoPanel'
import CallsPanel from '../components/Calls/CallsPanel'
import ContactsPanel from '../components/Contacts/ContactsPanel'
import FriendRequestsPanel from '../components/FriendRequests/FriendRequestsPanel'
import SettingsPage from './SettingsPage'
import { getChat } from '../services/firestore'

export default function ChatPage() {
  const { chatId: urlChatId } = useParams()
  const navigate = useNavigate()
  const [selectedChat, setSelectedChat] = useState(urlChatId ? { id: urlChatId } : null)
  const [activeTab, setActiveTab] = useState('chats')
  const [showInfoPanel, setShowInfoPanel] = useState(true)
  const [chatData, setChatData] = useState(null)

  // Sync URL param to selectedChat
  useEffect(() => {
    if (urlChatId && (!selectedChat || selectedChat.id !== urlChatId)) {
      setSelectedChat({ id: urlChatId })
    }
  }, [urlChatId])

  // Fetch chat data when selectedChat changes
  useEffect(() => {
    if (selectedChat?.id) {
      getChat(selectedChat.id).then(setChatData)
    } else {
      setChatData(null)
    }
  }, [selectedChat])

  // Reset selected chat when switching tabs
  useEffect(() => {
    if (activeTab !== 'chats') {
      setSelectedChat(null)
    }
  }, [activeTab])

  // Render left panel based on active tab
  const renderLeftPanel = () => {
    switch (activeTab) {
      case 'chats':
        return (
          <Sidebar 
            selectedChatId={selectedChat?.id}
            onSelectChat={(chat) => {
              setSelectedChat(chat)
              navigate(`/chat/${chat.id}`, { replace: true })
            }}
            onCreateChat={(chatId) => {
              setSelectedChat({ id: chatId })
              navigate(`/chat/${chatId}`, { replace: true })
            }}
          />
        )
      case 'friend-requests':
        return <FriendRequestsPanel open={true} onClose={() => setActiveTab('chats')} />
      case 'calls':
        return <CallsPanel />
      case 'contacts':
        return <ContactsPanel />
      case 'settings':
        return null // Settings takes full width
      default:
        return null
    }
  }

  // Render main content based on active tab
  const renderMainContent = () => {
    if (activeTab === 'settings') {
      return (
        <div className="flex-1 h-full w-full overflow-auto">
          <SettingsPage onBack={() => setActiveTab('chats')} />
        </div>
      )
    }

    if (activeTab === 'chats') {
      return (
        <div className="flex-1 h-full w-full flex min-w-0 bg-slate-900 relative">
          {selectedChat ? (
            <ChatWindow 
              chatId={selectedChat.id}
              onBack={() => {
                setSelectedChat(null)
                navigate('/chat', { replace: true })
              }}
              onToggleInfo={() => setShowInfoPanel(!showInfoPanel)}
            />
          ) : (
            <div className="flex-1 flex items-center justify-center bg-slate-900">
              <div className="text-center text-gray-500">
                <p className="text-xl font-medium mb-2">Select a chat to start messaging</p>
              </div>
            </div>
          )}

          {/* Info Panel */}
          <AnimatePresence>
            {showInfoPanel && selectedChat && (
              <motion.div
                initial={{ width: 0, opacity: 0 }}
                animate={{ width: 320, opacity: 1 }}
                exit={{ width: 0, opacity: 0 }}
                className="h-full border-l border-white/5 bg-slate-900 overflow-hidden flex-shrink-0"
              >
                <div className="w-80 h-full">
                  <InfoPanel 
                    chat={chatData} 
                    onClose={() => setShowInfoPanel(false)} 
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )
    }

    // For friend-requests, calls and contacts, show empty state
    return (
      <div className="flex-1 h-full w-full flex items-center justify-center bg-slate-900">
        <div className="text-center text-gray-500">
          <p className="text-xl font-medium mb-2">
            {activeTab === 'friend-requests' ? 'Manage your friend requests' : 
             activeTab === 'calls' ? 'Select a call to view details' : 
             'Select a contact to start chatting'}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen w-full bg-slate-950 text-white overflow-hidden">
      {/* Navigation Rail - Hidden on mobile when a chat is open */}
      <div className={`${selectedChat ? 'hidden md:flex' : 'flex'} flex-shrink-0 h-full`}>
        <NavigationRail 
          activeTab={activeTab} 
          onTabChange={setActiveTab} 
        />
      </div>

      {/* Left Panel (Sidebar/Calls/Contacts) - Hidden on mobile when a chat is open */}
      {activeTab !== 'settings' && (
        <div className={`flex-1 md:w-80 lg:w-96 md:flex-none h-full flex-shrink-0 ${selectedChat ? 'hidden md:flex' : 'flex'} flex-col`}>
          {renderLeftPanel()}
        </div>
      )}

      {/* Main Content Area - Hidden on mobile when NO chat is open AND not on settings tab */}
      <div className={`flex-1 h-full min-w-0 ${!selectedChat && activeTab !== 'settings' ? 'hidden md:flex' : 'flex'} flex-col`}>
        {renderMainContent()}
      </div>
    </div>
  )
}
