import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Phone, Video, PhoneIncoming, PhoneOutgoing, PhoneMissed, Clock, Search, Plus } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { useCall } from '../../contexts/CallContext'
import { db } from '../../firebase'
import { collection, query, where, onSnapshot, doc, getDoc } from 'firebase/firestore'

export default function CallsPanel() {
  const { user } = useAuth()
  const { startCall } = useCall()
  const [calls, setCalls] = useState([])
  const [searchQuery, setSearchQuery] = useState('')
  const [contacts, setContacts] = useState([])

  // Fetch call history from Firestore
  useEffect(() => {
    if (!user?.uid) return

    // Use two separate queries instead of or() to avoid composite index requirements
    const callerQuery = query(
      collection(db, 'calls'),
      where('callerId', '==', user.uid)
    )
    const calleeQuery = query(
      collection(db, 'calls'),
      where('calleeId', '==', user.uid)
    )

    const callMap = new Map()
    
    const processSnapshot = (snapshot, role) => {
      snapshot.docs.forEach(doc => {
        const data = doc.data()
        const isIncoming = data.calleeId === user.uid
        
        callMap.set(doc.id, {
          id: doc.id,
          name: isIncoming ? (data.callerName || 'Unknown') : 'You',
          otherUserId: isIncoming ? data.callerId : data.calleeId,
          avatar: null,
          type: isIncoming ? 'incoming' : 'outgoing',
          callType: data.type,
          duration: data.startedAt && data.endedAt 
            ? formatCallDuration(data.endedAt.toMillis() - data.startedAt.toMillis())
            : null,
          timestamp: data.timestamp?.toDate() || new Date(),
          missed: data.status === 'rejected' || (isIncoming && data.status === 'ended' && !data.startedAt),
          status: data.status
        })
      })
      
      // Sort by timestamp descending
      const sorted = [...callMap.values()].sort((a, b) => b.timestamp - a.timestamp)
      setCalls(sorted)
    }

    const unsub1 = onSnapshot(callerQuery, (snap) => processSnapshot(snap, 'caller'), 
      (err) => console.error('Caller calls query error:', err))
    const unsub2 = onSnapshot(calleeQuery, (snap) => processSnapshot(snap, 'callee'),
      (err) => console.error('Callee calls query error:', err))

    return () => {
      unsub1()
      unsub2()
    }
  }, [user?.uid])

  // Fetch user's friends for quick calling
  useEffect(() => {
    if (!user?.uid) return

    const userRef = doc(db, 'users', user.uid)
    const unsubscribe = onSnapshot(userRef, async (snapshot) => {
      if (snapshot.exists()) {
        const friendIds = snapshot.data().friends || []
        // Fetch friend details
        const friendPromises = friendIds.slice(0, 5).map(async (friendId) => {
          const friendDoc = await getDoc(doc(db, 'users', friendId))
          if (friendDoc.exists()) {
            return { id: friendId, ...friendDoc.data() }
          }
          return null
        })
        const friendsData = (await Promise.all(friendPromises)).filter(Boolean)
        setContacts(friendsData)
      }
    })

    return unsubscribe
  }, [user?.uid])

  const formatCallDuration = (ms) => {
    const seconds = Math.floor(ms / 1000)
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const getCallIcon = (type, missed) => {
    if (missed) return <PhoneMissed className="w-4 h-4 text-red-400" />
    if (type === 'incoming') return <PhoneIncoming className="w-4 h-4 text-green-400" />
    return <PhoneOutgoing className="w-4 h-4 text-blue-400" />
  }

  const formatTime = (date) => {
    const now = new Date()
    const diff = now - date
    const hours = Math.floor(diff / (1000 * 60 * 60))
    
    if (hours < 24) {
      return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
    }
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  const filteredCalls = calls.filter(call =>
    call.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="w-full h-full flex flex-col bg-slate-900 border-r border-white/5">
      {/* Header */}
      <div className="p-6 pb-4 border-b border-white/5">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold text-white">Calls</h1>
          <button className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center hover:shadow-lg hover:shadow-green-500/30 transition-all">
            <Plus className="w-5 h-5 text-white" />
          </button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            type="text"
            placeholder="Search calls..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-green-500/50 focus:bg-white/8 transition-all"
          />
        </div>
      </div>

      {/* Calls List */}
      <div className="flex-1 overflow-y-auto scrollbar-thin">
        {filteredCalls.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-500 px-6">
            <Phone className="w-16 h-16 mb-4 opacity-50" />
            <p className="text-lg font-medium">No calls yet</p>
            <p className="text-sm text-center mt-2">Start a voice or video call with your contacts</p>
          </div>
        ) : (
          <div className="p-2">
            {filteredCalls.map((call, index) => (
              <motion.div
                key={call.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="flex items-center gap-3 p-3 rounded-xl hover:bg-white/5 cursor-pointer transition-all group"
              >
                {/* Avatar */}
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center text-white font-semibold flex-shrink-0">
                  {call.name[0].toUpperCase()}
                </div>

                {/* Call Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className={`font-medium truncate ${call.missed ? 'text-red-400' : 'text-white'}`}>
                      {call.name}
                    </p>
                    {call.callType === 'video' && (
                      <Video className="w-3.5 h-3.5 text-gray-500" />
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-400">
                    {getCallIcon(call.type, call.missed)}
                    <span>{call.missed ? 'Missed' : call.duration}</span>
                  </div>
                </div>

                {/* Time & Actions */}
                <div className="flex flex-col items-end gap-2">
                  <span className="text-xs text-gray-500">{formatTime(call.timestamp)}</span>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={(e) => {
                        e.stopPropagation()
                        if (call.otherUserId) {
                          startCall(call.otherUserId, call.name, false)
                        }
                      }}
                      className="w-8 h-8 rounded-lg bg-green-500/20 hover:bg-green-500/30 flex items-center justify-center transition-all"
                    >
                      <Phone className="w-4 h-4 text-green-400" />
                    </button>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation()
                        if (call.otherUserId) {
                          startCall(call.otherUserId, call.name, true)
                        }
                      }}
                      className="w-8 h-8 rounded-lg bg-blue-500/20 hover:bg-blue-500/30 flex items-center justify-center transition-all"
                    >
                      <Video className="w-4 h-4 text-blue-400" />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
