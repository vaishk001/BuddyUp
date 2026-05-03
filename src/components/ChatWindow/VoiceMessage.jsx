import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, Square, Play, Pause, Send, X, Activity, Clock, FileText } from 'lucide-react';
import { setUserStatusFlags } from '../../services/firestore';
import { useAuth } from '../../contexts/AuthContext';

export default function VoiceMessage({ onSend, onClose }) {
  const [isRecording, setIsRecording] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioBlob, setAudioBlob] = useState(null);
  const [recordingTime, setRecordingTime] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [audioUrl, setAudioUrl] = useState(null);
  const [transcript, setTranscript] = useState('');
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [waveformData, setWaveformData] = useState(new Array(40).fill(4));
  const mediaRecorder = useRef(null);
  const audioRef = useRef(null);
  const timerRef = useRef(null);
  const audioContext = useRef(null);
  const analyser = useRef(null);
  const animationFrame = useRef(null);
  const recognition = useRef(null);
  const { user } = useAuth();

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Setup audio analysis for waveform
      audioContext.current = new (window.AudioContext || window.webkitAudioContext)();
      const source = audioContext.current.createMediaStreamSource(stream);
      analyser.current = audioContext.current.createAnalyser();
      analyser.current.fftSize = 256;
      source.connect(analyser.current);
      
      // Start waveform animation
      updateWaveform();
      
      // Try to use audio/webm;codecs=opus for better compatibility
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : 'audio/ogg';
      
      mediaRecorder.current = new MediaRecorder(stream, { mimeType });
      const chunks = [];

      mediaRecorder.current.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };
      
      mediaRecorder.current.onstop = () => {
        const blob = new Blob(chunks, { type: mimeType });
        setAudioBlob(blob);
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);
        stream.getTracks().forEach(track => track.stop());
        
        // Stop waveform animation
        if (animationFrame.current) {
          cancelAnimationFrame(animationFrame.current);
        }
        if (audioContext.current) {
          audioContext.current.close();
        }
      };

      mediaRecorder.current.start();
      setIsRecording(true);
      if (user?.uid) setUserStatusFlags(user.uid, { recording: true });
      setRecordingTime(0);
      
      // Start timer
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
      
      // Start voice-to-text
      startTranscription();
    } catch (error) {
      console.error('Error starting recording:', error);
      alert('Microphone access denied or not available');
    }
  };

  const updateWaveform = () => {
    if (!analyser.current) return;
    
    const bufferLength = analyser.current.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    analyser.current.getByteFrequencyData(dataArray);
    
    // Sample 40 points from the frequency data
    const bars = 40;
    const step = Math.floor(bufferLength / bars);
    const newWaveform = [];
    
    for (let i = 0; i < bars; i++) {
      const value = dataArray[i * step] || 0;
      // Map 0-255 to 4-32 pixels height
      const height = 4 + (value / 255) * 28;
      newWaveform.push(height);
    }
    
    setWaveformData(newWaveform);
    animationFrame.current = requestAnimationFrame(updateWaveform);
  };

  const startTranscription = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      console.log('Speech recognition not supported');
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    recognition.current = new SpeechRecognition();
    recognition.current.continuous = true;
    recognition.current.interimResults = true;
    recognition.current.lang = 'en-US';

    recognition.current.onstart = () => {
      setIsTranscribing(true);
    };

    recognition.current.onresult = (event) => {
      let interimTranscript = '';
      let finalTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcriptPiece = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcriptPiece + ' ';
        } else {
          interimTranscript += transcriptPiece;
        }
      }

      setTranscript(prev => {
        const updated = (prev + finalTranscript).trim();
        return updated || interimTranscript;
      });
    };

    recognition.current.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      if (event.error !== 'no-speech') {
        setIsTranscribing(false);
      }
    };

    recognition.current.onend = () => {
      setIsTranscribing(false);
    };

    try {
      recognition.current.start();
    } catch (error) {
      console.error('Failed to start speech recognition:', error);
    }
  };

  const stopRecording = () => {
    if (mediaRecorder.current && isRecording) {
      mediaRecorder.current.stop();
      setIsRecording(false);
      if (user?.uid) setUserStatusFlags(user.uid, { recording: false });
      clearInterval(timerRef.current);
      
      // Stop transcription
      if (recognition.current) {
        recognition.current.stop();
      }
      
      // Stop waveform animation
      if (animationFrame.current) {
        cancelAnimationFrame(animationFrame.current);
      }
    }
  };

  const togglePlayback = () => {
    if (!audioRef.current) return;
    
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play()
        .then(() => setIsPlaying(true))
        .catch(err => {
          console.error('Playback error:', err);
          alert('Failed to play audio');
        });
    }
  };

  const handleSend = () => {
    if (audioBlob) {
      onSend(audioBlob);
      cleanup();
    }
  };

  const cleanup = () => {
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    if (animationFrame.current) {
      cancelAnimationFrame(animationFrame.current);
    }
    if (audioContext.current && audioContext.current.state !== 'closed') {
      audioContext.current.close().catch(err => console.log('AudioContext already closed'));
    }
    if (recognition.current) {
      try {
        recognition.current.stop();
      } catch (e) {
        // Already stopped
      }
    }
    if (user?.uid) {
      setUserStatusFlags(user.uid, { recording: false });
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  useEffect(() => {
    return () => {
      cleanup();
    };
  }, [user]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className="bg-slate-800/95 backdrop-blur-xl rounded-2xl border border-white/10 shadow-2xl p-6 w-full max-w-md"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white shadow-lg">
            <Mic className="w-5 h-5" />
          </div>
          <div>
            <div className="font-semibold text-white">Voice Message</div>
            <div className="text-sm text-gray-400">
              {isTranscribing ? 'Transcribing...' : 'Record and send audio'}
            </div>
          </div>
        </div>
        <button
          onClick={() => {
            cleanup();
            onClose();
          }}
          className="p-2 hover:bg-white/10 rounded-xl transition-all duration-300"
        >
          <X className="w-5 h-5 text-gray-400" />
        </button>
      </div>

      {!audioBlob ? (
        <div className="space-y-6">
          {/* Recording Visualization */}
          <div className="flex flex-col items-center">
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={isRecording ? stopRecording : startRecording}
              className={`w-20 h-20 rounded-full flex items-center justify-center shadow-2xl transition-all duration-300 ${
                isRecording 
                  ? 'bg-red-500 hover:bg-red-600 animate-pulse' 
                  : 'bg-gradient-to-br from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600'
              }`}
            >
              {isRecording ? (
                <Square className="w-8 h-8 text-white" />
              ) : (
                <Mic className="w-8 h-8 text-white" />
              )}
            </motion.button>

            {/* Timer */}
            {isRecording && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex items-center gap-2 mt-4 text-white"
              >
                <Clock className="w-4 h-4" />
                <span className="font-mono text-lg">{formatTime(recordingTime)}</span>
              </motion.div>
            )}

            {/* ChatGPT-Style Waveform Animation */}
            {isRecording && (
              <div className="flex items-center gap-1 mt-6 h-12">
                {waveformData.map((height, i) => (
                  <motion.div
                    key={i}
                    className="w-1 bg-gradient-to-t from-purple-400 to-pink-400 rounded-full"
                    animate={{ 
                      height: `${height}px`,
                    }}
                    transition={{ 
                      duration: 0.1,
                      ease: "easeOut"
                    }}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Transcription Display */}
          {transcript && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-4 bg-white/5 border border-white/10 rounded-xl"
            >
              <div className="flex items-start gap-2">
                <FileText className="w-4 h-4 text-purple-400 mt-1 flex-shrink-0" />
                <div>
                  <div className="text-xs text-gray-400 mb-1">Transcription</div>
                  <p className="text-sm text-white leading-relaxed">{transcript}</p>
                </div>
              </div>
            </motion.div>
          )}

          {/* Instructions */}
          <div className="text-center">
            <div className="text-gray-400 text-sm">
              {isRecording 
                ? 'Recording... Click stop when finished' 
                : 'Click the microphone to start recording'
              }
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Playback Controls */}
          <div className="flex items-center gap-4">
            <button
              onClick={togglePlayback}
              className="w-14 h-14 rounded-2xl bg-gradient-to-br from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 flex items-center justify-center shadow-lg transition-all duration-300 hover:scale-105"
            >
              {isPlaying ? (
                <Pause className="w-6 h-6 text-white" />
              ) : (
                <Play className="w-6 h-6 text-white ml-1" />
              )}
            </button>

            <div className="flex-1">
              <div className="flex items-center justify-between mb-2">
                <div className="text-white font-medium">Voice Message</div>
                <div className="text-sm text-gray-400 font-mono">
                  {formatTime(Math.floor(currentTime))} / {formatTime(recordingTime)}
                </div>
              </div>
              
              {/* Custom Progress Bar */}
              <div className="w-full bg-white/10 rounded-full h-2">
                <motion.div
                  className="h-2 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full"
                  style={{ 
                    width: `${(currentTime / (recordingTime || 1)) * 100}%` 
                  }}
                  transition={{ duration: 0.1 }}
                />
              </div>
            </div>
          </div>

          {/* Audio Element */}
          {audioUrl && (
            <audio
              ref={audioRef}
              src={audioUrl}
              onEnded={() => {
                setIsPlaying(false);
                setCurrentTime(0);
              }}
              onTimeUpdate={() => {
                if (audioRef.current) {
                  setCurrentTime(audioRef.current.currentTime);
                }
              }}
              onLoadedMetadata={() => setCurrentTime(0)}
            />
          )}

          {/* Transcription Display (if available) */}
          {transcript && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-4 bg-white/5 border border-white/10 rounded-xl"
            >
              <div className="flex items-start gap-2">
                <FileText className="w-4 h-4 text-purple-400 mt-1 flex-shrink-0" />
                <div>
                  <div className="text-xs text-gray-400 mb-1">Transcription</div>
                  <p className="text-sm text-white leading-relaxed">{transcript}</p>
                </div>
              </div>
            </motion.div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3">
            <button
              onClick={() => {
                setAudioBlob(null);
                setAudioUrl(null);
                setTranscript('');
                setCurrentTime(0);
                if (audioRef.current) {
                  audioRef.current.pause();
                  audioRef.current.currentTime = 0;
                }
                setIsPlaying(false);
              }}
              className="flex-1 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-white transition-all duration-300 hover:scale-105"
            >
              Record Again
            </button>
            <button
              onClick={handleSend}
              className="flex-1 py-3 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 rounded-xl text-white font-medium transition-all duration-300 hover:scale-105 flex items-center justify-center gap-2"
            >
              <Send className="w-4 h-4" />
              Send
            </button>
          </div>
        </div>
      )}
    </motion.div>
  );
}