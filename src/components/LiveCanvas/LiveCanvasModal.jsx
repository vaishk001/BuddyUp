import React, { useRef, useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Trash2, Eraser, Pen, Palette, MousePointer2 } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { listenCanvasStrokes, addCanvasStroke, clearCanvas } from '../../services/firestore'

const COLORS = ['#ffffff', '#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#a855f7', '#ec4899']
const SIZES = [2, 5, 10, 20]

export default function LiveCanvasModal({ chatId, onClose }) {
  const { user } = useAuth()
  const canvasRef = useRef(null)
  
  const [strokes, setStrokes] = useState([])
  const [isDrawing, setIsDrawing] = useState(false)
  const [currentStroke, setCurrentStroke] = useState(null)
  
  const [color, setColor] = useState('#ffffff')
  const [size, setSize] = useState(5)
  const [isEraser, setIsEraser] = useState(false)
  
  // Setup real-time listener for strokes
  useEffect(() => {
    if (!chatId) return
    const unsub = listenCanvasStrokes(chatId, (fetchedStrokes) => {
      setStrokes(fetchedStrokes)
    })
    return unsub
  }, [chatId])

  // Redraw canvas when strokes or window size change
  useEffect(() => {
    redrawCanvas()
    window.addEventListener('resize', redrawCanvas)
    return () => window.removeEventListener('resize', redrawCanvas)
  }, [strokes, currentStroke]) // Re-run when new strokes arrive or current stroke updates

  const redrawCanvas = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    
    // Ensure canvas dimensions match display size for sharp rendering
    const rect = canvas.getBoundingClientRect()
    if (canvas.width !== rect.width || canvas.height !== rect.height) {
      canvas.width = rect.width
      canvas.height = rect.height
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'

    // Draw all completed strokes
    strokes.forEach(stroke => drawStroke(ctx, stroke, canvas.width, canvas.height))
    
    // Draw the active stroke being drawn by THIS user
    if (currentStroke) {
      drawStroke(ctx, currentStroke, canvas.width, canvas.height)
    }
  }

  const drawStroke = (ctx, stroke, cw, ch) => {
    if (!stroke.points || stroke.points.length < 2) return

    ctx.beginPath()
    ctx.strokeStyle = stroke.isEraser ? '#000' : stroke.color
    ctx.lineWidth = stroke.size
    ctx.globalCompositeOperation = stroke.isEraser ? 'destination-out' : 'source-over'

    // First point
    ctx.moveTo(stroke.points[0].x * cw, stroke.points[0].y * ch)

    // Draw lines to subsequent points
    for (let i = 1; i < stroke.points.length; i++) {
      ctx.lineTo(stroke.points[i].x * cw, stroke.points[i].y * ch)
    }
    
    ctx.stroke()
    ctx.globalCompositeOperation = 'source-over' // Reset
  }

  // Handle pointer down (mouse/touch)
  const handlePointerDown = (e) => {
    e.preventDefault() // Prevent scrolling on touch
    setIsDrawing(true)
    const { x, y } = getPointerPos(e)
    setCurrentStroke({
      userId: user.uid,
      color,
      size,
      isEraser,
      points: [{ x, y }]
    })
  }

  // Handle pointer move
  const handlePointerMove = (e) => {
    e.preventDefault()
    if (!isDrawing || !currentStroke) return

    const { x, y } = getPointerPos(e)
    setCurrentStroke(prev => ({
      ...prev,
      points: [...prev.points, { x, y }]
    }))
  }

  // Handle pointer up
  const handlePointerUp = async (e) => {
    e.preventDefault()
    if (!isDrawing || !currentStroke) return
    setIsDrawing(false)

    // Only save if we actually drew something (more than 1 point)
    if (currentStroke.points.length > 1) {
      try {
        await addCanvasStroke(chatId, currentStroke)
      } catch (err) {
        console.error("Failed to save stroke:", err)
      }
    }
    setCurrentStroke(null)
  }

  // Extract normalized (0.0 to 1.0) coordinates from event
  const getPointerPos = (e) => {
    const canvas = canvasRef.current
    const rect = canvas.getBoundingClientRect()
    
    let clientX, clientY
    
    // Support both mouse and touch events
    if (e.touches && e.touches.length > 0) {
      clientX = e.touches[0].clientX
      clientY = e.touches[0].clientY
    } else {
      clientX = e.clientX
      clientY = e.clientY
    }

    return {
      x: (clientX - rect.left) / rect.width,
      y: (clientY - rect.top) / rect.height
    }
  }

  const handleClear = async () => {
    if (window.confirm("Clear canvas for everyone?")) {
      await clearCanvas(chatId)
    }
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 50 }}
        className="fixed inset-0 z-[200] bg-slate-950 flex flex-col overflow-hidden"
      >
        {/* Header toolbar */}
        <div className="h-16 bg-slate-900 border-b border-white/10 px-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <Palette className="w-5 h-5 text-purple-400" />
            <h2 className="text-white font-medium text-lg hidden sm:block">Live Canvas</h2>
            <span className="text-xs bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded-full border border-purple-500/30 ml-2 animate-pulse">
              Live
            </span>
          </div>
          
          <div className="flex items-center gap-1 sm:gap-3 bg-slate-800 p-1 rounded-xl">
            {/* Pen Tool */}
            <button
              onClick={() => setIsEraser(false)}
              className={`p-2 rounded-lg transition-colors ${!isEraser ? 'bg-indigo-500 text-white' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
            >
              <Pen className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>

            {/* Eraser Tool */}
            <button
              onClick={() => setIsEraser(true)}
              className={`p-2 rounded-lg transition-colors ${isEraser ? 'bg-indigo-500 text-white' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
            >
              <Eraser className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>

            <div className="w-px h-6 bg-white/10 mx-1" />

            {/* Sizes */}
            <div className="flex items-center gap-1 hidden sm:flex">
              {SIZES.map(s => (
                <button
                  key={s}
                  onClick={() => setSize(s)}
                  className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${size === s ? 'bg-white/10 text-white' : 'text-gray-400 hover:bg-white/5'}`}
                >
                  <div className="bg-current rounded-full" style={{ width: Math.max(2, s/2), height: Math.max(2, s/2) }} />
                </button>
              ))}
            </div>

            <div className="w-px h-6 bg-white/10 mx-1 hidden sm:block" />

            {/* Colors */}
            <div className="flex items-center gap-1 mr-2">
              {COLORS.map(c => (
                <button
                  key={c}
                  onClick={() => { setColor(c); setIsEraser(false) }}
                  className={`w-6 h-6 sm:w-8 sm:h-8 rounded-full border-2 transition-transform ${color === c && !isEraser ? 'border-white scale-110 shadow-lg' : 'border-transparent hover:scale-110'}`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleClear}
              className="p-2 text-rose-400 hover:bg-rose-500/10 rounded-xl transition-colors"
              title="Clear Canvas"
            >
              <Trash2 className="w-5 h-5" />
            </button>
            <button
              onClick={onClose}
              className="p-2 bg-white/10 hover:bg-white/20 text-white rounded-xl transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Canvas Area */}
        <div className="flex-1 relative bg-slate-950 w-full h-full cursor-crosshair overflow-hidden touch-none">
          {/* Subtle grid pattern background */}
          <div className="absolute inset-0 opacity-[0.03]" style={{
            backgroundImage: `linear-gradient(rgba(255,255,255,1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,1) 1px, transparent 1px)`,
            backgroundSize: '20px 20px'
          }} />
          
          <canvas
            ref={canvasRef}
            className="absolute inset-0 w-full h-full touch-none"
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerOut={handlePointerUp}
            onPointerCancel={handlePointerUp}
          />

          {strokes.length === 0 && !currentStroke && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="text-center text-gray-500 flex flex-col items-center">
                <MousePointer2 className="w-12 h-12 mb-4 opacity-50" />
                <p className="text-lg font-medium">Draw something together!</p>
                <p className="text-sm opacity-70">Changes sync instantly</p>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  )
}
