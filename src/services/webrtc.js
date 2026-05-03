// WebRTC Service for Voice and Video Calls
import { db } from '../firebase'
import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  onSnapshot, 
  updateDoc, 
  deleteDoc,
  serverTimestamp 
} from 'firebase/firestore'

class WebRTCService {
  constructor() {
    this.peerConnection = null
    this.localStream = null
    this.remoteStream = null
    this.callId = null
    this.isInitiator = false
    this.listeners = [] // track snapshot listeners for cleanup
    
    // ICE servers for NAT traversal
    this.configuration = {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun2.l.google.com:19302' },
        { urls: 'stun:stun3.l.google.com:19302' },
        { urls: 'stun:stun4.l.google.com:19302' },
      ]
    }
  }

  // Initialize local media stream
  async getLocalStream(isVideoCall = false) {
    try {
      const constraints = {
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        },
        video: isVideoCall ? {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user'
        } : false
      }

      this.localStream = await navigator.mediaDevices.getUserMedia(constraints)
      return this.localStream
    } catch (error) {
      console.error('Error accessing media devices:', error)
      if (error.name === 'NotAllowedError') {
        throw new Error('Camera/microphone permission denied. Please allow access in your browser settings.')
      } else if (error.name === 'NotFoundError') {
        throw new Error('No camera or microphone found. Please connect a device.')
      }
      throw new Error('Could not access camera/microphone. Please check permissions.')
    }
  }

  // Create peer connection with tracks already available
  createPeerConnection() {
    if (this.peerConnection) {
      this.peerConnection.close()
    }
    
    this.peerConnection = new RTCPeerConnection(this.configuration)
    this.remoteStream = new MediaStream()

    // Add local tracks to peer connection
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => {
        this.peerConnection.addTrack(track, this.localStream)
      })
    }

    // Handle remote tracks
    this.peerConnection.ontrack = (event) => {
      console.log('📹 Remote track received:', event.track.kind)
      event.streams[0].getTracks().forEach(track => {
        this.remoteStream.addTrack(track)
      })
    }

    // Handle ICE candidates
    this.peerConnection.onicecandidate = async (event) => {
      if (event.candidate && this.callId) {
        try {
          const candidateId = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
          const candidateDoc = doc(db, 'calls', this.callId, 'candidates', candidateId)
          await setDoc(candidateDoc, {
            candidate: event.candidate.toJSON(),
            from: this.isInitiator ? 'caller' : 'callee',
            timestamp: serverTimestamp()
          })
        } catch (error) {
          console.error('Error saving ICE candidate:', error)
        }
      }
    }

    // Connection state changes
    this.peerConnection.onconnectionstatechange = () => {
      console.log('🔗 Connection state:', this.peerConnection?.connectionState)
      if (this.peerConnection?.connectionState === 'failed') {
        console.error('WebRTC connection failed')
      }
    }

    this.peerConnection.oniceconnectionstatechange = () => {
      console.log('🧊 ICE connection state:', this.peerConnection?.iceConnectionState)
    }

    return this.peerConnection
  }

  // Start a call (initiator)
  async startCall(calleeId, callerId, callerName, isVideoCall = false) {
    try {
      this.isInitiator = true
      this.callId = `${callerId}_${calleeId}_${Date.now()}`

      console.log('📞 Starting call:', this.callId, 'isVideo:', isVideoCall)

      // Get local stream FIRST
      await this.getLocalStream(isVideoCall)

      // Create peer connection (will add local tracks)
      this.createPeerConnection()

      // Create offer
      const offer = await this.peerConnection.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: isVideoCall
      })
      await this.peerConnection.setLocalDescription(offer)

      // Save call data to Firestore
      const callDoc = doc(db, 'calls', this.callId)
      await setDoc(callDoc, {
        callId: this.callId,
        callerId,
        callerName,
        calleeId,
        type: isVideoCall ? 'video' : 'voice',
        status: 'ringing',
        offer: {
          type: offer.type,
          sdp: offer.sdp
        },
        timestamp: serverTimestamp(),
        startedAt: null,
        endedAt: null
      })

      console.log('✅ Call document created, waiting for answer...')

      return {
        callId: this.callId,
        localStream: this.localStream
      }
    } catch (error) {
      console.error('Error starting call:', error)
      this.cleanup()
      throw error
    }
  }

  // Answer a call (receiver)
  async answerCall(callId) {
    try {
      this.callId = callId
      this.isInitiator = false

      console.log('📱 Answering call:', callId)

      // Get call data
      const callDoc = doc(db, 'calls', callId)
      const callSnap = await getDoc(callDoc)

      if (!callSnap.exists()) {
        throw new Error('Call not found')
      }

      const callData = callSnap.data()
      const isVideoCall = callData.type === 'video'

      // Get local stream FIRST
      await this.getLocalStream(isVideoCall)

      // Create peer connection (will add local tracks)
      this.createPeerConnection()

      // Set remote description (offer from caller)
      const offerDescription = new RTCSessionDescription(callData.offer)
      await this.peerConnection.setRemoteDescription(offerDescription)

      // Create answer
      const answer = await this.peerConnection.createAnswer()
      await this.peerConnection.setLocalDescription(answer)

      // Update call with answer
      await updateDoc(callDoc, {
        status: 'connected',
        answer: {
          type: answer.type,
          sdp: answer.sdp
        },
        startedAt: serverTimestamp()
      })

      // Listen for ICE candidates from the caller
      this.listenForCandidates(callId)

      console.log('✅ Call answered successfully')

      return {
        callId,
        localStream: this.localStream,
        remoteStream: this.remoteStream
      }
    } catch (error) {
      console.error('Error answering call:', error)
      this.cleanup()
      throw error
    }
  }

  // Listen for answer (initiator side)
  listenForAnswer(callId, onAnswer) {
    const callDoc = doc(db, 'calls', callId)
    
    const unsub = onSnapshot(callDoc, async (snapshot) => {
      if (!snapshot.exists()) return
      
      const data = snapshot.data()
      
      if (data?.answer && this.peerConnection && !this.peerConnection.currentRemoteDescription) {
        try {
          console.log('📥 Received answer, setting remote description...')
          const answer = new RTCSessionDescription(data.answer)
          await this.peerConnection.setRemoteDescription(answer)
          
          // Start listening for ICE candidates
          this.listenForCandidates(callId)
          
          if (onAnswer) {
            onAnswer({
              remoteStream: this.remoteStream,
              status: data.status
            })
          }
          console.log('✅ Remote description set successfully')
        } catch (error) {
          console.error('Error setting remote description:', error)
        }
      }

      // Handle call status changes
      if (data?.status === 'ended' || data?.status === 'rejected') {
        console.log('📴 Call ended/rejected by remote')
        if (onAnswer) {
          onAnswer({ status: data.status })
        }
        this.cleanup()
      }
    })

    this.listeners.push(unsub)
    return unsub
  }

  // Listen for ICE candidates
  listenForCandidates(callId) {
    const candidatesCollection = collection(db, 'calls', callId, 'candidates')
    
    const unsub = onSnapshot(candidatesCollection, (snapshot) => {
      snapshot.docChanges().forEach(async (change) => {
        if (change.type === 'added') {
          const data = change.doc.data()
          // Only process candidates from the other party
          const isFromOtherParty = (this.isInitiator && data.from === 'callee') || 
                                    (!this.isInitiator && data.from === 'caller')
          
          if (isFromOtherParty || !data.from) {
            try {
              if (this.peerConnection && this.peerConnection.remoteDescription) {
                const candidate = new RTCIceCandidate(data.candidate)
                await this.peerConnection.addIceCandidate(candidate)
                console.log('🧊 ICE candidate added')
              }
            } catch (error) {
              console.error('Error adding ICE candidate:', error)
            }
          }
        }
      })
    })

    this.listeners.push(unsub)
    return unsub
  }

  // End call
  async endCall(callId) {
    try {
      if (callId) {
        const callDoc = doc(db, 'calls', callId)
        await updateDoc(callDoc, {
          status: 'ended',
          endedAt: serverTimestamp()
        })
      }
    } catch (error) {
      console.error('Error ending call:', error)
    } finally {
      this.cleanup()
    }
  }

  // Reject call
  async rejectCall(callId) {
    try {
      const callDoc = doc(db, 'calls', callId)
      await updateDoc(callDoc, {
        status: 'rejected',
        endedAt: serverTimestamp()
      })
    } catch (error) {
      console.error('Error rejecting call:', error)
    } finally {
      this.cleanup()
    }
  }

  // Toggle audio
  toggleAudio(enabled) {
    if (this.localStream) {
      this.localStream.getAudioTracks().forEach(track => {
        track.enabled = enabled
      })
    }
  }

  // Toggle video
  toggleVideo(enabled) {
    if (this.localStream) {
      this.localStream.getVideoTracks().forEach(track => {
        track.enabled = enabled
      })
    }
  }

  // Switch camera (front/back)
  async switchCamera() {
    if (!this.localStream) return

    const videoTrack = this.localStream.getVideoTracks()[0]
    if (!videoTrack) return

    const currentFacingMode = videoTrack.getSettings().facingMode
    const newFacingMode = currentFacingMode === 'user' ? 'environment' : 'user'

    // Stop current track
    videoTrack.stop()

    // Get new stream with different camera
    try {
      const newStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: newFacingMode },
        audio: false
      })

      const newVideoTrack = newStream.getVideoTracks()[0]
      
      // Replace track in peer connection
      const sender = this.peerConnection?.getSenders().find(s => s.track?.kind === 'video')
      if (sender) {
        await sender.replaceTrack(newVideoTrack)
      }

      // Replace track in local stream
      this.localStream.removeTrack(videoTrack)
      this.localStream.addTrack(newVideoTrack)

      return newVideoTrack
    } catch (error) {
      console.error('Error switching camera:', error)
      throw error
    }
  }

  // Cleanup
  cleanup() {
    console.log('🧹 Cleaning up WebRTC resources')
    
    // Unsubscribe from all Firestore listeners
    this.listeners.forEach(unsub => {
      try { unsub() } catch (e) {}
    })
    this.listeners = []

    if (this.localStream) {
      this.localStream.getTracks().forEach(track => track.stop())
      this.localStream = null
    }

    if (this.peerConnection) {
      this.peerConnection.close()
      this.peerConnection = null
    }

    this.remoteStream = null
    this.callId = null
    this.isInitiator = false
  }
}

// Create singleton instance
export const webrtcService = new WebRTCService()
export default webrtcService
