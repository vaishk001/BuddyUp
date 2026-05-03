import React, { useState } from 'react'
import Sidebar from '../components/Sidebar/Sidebar'
import ChatList from '../components/ChatList/ChatList'
import ChatWindow from '../components/ChatWindow/ChatWindow'
import { useAuth } from '../contexts/AuthContext'

export default function Home() {
  const { user } = useAuth()
  const [selectedChatId, setSelectedChatId] = useState(null)
  const [showSidebar, setShowSidebar] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [activeFilter, setActiveFilter] = useState('all')

  return (
    <div className="h-screen w-full flex overflow-hidden bg-[url('https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=2564&auto=format&fit=crop')] bg-cover bg-center">
      {/* Dark Overlay for background image */}
      <div className="absolute inset-0 bg-slate-900/90 backdrop-blur-sm z-0" />

      {/* Main Container */}
      <div className="relative z-10 flex w-full h-full max-w-[1920px] mx-auto p-0 md:p-4 gap-4">
        
        {/* Sidebar Area */}
        <div className={`${showSidebar ? 'flex' : 'hidden'} md:flex flex-col w-full md:w-[380px] h-full glass rounded-2xl overflow-hidden shadow-2xl border border-white/5`}>
          {/* Sidebar Header */}
          <div className="flex-shrink-0 bg-slate-900/50 backdrop-blur-md border-b border-white/5">
            <Sidebar 
              onCreateChat={(id) => {
                setSelectedChatId(id)
                if (window.innerWidth < 768) setShowSidebar(false)
              }}
              onSelectChat={(chat) => {
                setSelectedChatId(chat.id)
                if (window.innerWidth < 768) setShowSidebar(false)
              }}
              onClose={() => setShowSidebar(false)}
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              activeFilter={activeFilter}
              setActiveFilter={setActiveFilter}
            />
          </div>

          {/* Chat List */}
          <div className="flex-1 overflow-y-auto custom-scrollbar bg-slate-900/30">
            <ChatList 
              selectedChatId={selectedChatId} 
              onSelect={(id) => {
                setSelectedChatId(id)
                if (window.innerWidth < 768) setShowSidebar(false)
              }}
              searchQuery={searchQuery}
              activeFilter={activeFilter}
            />
          </div>
        </div>

        {/* Chat Window Area */}
        <div className={`${!showSidebar ? 'flex' : 'hidden'} md:flex flex-1 h-full glass rounded-2xl overflow-hidden shadow-2xl border border-white/5 relative`}>
          {selectedChatId ? (
            <ChatWindow chatId={selectedChatId} onBack={() => setShowSidebar(true)} />
          ) : (
            <div className="flex flex-col items-center justify-center w-full h-full text-slate-400">
              <div className="w-24 h-24 bg-slate-800/50 rounded-full flex items-center justify-center mb-4 animate-pulse-slow">
                <svg className="w-12 h-12 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-slate-200 mb-2">Welcome to ChatWave</h2>
              <p className="text-slate-500">Select a chat to start messaging</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
