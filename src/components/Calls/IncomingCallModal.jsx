// Incoming Call Modal
import React, { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Phone, Video, PhoneOff, User } from 'lucide-react'
import { useCall } from '../../contexts/CallContext'

export default function IncomingCallModal() {
  const { incomingCall, answerCall, rejectCall } = useCall()

  useEffect(() => {
    if (incomingCall) {
      // Auto-dismiss after 30 seconds
      const timeout = setTimeout(() => {
        rejectCall()
      }, 30000)

      return () => clearTimeout(timeout)
    }
  }, [incomingCall])

  if (!incomingCall) return null

  const isVideoCall = incomingCall.type === 'video'
  const callerName = incomingCall.callerName || 'Unknown'

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-md"
      >
        <motion.div
          initial={{ scale: 0.8, y: 50 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.8, y: 50 }}
          className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-3xl p-8 shadow-2xl border border-white/10 max-w-md w-full mx-4 relative overflow-hidden"
        >
          {/* Background Pulse Effect */}
          <div className="absolute inset-0 overflow-hidden">
            <motion.div
              animate={{
                scale: [1, 1.5, 1],
                opacity: [0.1, 0, 0.1]
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut"
              }}
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 rounded-full bg-blue-500/30"
            />
            <motion.div
              animate={{
                scale: [1, 1.3, 1],
                opacity: [0.15, 0, 0.15]
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut",
                delay: 0.5
              }}
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 rounded-full bg-purple-500/30"
            />
          </div>

          {/* Caller Info */}
          <div className="text-center mb-8 relative z-10">
            <motion.div
              animate={{ scale: [1, 1.05, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="w-24 h-24 mx-auto mb-4 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-3xl font-bold shadow-xl shadow-purple-500/30"
            >
              {callerName[0]?.toUpperCase() || <User className="w-12 h-12" />}
            </motion.div>
            
            <h3 className="text-2xl font-bold text-white mb-2">
              {callerName}
            </h3>
            
            <div className="flex items-center justify-center gap-2 text-gray-400">
              {isVideoCall ? (
                <>
                  <Video className="w-4 h-4" />
                  <span>Incoming video call...</span>
                </>
              ) : (
                <>
                  <Phone className="w-4 h-4" />
                  <span>Incoming voice call...</span>
                </>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-6 justify-center relative z-10">
            {/* Reject */}
            <div className="text-center">
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={rejectCall}
                className="w-16 h-16 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center text-white shadow-lg shadow-red-500/30 transition-all mb-2"
              >
                <PhoneOff className="w-6 h-6" />
              </motion.button>
              <span className="text-sm text-gray-400">Decline</span>
            </div>

            {/* Answer */}
            <div className="text-center">
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={answerCall}
                className="w-16 h-16 rounded-full bg-green-500 hover:bg-green-600 flex items-center justify-center text-white shadow-lg shadow-green-500/30 transition-all mb-2"
              >
                {isVideoCall ? (
                  <Video className="w-6 h-6" />
                ) : (
                  <Phone className="w-6 h-6" />
                )}
              </motion.button>
              <span className="text-sm text-gray-400">Accept</span>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
