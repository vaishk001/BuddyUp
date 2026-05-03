// Call Context for managing call state across the app
import React, { createContext, useContext, useState, useEffect, useRef } from 'react'
import { useAuth } from './AuthContext'
import { useUI } from './UIContext'
import { db } from '../firebase'
import { collection, query, where, onSnapshot, doc } from 'firebase/firestore'
import webrtcService from '../services/webrtc'

const CallContext = createContext()

export function useCall() {
  const context = useContext(CallContext)
  if (!context) {
    throw new Error('useCall must be used within CallProvider')
  }
  return context
}

export function CallProvider({ children }) {
  const { user, userDoc } = useAuth()
  const { showToast } = useUI()
  
  const [incomingCall, setIncomingCall] = useState(null)
  const [activeCall, setActiveCall] = useState(null)
  const [callStatus, setCallStatus] = useState(null) // 'ringing', 'connecting', 'connected', 'ended'
  const [localStream, setLocalStream] = useState(null)
  const [remoteStream, setRemoteStream] = useState(null)
  const [isMuted, setIsMuted] = useState(false)
  const [isVideoOff, setIsVideoOff] = useState(false)
  
  // Ref for ringtone audio
  const ringtoneRef = useRef(null)

  // Stop ringtone
  const stopRingtone = () => {
    if (ringtoneRef.current) {
      ringtoneRef.current.pause()
      ringtoneRef.current.currentTime = 0
      ringtoneRef.current = null
    }
  }

  // Listen for incoming calls
  useEffect(() => {
    if (!user?.uid) return

    const callsQuery = query(
      collection(db, 'calls'),
      where('calleeId', '==', user.uid),
      where('status', '==', 'ringing')
    )

    const unsubscribe = onSnapshot(callsQuery, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added') {
          const callData = { id: change.doc.id, ...change.doc.data() }
          
          // Don't show incoming call if already in a call
          if (!activeCall) {
            console.log('📞 Incoming call:', callData)
            setIncomingCall(callData)
            
            // Play ringtone (optional, won't error if file missing)
            try {
              const audio = new Audio('/ringtone.mp3')
              audio.loop = true
              audio.play().catch(() => console.log('Could not play ringtone'))
              ringtoneRef.current = audio
            } catch (e) {
              // Ringtone is optional
            }
          }
        }
        
        // Handle when a ringing call is removed (answered/rejected elsewhere)
        if (change.type === 'modified') {
          const callData = change.doc.data()
          if (callData.status !== 'ringing' && incomingCall?.id === change.doc.id) {
            setIncomingCall(null)
            stopRingtone()
          }
        }
      })
    }, (error) => {
      console.error('Error listening for calls:', error)
    })

    return () => {
      unsubscribe()
      stopRingtone()
    }
  }, [user?.uid, activeCall])

  // Listen for active call status changes (to handle remote ending the call)
  useEffect(() => {
    if (!activeCall?.callId) return

    const unsub = onSnapshot(doc(db, 'calls', activeCall.callId), (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data()
        // If the other party ended the call and we haven't processed it yet
        if (data.status === 'ended' || data.status === 'rejected') {
          // Check if we already handled it locally
          webrtcService.cleanup()
          setCallStatus('ended')
          setTimeout(() => {
            setActiveCall(null)
            setLocalStream(null)
            setRemoteStream(null)
            setCallStatus(null)
            setIsMuted(false)
            setIsVideoOff(false)
          }, 1000)
        }
      }
    })

    return () => unsub()
  }, [activeCall?.callId])

  // Start a call
  const startCall = async (calleeId, calleeName, isVideoCall = false) => {
    try {
      if (activeCall) {
        showToast('Already in a call', 'warning')
        return
      }
      
      setCallStatus('connecting')
      
      const result = await webrtcService.startCall(
        calleeId,
        user.uid,
        userDoc?.displayName || user.displayName || 'User',
        isVideoCall
      )

      setActiveCall({
        callId: result.callId,
        calleeId,
        calleeName,
        type: isVideoCall ? 'video' : 'voice',
        isInitiator: true
      })
      
      setLocalStream(result.localStream)
      setCallStatus('ringing')

      // Listen for answer
      webrtcService.listenForAnswer(result.callId, (data) => {
        if (data.remoteStream) {
          setRemoteStream(data.remoteStream)
          setCallStatus('connected')
          showToast('Call connected!', 'success')
        }
        if (data.status === 'ended' || data.status === 'rejected') {
          setCallStatus('ended')
          setTimeout(() => {
            setActiveCall(null)
            setLocalStream(null)
            setRemoteStream(null)
            setCallStatus(null)
            setIsMuted(false)
            setIsVideoOff(false)
          }, 1000)
          showToast(data.status === 'rejected' ? 'Call rejected' : 'Call ended', 'info')
        }
      })

      showToast(`Calling ${calleeName}...`, 'info')
    } catch (error) {
      console.error('Failed to start call:', error)
      showToast(error.message || 'Failed to start call', 'error')
      setCallStatus(null)
      setActiveCall(null)
    }
  }

  // Answer incoming call
  const answerCall = async () => {
    if (!incomingCall) return

    try {
      stopRingtone()
      setCallStatus('connecting')
      
      // Use the Firestore doc id (which matches the callId field)
      const callId = incomingCall.callId || incomingCall.id
      
      setActiveCall({
        callId: callId,
        callerId: incomingCall.callerId,
        callerName: incomingCall.callerName,
        type: incomingCall.type,
        isInitiator: false
      })
      setIncomingCall(null)

      const result = await webrtcService.answerCall(callId)
      
      setLocalStream(result.localStream)
      setRemoteStream(result.remoteStream)
      setCallStatus('connected')

      showToast('Call connected!', 'success')
    } catch (error) {
      console.error('Failed to answer call:', error)
      showToast(error.message || 'Failed to answer call', 'error')
      setCallStatus(null)
      setActiveCall(null)
    }
  }

  // Reject incoming call
  const rejectCall = async () => {
    if (!incomingCall) return

    try {
      stopRingtone()
      const callId = incomingCall.callId || incomingCall.id
      await webrtcService.rejectCall(callId)
      setIncomingCall(null)
      showToast('Call rejected', 'info')
    } catch (error) {
      console.error('Failed to reject call:', error)
    }
  }

  // End active call
  const endCall = async () => {
    if (!activeCall) return

    try {
      await webrtcService.endCall(activeCall.callId)
      
      // Cleanup
      setActiveCall(null)
      setLocalStream(null)
      setRemoteStream(null)
      setCallStatus(null)
      setIsMuted(false)
      setIsVideoOff(false)

      showToast('Call ended', 'info')
    } catch (error) {
      console.error('Failed to end call:', error)
    }
  }

  // Toggle mute
  const toggleMute = () => {
    const newMutedState = !isMuted
    webrtcService.toggleAudio(!newMutedState)
    setIsMuted(newMutedState)
  }

  // Toggle video
  const toggleVideo = () => {
    const newVideoState = !isVideoOff
    webrtcService.toggleVideo(!newVideoState)
    setIsVideoOff(newVideoState)
  }

  // Switch camera
  const switchCamera = async () => {
    try {
      await webrtcService.switchCamera()
      showToast('Camera switched', 'success')
    } catch (error) {
      showToast('Failed to switch camera', 'error')
    }
  }

  const value = {
    incomingCall,
    activeCall,
    callStatus,
    localStream,
    remoteStream,
    isMuted,
    isVideoOff,
    startCall,
    answerCall,
    rejectCall,
    endCall,
    toggleMute,
    toggleVideo,
    switchCamera
  }

  return (
    <CallContext.Provider value={value}>
      {children}
    </CallContext.Provider>
  )
}
