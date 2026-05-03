import React, { useState, useRef, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Play, Pause, Volume2 } from 'lucide-react'

export default function VoiceMessagePlayer({ audioUrl }) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [waveformData, setWaveformData] = useState(new Array(60).fill(0.3))
  const audioRef = useRef(null)
  const audioContext = useRef(null)
  const analyser = useRef(null)
  const animationFrame = useRef(null)

  const togglePlayback = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause()
        stopVisualization()
      } else {
        audioRef.current.play()
        startVisualization()
      }
      setIsPlaying(!isPlaying)
    }
  }

  const startVisualization = () => {
    if (!audioContext.current && audioRef.current) {
      audioContext.current = new (window.AudioContext || window.webkitAudioContext)()
      const source = audioContext.current.createMediaElementSource(audioRef.current)
      analyser.current = audioContext.current.createAnalyser()
      analyser.current.fftSize = 256
      source.connect(analyser.current)
      analyser.current.connect(audioContext.current.destination)
    }
    updateWaveform()
  }

  const updateWaveform = () => {
    if (!analyser.current) return

    const bufferLength = analyser.current.frequencyBinCount
    const dataArray = new Uint8Array(bufferLength)
    analyser.current.getByteFrequencyData(dataArray)

    const bars = 60
    const step = Math.floor(bufferLength / bars)
    const newWaveform = []

    for (let i = 0; i < bars; i++) {
      const value = dataArray[i * step] || 0
      // Normalize to 0.2-1.0 range
      const normalized = 0.2 + (value / 255) * 0.8
      newWaveform.push(normalized)
    }

    setWaveformData(newWaveform)
    animationFrame.current = requestAnimationFrame(updateWaveform)
  }

  const stopVisualization = () => {
    if (animationFrame.current) {
      cancelAnimationFrame(animationFrame.current)
      // Reset to base waveform
      setWaveformData(new Array(60).fill(0.3))
    }
  }

  const formatTime = (seconds) => {
    if (!seconds || isNaN(seconds)) return '0:00'
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime)
    }
  }

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration)
    }
  }

  const handleEnded = () => {
    setIsPlaying(false)
    setCurrentTime(0)
    stopVisualization()
  }

  const handleSeek = (e) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left
    const percentage = x / rect.width
    const newTime = percentage * duration
    
    if (audioRef.current && !isNaN(newTime)) {
      audioRef.current.currentTime = newTime
      setCurrentTime(newTime)
    }
  }

  useEffect(() => {
    return () => {
      stopVisualization()
      if (audioContext.current && audioContext.current.state !== 'closed') {
        audioContext.current.close().catch(err => console.log('AudioContext cleanup: already closed'))
      }
    }
  }, [])

  return (
    <div className="flex items-center gap-3 py-2 px-3 rounded-xl bg-white/5 backdrop-blur-sm border border-white/10 min-w-[280px] max-w-full overflow-hidden">
      {/* Play/Pause Button */}
      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        onClick={togglePlayback}
        className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 flex items-center justify-center shadow-lg transition-all duration-300"
      >
        {isPlaying ? (
          <Pause className="w-5 h-5 text-white" />
        ) : (
          <Play className="w-5 h-5 text-white ml-0.5" />
        )}
      </motion.button>

      {/* ChatGPT-Style Waveform & Progress */}
      <div className="flex-1 space-y-1.5 min-w-0 overflow-hidden">
        {/* Visual Waveform */}
        <div className="flex items-center gap-0.5 h-8 overflow-hidden">
          {waveformData.map((amplitude, i) => {
            const progress = currentTime / duration
            const barProgress = i / waveformData.length
            const isActive = barProgress <= progress
            const height = 4 + amplitude * 24 // 4-28px range
            
            return (
              <motion.div
                key={i}
                className={`w-0.5 rounded-full transition-all duration-100 ${
                  isActive 
                    ? 'bg-gradient-to-t from-purple-400 to-pink-400' 
                    : 'bg-white/20'
                }`}
                animate={{ 
                  height: `${height}px`,
                  opacity: isActive ? 1 : 0.5
                }}
                transition={{ 
                  duration: 0.1,
                  ease: "easeOut"
                }}
              />
            )
          })}
        </div>

        {/* Progress Bar */}
        <div 
          className="relative h-1 bg-white/10 rounded-full cursor-pointer group"
          onClick={handleSeek}
        >
          <motion.div
            className="h-1 bg-gradient-to-r from-purple-400 to-pink-400 rounded-full"
            style={{ width: `${(currentTime / duration) * 100}%` }}
            transition={{ duration: 0.1 }}
          />
          {/* Seeker Handle */}
          <div 
            className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
            style={{ left: `${(currentTime / duration) * 100}%`, transform: 'translate(-50%, -50%)' }}
          />
        </div>
      </div>

      {/* Time Display */}
      <div className="flex items-center gap-1 text-xs text-gray-400 font-mono flex-shrink-0">
        <Volume2 className="w-3 h-3" />
        <span>{formatTime(currentTime)}</span>
      </div>

      {/* Hidden Audio Element */}
      <audio
        ref={audioRef}
        src={audioUrl}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={handleEnded}
        preload="metadata"
      />
    </div>
  )
}
