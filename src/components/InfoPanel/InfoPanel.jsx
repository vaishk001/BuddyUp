import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  X, 
  Image as ImageIcon, 
  FileText, 
  Link as LinkIcon, 
  ChevronRight,
  Download,
  ExternalLink
} from 'lucide-react'

export default function InfoPanel({ chat, onClose }) {
  const [activeSection, setActiveSection] = useState('media')

  const sections = [
    { id: 'media', label: 'Media', icon: ImageIcon },
    { id: 'files', label: 'Files', icon: FileText },
    { id: 'links', label: 'Links', icon: LinkIcon },
  ]

  // TODO: Replace with real data from chat when available
  const media = []
  const files = []
  const links = []

  return (
    <div className="w-80 h-full bg-slate-900 border-l border-white/5 flex flex-col">
      {/* Header */}
      <div className="p-6 border-b border-white/5 flex items-center justify-between">
        <h3 className="font-bold text-white">Chat Info</h3>
        <button 
          onClick={onClose}
          className="p-2 rounded-full hover:bg-white/5 text-gray-400 hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Chat Details */}
      <div className="p-6 flex flex-col items-center border-b border-white/5">
        <div className="w-24 h-24 rounded-full bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 p-1 mb-4">
          <div className="w-full h-full rounded-full bg-slate-900 flex items-center justify-center overflow-hidden">
            {chat?.photoURL ? (
              <img src={chat.photoURL} alt={chat.name} className="w-full h-full object-cover" />
            ) : (
              <span className="text-3xl font-bold text-white">
                {chat?.name?.[0]?.toUpperCase()}
              </span>
            )}
          </div>
        </div>
        <h2 className="text-xl font-bold text-white mb-1">{chat?.name}</h2>
        <p className="text-sm text-gray-400">
          {chat?.type === 'group' ? `${chat.members?.length || 0} members` : 'Online'}
        </p>
      </div>

      {/* Tabs */}
      <div className="flex p-2 gap-2 border-b border-white/5">
        {sections.map((section) => (
          <button
            key={section.id}
            onClick={() => setActiveSection(section.id)}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
              activeSection === section.id
                ? 'bg-white/10 text-white'
                : 'text-gray-500 hover:bg-white/5 hover:text-gray-300'
            }`}
          >
            <section.icon className="w-4 h-4" />
            {section.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
        <AnimatePresence mode="wait">
          {activeSection === 'media' && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              {media.length > 0 ? (
                <div className="grid grid-cols-3 gap-2">
                  {media.map((item) => (
                    <div key={item.id} className="aspect-square rounded-lg overflow-hidden bg-white/5 cursor-pointer hover:opacity-80 transition-opacity">
                      <img src={item.url} alt="" className="w-full h-full object-cover" />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-40 text-gray-500">
                  <ImageIcon className="w-12 h-12 mb-2 opacity-50" />
                  <p className="text-sm">No media shared yet</p>
                </div>
              )}
            </motion.div>
          )}

          {activeSection === 'files' && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              {files.length > 0 ? (
                <div className="space-y-3">
                  {files.map((file) => (
                    <div key={file.id} className="flex items-center gap-3 p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors group cursor-pointer">
                      <div className="w-10 h-10 rounded-lg bg-indigo-500/20 flex items-center justify-center text-indigo-400">
                        <FileText className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-white truncate">{file.name}</div>
                        <div className="text-xs text-gray-500">{file.size} • {file.date}</div>
                      </div>
                      <button className="p-2 rounded-full hover:bg-white/10 text-gray-400 hover:text-white opacity-0 group-hover:opacity-100 transition-all">
                        <Download className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-40 text-gray-500">
                  <FileText className="w-12 h-12 mb-2 opacity-50" />
                  <p className="text-sm">No files shared yet</p>
                </div>
              )}
            </motion.div>
          )}

          {activeSection === 'links' && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              {links.length > 0 ? (
                <div className="space-y-3">
                  {links.map((link) => (
                    <div key={link.id} className="flex items-center gap-3 p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors group cursor-pointer">
                      <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center text-blue-400">
                        <LinkIcon className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-white truncate">{link.title}</div>
                        <div className="text-xs text-blue-400 truncate">{link.url}</div>
                      </div>
                      <button className="p-2 rounded-full hover:bg-white/10 text-gray-400 hover:text-white opacity-0 group-hover:opacity-100 transition-all">
                        <ExternalLink className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-40 text-gray-500">
                  <LinkIcon className="w-12 h-12 mb-2 opacity-50" />
                  <p className="text-sm">No links shared yet</p>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
