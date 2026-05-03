// Firebase client setup with enhanced configuration
import { initializeApp } from 'firebase/app'
import { getAuth, GoogleAuthProvider, connectAuthEmulator } from 'firebase/auth'
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore'
import { getStorage, connectStorageEmulator } from 'firebase/storage'
import { getAnalytics, isSupported } from 'firebase/analytics'

const firebaseConfig = {
  apiKey: "AIzaSyDxdRe5mR4KBWVIVlvyLvrH-bW07uGd3XY",
  authDomain: "chat-application-88be5.firebaseapp.com",
  projectId: "chat-application-88be5",
  // Correct bucket domain uses appspot.com, previous value caused CORS failures
  storageBucket: "chat-application-88be5.appspot.com",
  messagingSenderId: "197026942040",
  appId: "1:197026942040:web:ee2b42d1d54c6946c78e2d",
  measurementId: "G-V570FG3F7C"
}

// Initialize Firebase
const app = initializeApp(firebaseConfig)

// Initialize services with enhanced configuration
export const auth = getAuth(app)
export const db = getFirestore(app)
export const storage = getStorage(app)
export const googleProvider = new GoogleAuthProvider()

// Enhanced Google Auth configuration
googleProvider.setCustomParameters({
  prompt: 'select_account'
})
googleProvider.addScope('https://www.googleapis.com/auth/userinfo.email')
googleProvider.addScope('https://www.googleapis.com/auth/userinfo.profile')

// Analytics with error handling
export let analytics = null
isSupported().then(supported => {
  if (supported) {
    analytics = getAnalytics(app)
  }
})

// Emulator support for development (disabled - uncomment to use local emulators)
// if (process.env.NODE_ENV === 'development') {
//   try {
//     connectAuthEmulator(auth, 'http://localhost:9099')
//     connectFirestoreEmulator(db, 'localhost', 8080)
//     connectStorageEmulator(storage, 'localhost', 9199)
//     console.log('🔥 Firebase emulators connected')
//   } catch (error) {
//     console.log('Firebase emulators not available')
//   }
// }

// Enhanced error handling for Firebase services
export const initializeFirebaseServices = () => {
  return {
    auth,
    db,
    storage,
    analytics,
    isInitialized: true
  }
}

export default app