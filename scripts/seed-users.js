import { initializeApp } from 'firebase/app'
import { getFirestore, doc, setDoc } from 'firebase/firestore'

// Reuse the same firebase config used by the app. If you have a .env override, edit this file.
const firebaseConfig = {
 apiKey: "AIzaSyBUh30oW9dxtesg3pnz7UM9y1Vz0-Tw1AA",
  authDomain: "chat-application-75738.firebaseapp.com",
  projectId: "chat-application-75738",
  storageBucket: "chat-application-75738.firebasestorage.app",
  messagingSenderId: "876684529187",
  appId: "1:876684529187:web:85e25dc7932ef942e06b96",
  measurementId: "G-V3PDNS26GG"
}

const app = initializeApp(firebaseConfig)
const db = getFirestore(app)

async function seed() {
  const users = [
    { id: 'alice', displayName: 'Alice Johnson', email: 'alice@example.com', bio: 'Hi, I\'m Alice' },
    { id: 'bob', displayName: 'Bob Carter', email: 'bob@example.com', bio: 'Hey, I\'m Bob' },
    { id: 'carol', displayName: 'Carol Smith', email: 'carol@example.com', bio: 'Hello from Carol' }
  ]

  for (const u of users) {
    const ref = doc(db, 'users', u.id)
    try {
      await setDoc(ref, {
        displayName: u.displayName,
        email: u.email,
        bio: u.bio,
        createdAt: new Date()
      }, { merge: true })
      console.log('Seeded user', u.id)
    } catch (e) {
      console.error('Failed to seed', u.id, e)
    }
  }

  console.log('Seeding complete')
}

seed().catch(e => {
  console.error('Seeding failed', e)
  process.exit(1)
})
