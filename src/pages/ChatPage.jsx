import React, { useState, useEffect } from 'react'
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
  const [selectedChat, setSelectedChat] = useState(null)
  const [activeTab, setActiveTab] = useState('chats')
  const [showInfoPanel, setShowInfoPanel] = useState(true)
  const [chatData, setChatData] = useState(null)

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
            onSelectChat={setSelectedChat}
            onCreateChat={(chatId) => setSelectedChat({ id: chatId })}
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
        <div className="flex-1 overflow-auto">
          <SettingsPage />
        </div>
      )
    }

    if (activeTab === 'chats') {
      return (
        <div className="flex-1 flex min-w-0 bg-slate-900 relative">
          {selectedChat ? (
            <ChatWindow 
              chatId={selectedChat.id}
              onBack={() => setSelectedChat(null)}
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
      <div className="flex-1 flex items-center justify-center bg-slate-900">
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
    <div className="flex h-screen bg-slate-950 text-white overflow-hidden">
      {/* Navigation Rail */}
      <NavigationRail 
        activeTab={activeTab} 
        onTabChange={setActiveTab} 
      />

      {/* Left Panel (Sidebar/Calls/Contacts) */}
      {activeTab !== 'settings' && (
        <div className="w-80 lg:w-96 h-full flex-shrink-0">
          {renderLeftPanel()}
        </div>
      )}

      {/* Main Content Area */}
      {renderMainContent()}
    </div>
  )
}
