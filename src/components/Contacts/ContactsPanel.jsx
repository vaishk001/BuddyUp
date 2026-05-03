import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Users, Search, Plus, UserPlus, Mail, Phone, MessageCircle, MoreVertical, UserX } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { db } from '../../firebase'
import { collection, query, where, getDocs } from 'firebase/firestore'
import { getUser, sendFriendRequest, removeFriend } from '../../services/firestore'

export default function ContactsPanel() {
  const { user } = useAuth()
  const [contacts, setContacts] = useState([])
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadContacts()
  }, [user])

  const loadContacts = async () => {
    if (!user) return
    
    try {
      setLoading(true)
      // Get user's friends from Firestore
      const userDoc = await getUser(user.uid)
      const friendIds = userDoc?.friends || []
      
      // Fetch friend details
      const friendsData = await Promise.all(
        friendIds.map(async (friendId) => {
          const friend = await getUser(friendId)
          return { ...friend, id: friendId }
        })
      )
      
      setContacts(friendsData.filter(Boolean))
    } catch (error) {
      console.error('Error loading contacts:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredContacts = contacts.filter(contact =>
    contact.displayName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    contact.email?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  // Group contacts alphabetically
  const groupedContacts = filteredContacts.reduce((acc, contact) => {
    const firstLetter = (contact.displayName?.[0] || '?').toUpperCase()
    if (!acc[firstLetter]) acc[firstLetter] = []
    acc[firstLetter].push(contact)
    return acc
  }, {})

  return (
    <div className="w-full h-full flex flex-col bg-slate-900 border-r border-white/5">
      {/* Header */}
      <div className="p-6 pb-4 border-b border-white/5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-white">Contacts</h1>
            <p className="text-sm text-gray-400">{contacts.length} contacts</p>
          </div>
          <button className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center hover:shadow-lg hover:shadow-purple-500/30 transition-all">
            <UserPlus className="w-5 h-5 text-white" />
          </button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            type="text"
            placeholder="Search contacts..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500/50 focus:bg-white/8 transition-all"
          />
        </div>
      </div>

      {/* Contacts List */}
      <div className="flex-1 overflow-y-auto scrollbar-thin">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : filteredContacts.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-500 px-6">
            <Users className="w-16 h-16 mb-4 opacity-50" />
            <p className="text-lg font-medium">No contacts yet</p>
            <p className="text-sm text-center mt-2">Add friends to start chatting</p>
          </div>
        ) : (
          <div className="p-2">
            {Object.keys(groupedContacts).sort().map((letter) => (
              <div key={letter} className="mb-4">
                {/* Letter Header */}
                <div className="px-3 py-1 text-xs font-semibold text-purple-400 uppercase tracking-wider">
                  {letter}
                </div>
                
                {/* Contacts in this group */}
                {groupedContacts[letter].map((contact, index) => (
                  <motion.div
                    key={contact.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.03 }}
                    className="flex items-center gap-3 p-3 rounded-xl hover:bg-white/5 cursor-pointer transition-all group"
                  >
                    {/* Avatar */}
                    <div className="relative">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center text-white font-semibold flex-shrink-0">
                        {contact.displayName?.[0]?.toUpperCase() || '?'}
                      </div>
                      {contact.status === 'online' && (
                        <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-slate-900"></div>
                      )}
                    </div>

                    {/* Contact Info */}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-white truncate">
                        {contact.displayName || 'Unknown User'}
                      </p>
                      <p className="text-sm text-gray-400 truncate">
                        {contact.email || contact.status || 'Available'}
                      </p>
                    </div>

                    {/* Quick Actions */}
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        className="w-8 h-8 rounded-lg bg-blue-500/20 hover:bg-blue-500/30 flex items-center justify-center transition-all"
                        title="Send message"
                      >
                        <MessageCircle className="w-4 h-4 text-blue-400" />
                      </button>
                      <button 
                        className="w-8 h-8 rounded-lg bg-green-500/20 hover:bg-green-500/30 flex items-center justify-center transition-all"
                        title="Voice call"
                      >
                        <Phone className="w-4 h-4 text-green-400" />
                      </button>
                      <button 
                        className="w-8 h-8 rounded-lg bg-gray-500/20 hover:bg-gray-500/30 flex items-center justify-center transition-all"
                        title="More options"
                      >
                        <MoreVertical className="w-4 h-4 text-gray-400" />
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
