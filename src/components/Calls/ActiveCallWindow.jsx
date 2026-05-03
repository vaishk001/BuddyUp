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
  const [isSwapped, setIsSwapped] = useState(false)

  // Set up local video stream
  useEffect(() => {
    if (localVideoRef.current && localStream && !isVideoOff) {
      localVideoRef.current.srcObject = localStream
      localVideoRef.current.play().catch(e => console.warn('Local play failed', e))
    }
  }, [localStream, isVideoOff])

  // Set up remote video stream
  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream
      remoteVideoRef.current.play().catch(e => console.warn('Remote play failed', e))
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
        className={`fixed z-[150] bg-slate-900 shadow-2xl overflow-hidden transition-all duration-300 ${
          isFullscreen 
            ? 'inset-0 rounded-none border-none' 
            : 'inset-0 sm:bottom-6 sm:top-auto sm:left-auto sm:right-6 sm:w-[380px] sm:h-[550px] sm:rounded-3xl sm:border border-white/10'
        }`}
      >
        {/* Video Container */}
        <div className="relative w-full h-full bg-black group/call">
          
          {/* Remote Video (Can be Main or PiP) */}
          {isVideoCall ? (
            <motion.div
              layout
              drag={isSwapped}
              dragMomentum={false}
              dragConstraints={{ left: -250, right: 0, top: 0, bottom: 400 }}
              onClick={(e) => {
                if (isSwapped) {
                  e.stopPropagation()
                  setIsSwapped(false)
                }
              }}
              className={isSwapped
                ? "absolute top-24 right-4 w-32 h-48 sm:w-36 sm:h-52 rounded-2xl overflow-hidden shadow-2xl border-2 border-white/20 bg-slate-800 cursor-pointer z-30"
                : "absolute inset-0 z-0 bg-black"}
            >
              <video
                ref={remoteVideoRef}
                autoPlay
                playsInline
                className={`w-full h-full ${!isSwapped && (isFullscreen || window.innerWidth < 640) ? 'object-contain' : 'object-cover'}`}
              />
            </motion.div>
          ) : (
            <div className="absolute inset-0 z-0 w-full h-full flex items-center justify-center bg-gradient-to-br from-slate-800 to-slate-900">
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

          {/* Local Video (Can be PiP or Main) */}
          {isVideoCall && localStream && (
            <motion.div
              layout
              drag={!isSwapped}
              dragMomentum={false}
              dragConstraints={{ left: -250, right: 0, top: 0, bottom: 400 }}
              onClick={(e) => {
                if (!isSwapped) {
                  e.stopPropagation()
                  setIsSwapped(true)
                }
              }}
              className={!isSwapped
                ? "absolute top-24 right-4 w-32 h-48 sm:w-36 sm:h-52 rounded-2xl overflow-hidden shadow-2xl border-2 border-white/20 bg-slate-800 cursor-pointer z-30"
                : "absolute inset-0 z-0 bg-black"}
            >
              {!isVideoOff ? (
                <video
                  ref={localVideoRef}
                  autoPlay
                  playsInline
                  muted
                  className={`w-full h-full ${isSwapped && (isFullscreen || window.innerWidth < 640) ? 'object-contain' : 'object-cover'}`}
                  style={{ transform: 'scaleX(-1)' }}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-slate-800">
                  <VideoOff className="w-10 h-10 text-gray-400" />
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
          <div className="absolute top-0 left-0 right-0 p-6 pt-8 sm:pt-6 bg-gradient-to-b from-black/80 via-black/40 to-transparent z-40 transition-opacity duration-300 opacity-100 sm:opacity-0 sm:group-hover/call:opacity-100">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-white font-semibold text-xl drop-shadow-md">{displayName}</h3>
                {callStatus === 'connected' && (
                  <p className="text-white/90 text-sm font-medium drop-shadow-md">{formatDuration(callDuration)}</p>
                )}
                {callStatus === 'ringing' && (
                  <p className="text-green-400 text-sm font-medium animate-pulse drop-shadow-md">Ringing...</p>
                )}
              </div>
              <button
                onClick={toggleFullscreen}
                className="w-12 h-12 rounded-full bg-black/40 hover:bg-black/60 flex items-center justify-center text-white transition-all backdrop-blur-md hidden sm:flex"
              >
                {isFullscreen ? (
                  <Minimize2 className="w-5 h-5" />
                ) : (
                  <Maximize2 className="w-5 h-5" />
                )}
              </button>
            </div>
          </div>

        {/* Control Bar */}
        <div className="absolute bottom-0 left-0 right-0 p-8 pb-10 sm:pb-8 bg-gradient-to-t from-black/90 via-black/50 to-transparent z-40 transition-opacity duration-300 opacity-100 sm:opacity-0 sm:group-hover/call:opacity-100">
          <div className="flex items-center justify-center gap-6">
            {/* Mute/Unmute */}
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={toggleMute}
              className={`w-14 h-14 rounded-full flex items-center justify-center transition-all backdrop-blur-md ${
                isMuted 
                  ? 'bg-red-500/90 text-white' 
                  : 'bg-white/20 hover:bg-white/30 text-white'
              }`}
            >
              {isMuted ? (
                <MicOff className="w-6 h-6" />
              ) : (
                <Mic className="w-6 h-6" />
              )}
            </motion.button>

            {/* Video Toggle (only for video calls) */}
            {isVideoCall && (
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={toggleVideo}
                className={`w-14 h-14 rounded-full flex items-center justify-center transition-all backdrop-blur-md ${
                  isVideoOff 
                    ? 'bg-red-500/90 text-white' 
                    : 'bg-white/20 hover:bg-white/30 text-white'
                }`}
              >
                {isVideoOff ? (
                  <VideoOff className="w-6 h-6" />
                ) : (
                  <Video className="w-6 h-6" />
                )}
              </motion.button>
            )}

            {/* Switch Camera (only for video calls) */}
            {isVideoCall && !isVideoOff && (
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={switchCamera}
                className="w-14 h-14 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-white transition-all backdrop-blur-md"
              >
                <SwitchCamera className="w-6 h-6" />
              </motion.button>
            )}

            {/* End Call - slightly larger */}
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={endCall}
              className="w-16 h-16 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center text-white shadow-xl shadow-red-500/30 transition-all"
            >
              <PhoneOff className="w-7 h-7" />
            </motion.button>
          </div>
        </div>
        </div>
      </motion.div>
    </AnimatePresence>
  )
}
