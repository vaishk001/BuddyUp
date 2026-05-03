// Active Call Window
import React, { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  PhoneOff, 
  Mic, 
  MicOff, 
  Video, 
  VideoOff, 
  Maximize2, 
  Minimize2,
  SwitchCamera,
  User
} from 'lucide-react'
import { useCall } from '../../contexts/CallContext'

export default function ActiveCallWindow() {
  const {
    activeCall,
    callStatus,
    localStream,
    remoteStream,
    isMuted,
    isVideoOff,
    endCall,
    toggleMute,
    toggleVideo,
    switchCamera
  } = useCall()

  const localVideoRef = useRef(null)
  const remoteVideoRef = useRef(null)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [callDuration, setCallDuration] = useState(0)

  // Set up local video stream
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream
    }
  }, [localStream])

  // Set up remote video stream
  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream
    }
  }, [remoteStream])

  // Call duration timer
  useEffect(() => {
    if (callStatus === 'connected') {
      setCallDuration(0)
      const interval = setInterval(() => {
        setCallDuration(prev => prev + 1)
      }, 1000)

      return () => clearInterval(interval)
    } else {
      setCallDuration(0)
    }
  }, [callStatus])

  if (!activeCall) return null

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  const isVideoCall = activeCall.type === 'video'
  const displayName = activeCall.calleeName || activeCall.callerName || 'User'

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen)
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className={`fixed ${
          isFullscreen ? 'inset-0' : 'bottom-4 right-4 w-96 h-[500px]'
        } z-[150] bg-slate-900 rounded-2xl shadow-2xl border border-white/10 overflow-hidden flex flex-col`}
      >
        {/* Video Container */}
        <div className="relative flex-1 bg-black">
          {/* Remote Video (Main) */}
          {isVideoCall ? (
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-slate-800 to-slate-900">
              {/* Hidden audio element for voice calls */}
              <audio ref={remoteVideoRef} autoPlay playsInline className="hidden" />
              <div className="text-center">
                <div className="w-32 h-32 mx-auto mb-4 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-4xl font-bold shadow-xl shadow-purple-500/20">
                  {displayName[0]?.toUpperCase() || <User className="w-16 h-16" />}
                </div>
                <h3 className="text-white text-2xl font-semibold mb-2">{displayName}</h3>
                <p className="text-gray-400 text-lg">
                  {callStatus === 'ringing' ? 'Ringing...' : 
                   callStatus === 'connecting' ? 'Connecting...' :
                   callStatus === 'connected' ? formatDuration(callDuration) :
                   'Call ended'}
                </p>
              </div>
            </div>
          )}

          {/* Local Video (PiP) */}
          {isVideoCall && localStream && (
            <motion.div
              drag
              dragMomentum={false}
              className="absolute top-4 right-4 w-32 h-40 rounded-xl overflow-hidden shadow-lg border-2 border-white/20 bg-slate-800 cursor-move z-10"
            >
              {!isVideoOff ? (
                <video
                  ref={localVideoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                  style={{ transform: 'scaleX(-1)' }}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-slate-700">
                  <VideoOff className="w-8 h-8 text-gray-400" />
                </div>
              )}
            </motion.div>
          )}

          {/* Status Overlay */}
          {callStatus !== 'connected' && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-20">
              <div className="text-center">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                  className="w-16 h-16 mx-auto mb-4 border-4 border-white border-t-transparent rounded-full"
                />
                <p className="text-white text-xl font-medium">
                  {callStatus === 'ringing' ? 'Calling...' : 
                   callStatus === 'connecting' ? 'Connecting...' :
                   'Ending...'}
                </p>
              </div>
            </div>
          )}

          {/* Top Bar */}
          <div className="absolute top-0 left-0 right-0 p-4 bg-gradient-to-b from-black/60 to-transparent z-10">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-white font-semibold text-lg">{displayName}</h3>
                {callStatus === 'connected' && (
                  <p className="text-gray-300 text-sm">{formatDuration(callDuration)}</p>
                )}
                {callStatus === 'ringing' && (
                  <p className="text-yellow-400 text-sm animate-pulse">Ringing...</p>
                )}
              </div>
              <button
                onClick={toggleFullscreen}
                className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-all backdrop-blur-sm"
              >
                {isFullscreen ? (
                  <Minimize2 className="w-5 h-5" />
                ) : (
                  <Maximize2 className="w-5 h-5" />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Control Bar */}
        <div className="p-6 bg-gradient-to-t from-slate-900 via-slate-800 to-transparent backdrop-blur-xl">
          <div className="flex items-center justify-center gap-4">
            {/* Mute/Unmute */}
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={toggleMute}
              className={`w-14 h-14 rounded-full flex items-center justify-center transition-all shadow-lg ${
                isMuted 
                  ? 'bg-red-500 hover:bg-red-600 shadow-red-500/30' 
                  : 'bg-white/10 hover:bg-white/20 shadow-white/10'
              }`}
            >
              {isMuted ? (
                <MicOff className="w-6 h-6 text-white" />
              ) : (
                <Mic className="w-6 h-6 text-white" />
              )}
            </motion.button>

            {/* End Call */}
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={endCall}
              className="w-16 h-16 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center text-white shadow-lg shadow-red-500/30 transition-all"
            >
              <PhoneOff className="w-7 h-7" />
            </motion.button>

            {/* Video Toggle (only for video calls) */}
            {isVideoCall && (
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={toggleVideo}
                className={`w-14 h-14 rounded-full flex items-center justify-center transition-all shadow-lg ${
                  isVideoOff 
                    ? 'bg-red-500 hover:bg-red-600 shadow-red-500/30' 
                    : 'bg-white/10 hover:bg-white/20 shadow-white/10'
                }`}
              >
                {isVideoOff ? (
                  <VideoOff className="w-6 h-6 text-white" />
                ) : (
                  <Video className="w-6 h-6 text-white" />
                )}
              </motion.button>
            )}

            {/* Switch Camera (only for video calls) */}
            {isVideoCall && !isVideoOff && (
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={switchCamera}
                className="w-14 h-14 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-all shadow-lg shadow-white/10"
              >
                <SwitchCamera className="w-6 h-6" />
              </motion.button>
            )}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  )
}
