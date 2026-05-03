// LandingPage.jsx
import React, { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence, useScroll, useTransform } from 'framer-motion'
import { 
  MessageCircle, 
  Shield, 
  Zap, 
  Users, 
  ArrowRight,
  Star,
  Globe,
  Smartphone,
  Lock,
  Heart,
  Sparkles,
  Check,
  Play,
  Smile,
  Image as ImageIcon,
  Mic,
  Palette
} from 'lucide-react'

// Mock Chat Component for Hero Section
const MockChat = () => {
  const [messages, setMessages] = useState([
    { id: 1, text: "Hey! Have you tried ChatWave?", sender: 'other', time: '10:00' },
  ])

  useEffect(() => {
    const sequence = [
      { id: 2, text: "Just signed up! The UI is amazing 🤩", sender: 'me', time: '10:01', delay: 1500 },
      { id: 3, text: "Right? It feels so natural.", sender: 'other', time: '10:01', delay: 3000 },
      { id: 4, text: "And the dark mode is perfect 🌙", sender: 'me', time: '10:02', delay: 4500 },
      { id: 5, type: 'image', sender: 'other', time: '10:02', delay: 6000 },
      { id: 6, text: "Love it! Let's invite the team.", sender: 'me', time: '10:03', delay: 7500 },
    ]

    let timeouts = []

    sequence.forEach(({ delay, ...msg }) => {
      const timeout = setTimeout(() => {
        setMessages(prev => [...prev, msg])
      }, delay)
      timeouts.push(timeout)
    })

    return () => timeouts.forEach(clearTimeout)
  }, [])

  return (
    <div className="w-full h-full flex flex-col relative">
      {/* Mock Header */}
      <div className="bg-slate-800/50 p-4 flex items-center gap-3 border-b border-white/5 backdrop-blur-md z-10">
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold text-sm shadow-lg shadow-purple-500/20">
          A
        </div>
        <div>
          <div className="font-semibold text-white text-sm">Alex Design</div>
          <div className="text-xs text-green-400 flex items-center gap-1">
            <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse"/> Online
          </div>
        </div>
      </div>

      {/* Mock Messages */}
      <div className="flex-1 p-6 overflow-y-auto space-y-6 scrollbar-hide">
        <AnimatePresence mode="popLayout">
          {messages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 20, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              layout
              className={`flex ${msg.sender === 'me' ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`max-w-[80%] p-4 rounded-2xl ${
                msg.sender === 'me' 
                  ? 'bg-gradient-to-br from-purple-600 to-purple-700 text-white rounded-tr-sm shadow-lg shadow-purple-500/10' 
                  : 'bg-slate-800 text-gray-200 rounded-tl-sm border border-white/5'
              } shadow-md`}>
                {msg.type === 'image' ? (
                  <div className="flex items-center gap-3 text-sm">
                    <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
                      <ImageIcon className="w-5 h-5" />
                    </div>
                    <span className="font-medium">Shared a photo</span>
                  </div>
                ) : (
                  <p className="text-[15px] leading-relaxed">{msg.text}</p>
                )}
                <div className={`text-[10px] mt-1.5 opacity-70 font-medium ${msg.sender === 'me' ? 'text-purple-200' : 'text-gray-500'}`}>
                  {msg.time}
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Mock Input */}
      <div className="p-4 bg-slate-800/50 border-t border-white/5 backdrop-blur-md z-10">
        <div className="flex items-center gap-3 bg-slate-900/50 p-1.5 rounded-full border border-white/5">
          <div className="p-2 rounded-full hover:bg-white/5 text-gray-400 transition-colors cursor-pointer">
            <Smile className="w-5 h-5" />
          </div>
          <div className="flex-1 h-8 flex items-center text-sm text-gray-500 px-2">
            Type a message...
          </div>
          <div className="p-2 rounded-full bg-purple-500/20 text-purple-400 hover:bg-purple-500/30 transition-colors cursor-pointer">
            <Mic className="w-5 h-5" />
          </div>
        </div>
      </div>
    </div>
  )
}

export default function LandingPage() {
  const { scrollY } = useScroll()
  const y1 = useTransform(scrollY, [0, 500], [0, 200])
  const y2 = useTransform(scrollY, [0, 500], [0, -150])

  const features = [
    {
      icon: <Zap className="w-6 h-6 text-yellow-400" />,
      title: "Lightning Fast",
      description: "Real-time message delivery with zero latency."
    },
    {
      icon: <Shield className="w-6 h-6 text-green-400" />,
      title: "Secure by Default",
      description: "Your conversations are private and encrypted."
    },
    {
      icon: <Palette className="w-6 h-6 text-purple-400" />,
      title: "Beautifully Designed",
      description: "A modern interface that's easy on the eyes."
    }
  ]

  return (
    <div className="min-h-screen bg-slate-950 text-white overflow-x-hidden selection:bg-purple-500/30">
      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-slate-950/80 backdrop-blur-lg border-b border-white/5">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-tr from-purple-500 to-pink-500 rounded-xl flex items-center justify-center">
              <MessageCircle className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">
              ChatWave
            </span>
          </div>
          <div className="flex items-center gap-4">
            <Link to="/auth" className="text-sm font-medium text-gray-400 hover:text-white transition-colors">
              Sign In
            </Link>
            <Link 
              to="/auth" 
              className="px-4 py-2 bg-white text-slate-950 rounded-full text-sm font-bold hover:bg-gray-200 transition-colors"
            >
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 px-6 overflow-hidden">
        {/* Background Blobs */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[1000px] bg-purple-500/10 rounded-full blur-[120px] -z-10" />
        <div className="absolute bottom-0 left-0 w-[800px] h-[800px] bg-blue-500/10 rounded-full blur-[120px] -z-10" />

        <div className="max-w-7xl mx-auto flex flex-col items-center text-center">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="space-y-8 max-w-4xl mx-auto relative z-10"
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-sm font-medium text-purple-300 hover:bg-white/10 transition-colors cursor-default">
              <Sparkles className="w-4 h-4" />
              <span>Reimagining how the world connects</span>
            </div>
            
            <h1 className="text-6xl md:text-8xl font-bold leading-tight tracking-tight">
              Connect Beyond <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-400 to-orange-400 animate-gradient-x">
                Boundaries.
              </span>
            </h1>
            
            <p className="text-xl md:text-2xl text-gray-400 max-w-2xl mx-auto leading-relaxed">
              The most intuitive way to share your world. 
              Fast, secure, and designed for the modern web.
            </p>

            <div className="flex flex-col sm:flex-row items-center gap-4 justify-center pt-4">
              <Link 
                to="/auth"
                className="px-8 py-4 bg-white text-slate-950 rounded-full font-bold text-lg hover:scale-105 transition-transform flex items-center gap-2 shadow-xl shadow-purple-500/20"
              >
                Start Chatting Now
                <ArrowRight className="w-5 h-5" />
              </Link>
              <button className="px-8 py-4 bg-white/5 text-white border border-white/10 rounded-full font-bold text-lg hover:bg-white/10 transition-colors flex items-center gap-2 backdrop-blur-sm">
                <Play className="w-5 h-5 fill-current" />
                See How It Works
              </button>
            </div>
          </motion.div>

          {/* Hero Visual */}
          <motion.div 
            initial={{ opacity: 0, y: 100, rotateX: 20 }}
            animate={{ opacity: 1, y: 0, rotateX: 0 }}
            transition={{ duration: 1, delay: 0.2, type: "spring" }}
            className="mt-20 relative w-full max-w-5xl perspective-1000"
          >
            <div className="relative z-10 transform transition-transform hover:scale-[1.02] duration-500">
              <div className="absolute -inset-1 bg-gradient-to-r from-purple-500 via-pink-500 to-blue-500 rounded-[2.5rem] blur opacity-30"></div>
              <div className="bg-slate-900 rounded-[2.5rem] border border-white/10 shadow-2xl overflow-hidden">
                <div className="grid md:grid-cols-[300px_1fr] h-[600px]">
                  {/* Sidebar Mockup */}
                  <div className="hidden md:flex flex-col border-r border-white/5 bg-slate-900/50 p-4">
                    <div className="flex items-center gap-3 mb-8 px-2">
                      <div className="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center">
                        <MessageCircle className="w-5 h-5 text-purple-400" />
                      </div>
                      <span className="font-bold">ChatWave</span>
                    </div>
                    <div className="space-y-2">
                      {[1, 2, 3, 4].map((i) => (
                        <div key={i} className={`p-3 rounded-xl flex items-center gap-3 ${i === 1 ? 'bg-white/5' : 'opacity-50'}`}>
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gray-700 to-gray-600" />
                          <div className="flex-1">
                            <div className="h-2 w-20 bg-white/20 rounded mb-1" />
                            <div className="h-2 w-12 bg-white/10 rounded" />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  {/* Chat Area Mockup */}
                  <div className="flex flex-col bg-slate-900/30 relative">
                    <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-slate-900/50 pointer-events-none" />
                    <MockChat />
                  </div>
                </div>
              </div>
            </div>

            {/* Decorative Elements (Non-floating badges) */}
            <div className="absolute -right-20 top-1/4 w-64 h-64 bg-purple-500/20 rounded-full blur-[80px] -z-10" />
            <div className="absolute -left-20 bottom-1/4 w-64 h-64 bg-blue-500/20 rounded-full blur-[80px] -z-10" />
          </motion.div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-24 bg-slate-900/50">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid md:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                viewport={{ once: true }}
                className="p-8 rounded-3xl bg-white/5 border border-white/5 hover:border-white/10 transition-colors group"
              >
                <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  {feature.icon}
                </div>
                <h3 className="text-xl font-bold mb-3">{feature.title}</h3>
                <p className="text-gray-400 leading-relaxed">
                  {feature.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Social Proof / Community */}
      <section className="py-24 px-6 overflow-hidden">
        <div className="max-w-7xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="relative z-10"
          >
            <h2 className="text-4xl md:text-5xl font-bold mb-6">
              Join the <span className="text-purple-400">Conversation</span>
            </h2>
            <p className="text-xl text-gray-400 mb-12 max-w-2xl mx-auto">
              Be part of a growing community that values privacy, speed, and design.
            </p>
            
            <div className="flex flex-wrap justify-center gap-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center gap-2 px-6 py-3 bg-white/5 rounded-full border border-white/10">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-gray-700 to-gray-600 flex items-center justify-center text-xs font-bold">
                    {String.fromCharCode(65 + i)}
                  </div>
                  <div className="text-left">
                    <div className="text-sm font-bold text-white">User {i + 1}</div>
                    <div className="text-xs text-gray-400">Joined today</div>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="relative rounded-[3rem] overflow-hidden bg-gradient-to-br from-purple-600 to-blue-600 p-12 md:p-24 text-center">
            <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20"></div>
            <div className="relative z-10">
              <h2 className="text-4xl md:text-6xl font-bold mb-8">
                Ready to get started?
              </h2>
              <p className="text-xl text-white/80 mb-12 max-w-2xl mx-auto">
                Create your account today and experience the difference. No credit card required.
              </p>
              <Link 
                to="/auth"
                className="inline-flex items-center gap-2 px-8 py-4 bg-white text-purple-600 rounded-full font-bold text-lg hover:bg-gray-100 transition-colors shadow-xl"
              >
                Create Free Account
                <ArrowRight className="w-5 h-5" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-white/5 bg-slate-950">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <MessageCircle className="w-6 h-6 text-purple-500" />
            <span className="font-bold text-lg">ChatWave</span>
          </div>
          <div className="text-gray-500 text-sm">
            © {new Date().getFullYear()} ChatWave. All rights reserved.
          </div>
          <div className="flex gap-6">
            <a href="#" className="text-gray-500 hover:text-white transition-colors">Privacy</a>
            <a href="#" className="text-gray-500 hover:text-white transition-colors">Terms</a>
            <a href="#" className="text-gray-500 hover:text-white transition-colors">Twitter</a>
          </div>
        </div>
      </footer>
    </div>
  )
}
