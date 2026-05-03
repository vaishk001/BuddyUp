import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, ChevronLeft, ChevronRight, Play, Pause, 
  Heart, MessageCircle, Share, MoreVertical,
  Volume2, VolumeX, Download, Flag, Plus, Trash2
} from 'lucide-react';
import { viewStory, likeStory, deleteStory } from '../../services/firestore';
import { useUI } from '../../contexts/UIContext';

export default function StoriesPanel({ open, onClose, stories = [], currentUser, onAddStory }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [progress, setProgress] = useState(0);
  const [showControls, setShowControls] = useState(true);
  const [isLiked, setIsLiked] = useState(false);
  const progressRef = useRef(null);
  const controlsTimeoutRef = useRef(null);
  const { showToast } = useUI();

  const currentStory = stories[currentIndex];

  // Mark story as viewed when opened
  useEffect(() => {
    if (open && currentStory && currentUser) {
      viewStory(currentStory.id, currentUser.uid);
    }
  }, [open, currentStory, currentUser]);

  // Check if user has liked this story
  useEffect(() => {
    if (currentStory) {
      const likes = currentStory.likes || [];
      setIsLiked(likes.includes(currentUser?.uid));
    }
  }, [currentStory, currentUser]);

  const hideControls = () => {
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    controlsTimeoutRef.current = setTimeout(() => {
      setShowControls(false);
    }, 3000);
  };

  const showControlsTemporarily = () => {
    setShowControls(true);
    hideControls();
  };

  useEffect(() => {
    if (!open) return;
    showControlsTemporarily();

    return () => {
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
    };
  }, [open]);

  useEffect(() => {
    if (!isPlaying || !open || !currentStory) return;

    const duration = currentStory.mediaType === 'video' ? 10000 : 5000; // 10s for video, 5s for image
    const startTime = Date.now();

    const updateProgress = () => {
      const elapsed = Date.now() - startTime;
      const newProgress = (elapsed / duration) * 100;
      setProgress(newProgress);

      if (newProgress < 100) {
        progressRef.current = requestAnimationFrame(updateProgress);
      } else {
        nextStory();
      }
    };

    progressRef.current = requestAnimationFrame(updateProgress);

    return () => {
      if (progressRef.current) {
        cancelAnimationFrame(progressRef.current);
      }
    };
  }, [currentIndex, isPlaying, open]);

  const nextStory = () => {
    if (currentIndex < stories.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setProgress(0);
    } else {
      onClose();
    }
  };

  const previousStory = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      setProgress(0);
    }
  };

  const handleLike = async () => {
    if (!currentStory || !currentUser) return;
    
    try {
      const liked = await likeStory(currentStory.id, currentUser.uid);
      setIsLiked(liked);
    } catch (error) {
      console.error('Like story error:', error);
    }
  };

  const handleDelete = async () => {
    if (!currentStory || !currentUser) return;
    
    if (!window.confirm('Delete this story?')) return;
    
    try {
      await deleteStory(currentStory.id, currentUser.uid);
      showToast('Story deleted', 'success');
      
      if (stories.length === 1) {
        onClose();
      } else if (currentIndex === stories.length - 1) {
        setCurrentIndex(currentIndex - 1);
      }
    } catch (error) {
      console.error('Delete story error:', error);
      showToast('Failed to delete story', 'error');
    }
  };

  if (!open || stories.length === 0) return null;

  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const now = new Date();
    const diff = Math.floor((now - date) / 1000 / 60); // minutes
    
    if (diff < 60) return `${diff}m ago`;
    if (diff < 1440) return `${Math.floor(diff / 60)}h ago`;
    return `${Math.floor(diff / 1440)}d ago`;
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-black/95 z-[200] flex items-center justify-center"
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
          onMouseMove={showControlsTemporarily}
          className="relative w-full max-w-md h-[80vh] bg-slate-900 rounded-2xl overflow-hidden shadow-2xl"
        >
          {/* Progress Bars */}
          <div className="absolute top-0 left-0 right-0 z-20 flex gap-1 p-2">
            {stories.map((_, index) => (
              <div key={index} className="flex-1 h-1 bg-white/20 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-white rounded-full transition-all"
                  style={{ 
                    width: index < currentIndex ? '100%' : 
                           index === currentIndex ? `${progress}%` : '0%' 
                  }}
                />
              </div>
            ))}
          </div>

          {/* Header */}
          <AnimatePresence>
            {showControls && (
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="absolute top-12 left-0 right-0 z-20 p-4 bg-gradient-to-b from-black/50 to-transparent"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center text-white font-bold">
                      {currentUser?.displayName?.[0]?.toUpperCase() || 'Y'}
                    </div>
                    <div>
                      <div className="text-white font-semibold text-sm">
                        {currentUser?.displayName || 'You'}
                      </div>
                      <div className="text-gray-300 text-xs">
                        {formatTime(currentStory?.createdAt)}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => setIsPlaying(!isPlaying)} 
                      className="p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors"
                    >
                      {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                    </button>
                    
                    {onAddStory && (
                      <button 
                        onClick={onAddStory} 
                        className="p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    )}
                    
                    <button 
                      onClick={handleDelete} 
                      className="p-2 bg-white/10 hover:bg-red-500/20 rounded-full text-white transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    
                    <button 
                      onClick={onClose} 
                      className="p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Navigation Areas */}
          <div className="absolute inset-0 flex z-10">
            <div 
              className="flex-1 cursor-pointer" 
              onClick={previousStory}
            />
            <div 
              className="flex-1 cursor-pointer" 
              onClick={nextStory}
            />
          </div>

          {/* Story Content */}
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStory?.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="w-full h-full flex items-center justify-center bg-black"
            >
              {currentStory?.mediaType === 'video' ? (
                <video
                  src={currentStory.mediaUrl}
                  autoPlay
                  loop
                  muted
                  className="w-full h-full object-contain"
                />
              ) : (
                <img
                  src={currentStory?.mediaUrl}
                  alt="Story"
                  className="w-full h-full object-contain"
                />
              )}
            </motion.div>
          </AnimatePresence>

          {/* Bottom Actions */}
          <AnimatePresence>
            {showControls && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                className="absolute bottom-0 left-0 right-0 z-20 p-6 bg-gradient-to-t from-black/50 to-transparent"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <button 
                      onClick={handleLike}
                      className={`flex items-center gap-2 px-4 py-2 rounded-full transition-all ${
                        isLiked 
                          ? 'bg-red-500 text-white' 
                          : 'bg-white/10 hover:bg-white/20 text-white'
                      }`}
                    >
                      <Heart className={`w-5 h-5 ${isLiked ? 'fill-current' : ''}`} />
                      <span className="text-sm font-medium">
                        {(currentStory?.likes?.length || 0)}
                      </span>
                    </button>
                  </div>
                  
                  <div className="text-white/60 text-xs">
                    {currentIndex + 1} / {stories.length}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}