import React, { createContext, useContext, useEffect, useState } from 'react'
import { signOut, onAuthStateChanged, signInWithPopup } from 'firebase/auth'
import { auth, db, googleProvider } from '../firebase'
import { doc, onSnapshot, setDoc, getDoc } from 'firebase/firestore'
import { setOnlineStatus, touchLastSeen } from '../services/firestore'
import { useUI } from './UIContext'

const AuthContext = createContext()

export function useAuth() {
  return useContext(AuthContext)
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [userDoc, setUserDoc] = useState(null)
  const [loading, setLoading] = useState(true)
  const [authError, setAuthError] = useState(null)
  const { showToast } = useUI()

  // Enhanced logout function
  const logout = async () => {
    try {
      await signOut(auth)
      showToast('Successfully logged out', 'success')
      setAuthError(null)
    } catch (error) {
      console.error('Logout error:', error)
      setAuthError(error.message)
      showToast('Logout failed', 'error')
      throw error
    }
  }

  // Enhanced Google Sign In
  const signInWithGoogle = async () => {
    try {
      setLoading(true)
      setAuthError(null)
      const result = await signInWithPopup(auth, googleProvider)
      showToast('Successfully signed in!', 'success')
      return result
    } catch (error) {
      console.error('Google sign in error:', error)
      setAuthError(error.message)
      showToast('Sign in failed', 'error')
      throw error
    } finally {
      setLoading(false)
    }
  }

  // Initialize user document if it doesn't exist
  const initializeUserDoc = async (user) => {
    if (!user) return
    
    const userRef = doc(db, 'users', user.uid)
    const userSnap = await getDoc(userRef)
    
    if (!userSnap.exists()) {
      // Create initial user document
      await setDoc(userRef, {
        uid: user.uid,
        displayName: user.displayName || '',
        email: user.email || '',
        photoURL: user.photoURL || '',
        username: user.email?.split('@')[0] || '',
        bio: '',
        createdAt: new Date(),
        settings: {
          theme: 'dark',
          accent: '#8b5cf6',
          fontSize: 1,
          notifyMessages: true,
          readReceipts: true,
          typingIndicator: true,
          lastSeen: 'everyone',
          profilePhoto: 'everyone'
        },
        friends: [],
        blockedUsers: [],
        pinnedChats: [],
        mutedChats: []
      })
    }
  }

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      try {
        setUser(user)
        setAuthError(null)
        
        if (user) {
          await initializeUserDoc(user)
          // Mark user online
          setOnlineStatus(user.uid, true)
          touchLastSeen(user.uid)
        }
      } catch (error) {
        console.error('Auth state change error:', error)
        setAuthError(error.message)
        showToast('Authentication error', 'error')
      } finally {
        setLoading(false)
      }
    })
    
    return unsubscribe
  }, [showToast])

  // Enhanced user document subscription
  useEffect(() => {
    if (!user?.uid) {
      setUserDoc(null)
      return
    }
    
    const userRef = doc(db, 'users', user.uid)
    const unsub = onSnapshot(userRef, 
      (snap) => {
        if (!snap.exists()) {
          setUserDoc(null)
          return
        }
        const d = snap.data()
        setUserDoc(d)
        
        // Apply appearance settings globally
        if (d.settings) {
          const { accent, fontSize } = d.settings
          
          if (accent) {
            document.documentElement.style.setProperty('--accent-color', accent)
            localStorage.setItem('accent', accent)
          }
          
          if (typeof fontSize !== 'undefined') {
            document.documentElement.style.setProperty('--chat-font-scale', fontSize)
            localStorage.setItem('fontSize', String(fontSize))
          }
        }
      }, 
      (err) => {
        console.warn('User doc snapshot error:', err)
        showToast('Failed to load user data', 'warning')
      }
    )
    
    return unsub
  }, [user, showToast])

  // Manage presence on tab visibility and unload
  useEffect(() => {
    if (!user?.uid) return

    const handleBeforeUnload = () => {
      setOnlineStatus(user.uid, false)
      touchLastSeen(user.uid)
    }
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        setOnlineStatus(user.uid, true)
        touchLastSeen(user.uid)
      } else {
        setOnlineStatus(user.uid, false)
        touchLastSeen(user.uid)
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    document.addEventListener('visibilitychange', handleVisibility)

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
      document.removeEventListener('visibilitychange', handleVisibility)
      // Best effort set offline on cleanup
      setOnlineStatus(user.uid, false)
      touchLastSeen(user.uid)
    }
  }, [user])

  const value = {
    user,
    userDoc,
    loading,
    authError,
    logout,
    signInWithGoogle,
    setAuthError
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export default AuthContext