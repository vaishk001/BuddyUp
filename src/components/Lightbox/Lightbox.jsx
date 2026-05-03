import React, { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Download, Share, ZoomIn, ZoomOut, RotateCw } from 'lucide-react'

export default function Lightbox({ open, onClose, src, type }) {
  const [scale, setScale] = useState(1)
  const [rotation, setRotation] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const [position, setPosition] = useState({ x: 0, y: 0 })

  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape') onClose()
      if (e.key === '+') setScale(prev => Math.min(prev + 0.25, 3))
      if (e.key === '-') setScale(prev => Math.max(prev - 0.25, 0.5))
      if (e.key === 'r') setRotation(prev => (prev + 90) % 360)
    }
    
    if (open) {
      window.addEventListener('keydown', onKey)
      document.body.style.overflow = 'hidden'
    }
    
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = 'unset'
      setScale(1)
      setRotation(0)
      setPosition({ x: 0, y: 0 })
    }
  }, [open, onClose])

  if (!open) return null

  const handleDownload = () => {
    const link = document.createElement('a')
    link.href = src
    link.download = `download-${Date.now()}`
    link.click()
  }

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Shared from ChatWave',
          url: src
        })
      } catch (err) {
        console.log('Error sharing:', err)
      }
    } else {
      navigator.clipboard.writeText(src)
      // Show toast notification
    }
  }

  const handleWheel = (e) => {
    e.preventDefault()
    const delta = -Math.sign(e.deltaY) * 0.1
    setScale(prev => Math.min(Math.max(prev + delta, 0.5), 3))
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-60 flex items-center justify-center bg-black/90 backdrop-blur-sm p-4 light:bg-gray-900/80"
        onClick={onClose}
      >
        {/* Enhanced Controls */}
        <div className="absolute top-6 right-6 flex items-center gap-2 z-70">
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={(e) => { e.stopPropagation(); setRotation(prev => (prev + 90) % 360) }}
            className="p-3 bg-white/10 hover:bg-white/20 rounded-xl text-white transition-all duration-300 backdrop-blur-sm light:bg-black/10 light:hover:bg-black/20 light:text-gray-800"
          >
            <RotateCw className="w-5 h-5" />
          </motion.button>
          
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={(e) => { e.stopPropagation(); setScale(prev => Math.min(prev + 0.25, 3)) }}
            className="p-3 bg-white/10 hover:bg-white/20 rounded-xl text-white transition-all duration-300 backdrop-blur-sm light:bg-black/10 light:hover:bg-black/20 light:text-gray-800"
          >
            <ZoomIn className="w-5 h-5" />
          </motion.button>
          
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={(e) => { e.stopPropagation(); setScale(prev => Math.max(prev - 0.25, 0.5)) }}
            className="p-3 bg-white/10 hover:bg-white/20 rounded-xl text-white transition-all duration-300 backdrop-blur-sm light:bg-black/10 light:hover:bg-black/20 light:text-gray-800"
          >
            <ZoomOut className="w-5 h-5" />
          </motion.button>
          
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={(e) => { e.stopPropagation(); handleDownload() }}
            className="p-3 bg-white/10 hover:bg-white/20 rounded-xl text-white transition-all duration-300 backdrop-blur-sm light:bg-black/10 light:hover:bg-black/20 light:text-gray-800"
          >
            <Download className="w-5 h-5" />
          </motion.button>
          
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={(e) => { e.stopPropagation(); handleShare() }}
            className="p-3 bg-white/10 hover:bg-white/20 rounded-xl text-white transition-all duration-300 backdrop-blur-sm light:bg-black/10 light:hover:bg-black/20 light:text-gray-800"
          >
            <Share className="w-5 h-5" />
          </motion.button>
          
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={onClose}
            className="p-3 bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 rounded-xl text-red-400 transition-all duration-300 backdrop-blur-sm light:bg-red-500/10 light:hover:bg-red-500/20 light:border-red-500/20"
          >
            <X className="w-5 h-5" />
          </motion.button>
        </div>

        {/* Media Container */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.8, opacity: 0 }}
          className="relative max-w-4xl max-h-full w-full"
          onClick={e => e.stopPropagation()}
          onWheel={handleWheel}
        >
          {type === 'video' ? (
            <motion.video
              src={src}
              controls
              autoPlay
              className="w-full h-auto max-h-[90vh] bg-black rounded-2xl shadow-2xl"
              style={{ 
                transform: `scale(${scale}) rotate(${rotation}deg)`,
                cursor: scale > 1 ? 'grab' : 'default'
              }}
            />
          ) : (
            <motion.img
              src={src}
              alt="preview"
              className="w-full h-auto max-h-[90vh] object-contain rounded-2xl shadow-2xl cursor-zoom-in"
              style={{ 
                transform: `scale(${scale}) rotate(${rotation}deg)`,
                cursor: scale > 1 ? 'grab' : 'zoom-in'
              }}
              drag={scale > 1}
              dragConstraints={{
                left: -100,
                right: 100,
                top: -100,
                bottom: 100
              }}
              whileDrag={{ cursor: 'grabbing' }}
            />
          )}
        </motion.div>

        {/* Scale Indicator */}
        {scale !== 1 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute bottom-6 left-6 bg-black/50 text-white px-3 py-2 rounded-xl backdrop-blur-sm light:bg-white/80 light:text-black"
          >
            {Math.round(scale * 100)}%
          </motion.div>
        )}
      </motion.div>
    </AnimatePresence>
  )
}