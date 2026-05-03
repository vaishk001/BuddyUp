import { db, storage } from '../firebase'
import { collection, doc, setDoc, getDoc, getDocs, onSnapshot, addDoc, query, where, orderBy, serverTimestamp, updateDoc, arrayUnion, arrayRemove, deleteDoc, writeBatch } from 'firebase/firestore'
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'

export function usersCollection() {
  return collection(db, 'users')
}

export function chatsCollection() {
  return collection(db, 'chats')
}

export function messagesCollection(chatId) {
  return collection(db, `chats/${chatId}/messages`)
}

export async function createChat(participants) {
  const chatRef = await addDoc(chatsCollection(), { participants, createdAt: serverTimestamp() })
  return chatRef.id
}

/**
 * Find an existing direct (1:1) chat between two users or create one.
 * Returns the chatId.
 */
export async function getOrCreateDirectChat(userA, userB) {
  if (!userA || !userB) throw new Error('missing user ids')
  // Query chats where participants contains userA, then filter for exact 2-person chat that includes userB
  const q = query(chatsCollection(), where('participants', 'array-contains', userA))
  const snap = await getDocs(q)
  for (const d of snap.docs) {
    const data = d.data()
    const parts = data.participants || []
    if (parts.length === 2 && parts.includes(userA) && parts.includes(userB)) {
      return d.id
    }
  }
  // Not found — create a new chat document
  const chatRef = await addDoc(chatsCollection(), { participants: [userA, userB], createdAt: serverTimestamp() })
  return chatRef.id
}

export function listenMessages(chatId, cb) {
  console.log('👂 Setting up message listener for chat:', chatId)
  const q = query(messagesCollection(chatId), orderBy('createdAt'))
  return onSnapshot(q, 
    snapshot => {
      const msgs = snapshot.docs.map(d => ({ id: d.id, ...d.data() }))
      console.log('📨 Received', msgs.length, 'messages for chat:', chatId)
      cb(msgs)
    },
    error => {
      console.error('❌ listenMessages error:', error)
      cb([]) // Return empty array on error to prevent crashes
    }
  )
}

export async function sendMessage(chatId, message) {
  console.log('📤 Sending message to chat:', chatId, message)
  const timestamp = serverTimestamp()
  
  // Handle voice message blob upload
  if (message.type === 'voice' && message.blob) {
    try {
      console.log('🎤 Processing voice message...')
      
      // Check blob size (limit to 900KB for Firestore base64 storage)
      const maxSize = 900 * 1024 // 900KB
      if (message.blob.size > maxSize) {
        throw new Error('Voice message too large. Please keep it under 30 seconds.')
      }
      
      // Convert blob to base64 data URL (temporary workaround for storage)
      const base64Audio = await new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onloadend = () => resolve(reader.result)
        reader.onerror = reject
        reader.readAsDataURL(message.blob)
      })
      
      console.log('✅ Voice message converted to base64')
      
      // Replace blob with base64 URL (works without Firebase Storage)
      message = {
        ...message,
        audioUrl: base64Audio,
        blob: undefined, // Remove blob before saving to Firestore
        fileName: `voice_${Date.now()}.webm`,
        storageType: 'base64' // Mark as base64 for future migration
      }
    } catch (error) {
      console.error('❌ Voice processing failed:', error)
      throw new Error(`Failed to process voice message: ${error.message}`)
    }
  }
  
  // Remove undefined fields (Firestore doesn't allow undefined values)
  const cleanMessage = Object.fromEntries(
    Object.entries({ ...message, createdAt: timestamp }).filter(([_, v]) => v !== undefined)
  )
  
  const messageRef = await addDoc(messagesCollection(chatId), cleanMessage)
  console.log('✅ Message sent with ID:', messageRef.id)
  
  // Update chat's lastMessage timestamp to trigger real-time updates
  try {
    const chatRef = doc(db, 'chats', chatId)
    await updateDoc(chatRef, { 
      lastMessage: timestamp,
      lastMessageText: message.text || message.type || 'Media',
      lastMessageFrom: message.from
    })
    console.log('✅ Chat lastMessage updated')
  } catch (e) {
    console.warn('⚠️ Failed to update chat lastMessage:', e)
  }
}

export async function editMessage(chatId, messageId, newText) {
  if (!chatId || !messageId || !newText) return
  const chatIdStr = String(chatId)
  const messageIdStr = String(messageId)
  const msgRef = doc(db, `chats/${chatIdStr}/messages`, messageIdStr)
  await updateDoc(msgRef, {
    text: newText,
    edited: true,
    editedAt: serverTimestamp()
  })
}

export async function deleteMessage(chatId, messageId) {
  if (!chatId || !messageId) return
  // Ensure IDs are strings
  const chatIdStr = String(chatId)
  const messageIdStr = String(messageId)
  await deleteDoc(doc(db, `chats/${chatIdStr}/messages`, messageIdStr))
}

export async function deleteMessageForMe(chatId, messageId, userId) {
  if (!chatId || !messageId || !userId) return
  const chatIdStr = String(chatId)
  const messageIdStr = String(messageId)
  const msgRef = doc(db, `chats/${chatIdStr}/messages`, messageIdStr)
  await updateDoc(msgRef, {
    deletedFor: arrayUnion(userId)
  })
}

export function listenChats(userId, cb) {
  if (!userId) return () => {}
  // Firestore composite index workaround: use simpler query without orderBy
  // Sort on client-side instead to avoid index requirement
  const q = query(chatsCollection(), where('participants', 'array-contains', userId))
  return onSnapshot(q, snapshot => {
    const chats = snapshot.docs.map(d => ({ id: d.id, ...d.data() }))
    // Sort by createdAt on client side
    chats.sort((a, b) => {
      const aTime = a.createdAt?.toMillis?.() || 0
      const bTime = b.createdAt?.toMillis?.() || 0
      return bTime - aTime // descending
    })
    cb(chats)
  }, error => {
    console.error('listenChats error:', error)
    cb([])
  })
}

// Listen to all users in real-time (useful for developer/testing UI).
export function listenUsers(cb) {
  try {
    const q = query(usersCollection(), orderBy('displayName'))
    return onSnapshot(q, snapshot => {
      const users = snapshot.docs.map(d => ({ id: d.id, ...d.data() }))
      cb(users)
    })
  } catch (e) {
    console.warn('listenUsers failed', e)
    return () => {}
  }
}

// Friend requests: stored under users/{uid}/friendRequests/{reqId}
export function listenFriendRequests(userId, cb) {
  if (!userId) return () => {}
  const col = collection(db, `users/${userId}/friendRequests`)
  const q = query(col, orderBy('createdAt', 'desc'))
  return onSnapshot(q, snapshot => {
    const reqs = snapshot.docs.map(d => ({ id: d.id, ...d.data() }))
    cb(reqs)
  })
}

export async function respondFriendRequest(userId, requestId, accept = true) {
  const ref = doc(db, `users/${userId}/friendRequests`, requestId)
  // set status field; consumer may create chat separately on accept
  const snap = await getDoc(ref)
  if (!snap.exists()) return
  const req = snap.data()
  await updateDoc(ref, { status: accept ? 'accepted' : 'declined', respondedAt: serverTimestamp() })
  if (accept && req && req.from) {
    // Create a chat between requester and the current user if one doesn't exist
    try {
      const chatRef = await addDoc(chatsCollection(), { 
        participants: [userId, req.from], 
        createdAt: serverTimestamp(),
        lastMessage: null,
        updatedAt: serverTimestamp()
      })
      // mark the request with chatId for reference
      await updateDoc(ref, { chatId: chatRef.id })
      
      // Add each other as friends (use setDoc with merge to create if not exists)
      const userRef = doc(db, 'users', userId)
      const fromRef = doc(db, 'users', req.from)
      
      await setDoc(userRef, { 
        friends: arrayUnion(req.from),
        updatedAt: serverTimestamp()
      }, { merge: true })
      
      await setDoc(fromRef, { 
        friends: arrayUnion(userId),
        updatedAt: serverTimestamp()
      }, { merge: true })
      
      console.log('✅ Friend request accepted, chat created:', chatRef.id)
      return chatRef.id
    } catch (e) {
      console.error('respondFriendRequest create chat failed', e)
      throw e
    }
  }
}

export async function sendFriendRequest(targetUserId, fromUser) {
  if (!targetUserId || !fromUser) throw new Error('missing args')
  const col = collection(db, `users/${targetUserId}/friendRequests`)
  await addDoc(col, {
    from: fromUser.uid,
    fromName: fromUser.displayName || fromUser.email || fromUser.uid,
    message: fromUser.message || '',
    status: 'pending',
    createdAt: serverTimestamp()
  })
}

export async function removeFriend(currentUserId, friendId) {
  if (!currentUserId || !friendId) throw new Error('missing args')
  try {
    // Remove from both users' friends arrays
    const currentUserRef = doc(db, 'users', currentUserId)
    const friendRef = doc(db, 'users', friendId)
    
    await updateDoc(currentUserRef, { 
      friends: arrayRemove(friendId) 
    })
    
    await updateDoc(friendRef, { 
      friends: arrayRemove(currentUserId) 
    })
    
    return true
  } catch (error) {
    console.error('removeFriend failed:', error)
    throw error
  }
}

export async function deleteChat(chatId, userId) {
  if (!chatId || !userId) throw new Error('missing args')
  try {
    const chatRef = doc(db, 'chats', chatId)
    const chatSnap = await getDoc(chatRef)
    
    if (!chatSnap.exists()) {
      throw new Error('Chat not found')
    }
    
    // Delete all messages in the chat
    const messagesRef = collection(db, `chats/${chatId}/messages`)
    const messagesSnap = await getDocs(messagesRef)
    
    const batch = writeBatch(db)
    messagesSnap.docs.forEach(doc => {
      batch.delete(doc.ref)
    })
    
    // Delete the chat document
    batch.delete(chatRef)
    
    await batch.commit()
    return true
  } catch (error) {
    console.error('deleteChat failed:', error)
    throw error
  }
}

export async function archiveChat(chatId, userId) {
  if (!chatId || !userId) throw new Error('missing args')
  try {
    const chatRef = doc(db, 'chats', chatId)
    const chatSnap = await getDoc(chatRef)
    
    if (!chatSnap.exists()) {
      throw new Error('Chat not found')
    }
    
    const chatData = chatSnap.data()
    const archivedBy = chatData.archivedBy || []
    
    // Toggle archive status for this user
    if (archivedBy.includes(userId)) {
      await updateDoc(chatRef, {
        archivedBy: arrayRemove(userId)
      })
      return false // unarchived
    } else {
      await updateDoc(chatRef, {
        archivedBy: arrayUnion(userId)
      })
      return true // archived
    }
  } catch (error) {
    console.error('archiveChat failed:', error)
    throw error
  }
}

// ============ Story Functions ============

export function storiesCollection() {
  return collection(db, 'stories')
}

export async function createStory(userId, mediaUrl, mediaType = 'image') {
  if (!userId || !mediaUrl) throw new Error('missing args')
  
  const storyData = {
    userId,
    mediaUrl,
    mediaType,
    createdAt: serverTimestamp(),
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
    views: [],
    likes: []
  }
  
  const storyRef = await addDoc(storiesCollection(), storyData)
  return storyRef.id
}

export function listenStories(userId, cb) {
  if (!userId) return () => {}
  
  const q = query(
    storiesCollection(),
    where('userId', '==', userId)
  )
  
  return onSnapshot(q, 
    snapshot => {
      const now = Date.now()
      const twentyFourHoursAgo = now - 24 * 60 * 60 * 1000
      
      // Filter and sort stories from last 24 hours on client side
      const stories = snapshot.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .filter(story => {
          const createdAt = story.createdAt?.toMillis?.() || 0
          return createdAt > twentyFourHoursAgo
        })
        .sort((a, b) => {
          const aTime = a.createdAt?.toMillis?.() || 0
          const bTime = b.createdAt?.toMillis?.() || 0
          return bTime - aTime
        })
      
      cb(stories)
    },
    error => {
      console.error('listenStories error:', error)
      cb([])
    }
  )
}

export function listenAllStories(cb) {
  const q = query(
    storiesCollection(),
    orderBy('createdAt', 'desc')
  )
  
  return onSnapshot(q,
    snapshot => {
      const now = Date.now()
      const twentyFourHoursAgo = now - 24 * 60 * 60 * 1000
      
      // Filter stories from last 24 hours on client side
      const stories = snapshot.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .filter(story => {
          const createdAt = story.createdAt?.toMillis?.() || 0
          return createdAt > twentyFourHoursAgo
        })
      
      cb(stories)
    },
    error => {
      console.error('listenAllStories error:', error)
      cb([])
    }
  )
}

export async function viewStory(storyId, userId) {
  if (!storyId || !userId) return
  
  try {
    const storyRef = doc(db, 'stories', storyId)
    await updateDoc(storyRef, {
      views: arrayUnion(userId)
    })
  } catch (error) {
    console.error('viewStory failed:', error)
  }
}

export async function likeStory(storyId, userId) {
  if (!storyId || !userId) return
  
  try {
    const storyRef = doc(db, 'stories', storyId)
    const storySnap = await getDoc(storyRef)
    
    if (storySnap.exists()) {
      const likes = storySnap.data().likes || []
      
      if (likes.includes(userId)) {
        // Unlike
        await updateDoc(storyRef, {
          likes: arrayRemove(userId)
        })
        return false
      } else {
        // Like
        await updateDoc(storyRef, {
          likes: arrayUnion(userId)
        })
        return true
      }
    }
  } catch (error) {
    console.error('likeStory failed:', error)
  }
}

export async function deleteStory(storyId, userId) {
  if (!storyId || !userId) throw new Error('missing args')
  
  try {
    const storyRef = doc(db, 'stories', storyId)
    const storySnap = await getDoc(storyRef)
    
    if (storySnap.exists() && storySnap.data().userId === userId) {
      await deleteDoc(storyRef)
      return true
    }
    
    throw new Error('Not authorized to delete this story')
  } catch (error) {
    console.error('deleteStory failed:', error)
    throw error
  }
}

export async function findUserByEmail(email) {
  if (!email) return null
  const term = email.trim()
  const q = query(usersCollection(), where('email', '==', term))
  let snap = await getDocs(q)
  if (!snap.empty) {
    const d = snap.docs[0]
    return { id: d.id, ...d.data() }
  }
  // Fallback: Firestore equality is case-sensitive. Try a client-side case-insensitive match
  try {
    const all = await getDocs(usersCollection())
    const lower = term.toLowerCase()
    const found = all.docs.find(d => (d.data().email || '').toLowerCase() === lower)
    if (found) return { id: found.id, ...found.data() }
  } catch (e) {
    console.warn('findUserByEmail fallback failed', e)
  }
  return null
}

/**
 * Find users whose displayName starts with the given prefix (case-insensitive).
 * Uses a prefix-range query with a Unicode high value to emulate startsWith.
 */
export async function findUsersByName(prefix) {
  if (!prefix) return []
  const p = prefix.trim()
  const start = p
  const end = p + '\uf8ff'
  const q = query(usersCollection(), where('displayName', '>=', start), where('displayName', '<=', end))
  const snap = await getDocs(q)
  let results = snap.docs.map(d => ({ id: d.id, ...d.data() }))
  // If nothing found, fall back to a case-insensitive client-side filter (useful for dev/local datasets)
  if (results.length === 0) {
    try {
      const all = await getDocs(usersCollection())
      const lower = p.toLowerCase()
      results = all.docs.map(d => ({ id: d.id, ...d.data() })).filter(u => (u.displayName || '').toLowerCase().startsWith(lower))
    } catch (e) {
      console.warn('fallback findUsersByName failed', e)
    }
  }
  return results
}

export async function updateMessage(chatId, messageId, data) {
  const ref = doc(db, `chats/${chatId}/messages`, messageId)
  await updateDoc(ref, data)
}

/**
 * Mark messages as delivered when user opens chat
 */
export async function markMessagesAsDelivered(chatId, userId) {
  if (!chatId || !userId) return
  try {
    const q = query(messagesCollection(chatId))
    const snap = await getDocs(q)
    const batch = writeBatch(db)
    let count = 0
    snap.docs.forEach(d => {
      const data = d.data()
      // Only update if from someone else and currently 'sent'
      if (data.from !== userId && data.status === 'sent') {
        batch.update(d.ref, { status: 'delivered' })
        count++
      }
    })
    if (count > 0) {
      await batch.commit()
      console.log(`✅ Marked ${count} messages as delivered`)
    }
  } catch (e) {
    console.warn('markMessagesAsDelivered failed:', e)
  }
}

/**
 * Mark messages as read when user views them
 */
export async function markMessagesAsRead(chatId, userId) {
  if (!chatId || !userId) return
  try {
    const q = query(messagesCollection(chatId))
    const snap = await getDocs(q)
    const batch = writeBatch(db)
    let count = 0
    snap.docs.forEach(d => {
      const data = d.data()
      // Only update if from someone else and not already read
      if (data.from !== userId && (data.status === 'sent' || data.status === 'delivered')) {
        batch.update(d.ref, { status: 'read', readAt: serverTimestamp() })
        count++
      }
    })
    if (count > 0) {
      await batch.commit()
      console.log(`✅ Marked ${count} messages as read`)
    }
  } catch (e) {
    console.warn('markMessagesAsRead failed:', e)
  }
}

export async function getChat(chatId) {
  const ref = doc(db, 'chats', chatId)
  const snap = await getDoc(ref)
  return snap.exists() ? { id: snap.id, ...snap.data() } : null
}

export async function togglePinnedChat(chatId, userId) {
  const userRef = doc(db, 'users', userId)
  const snap = await getDoc(userRef)
  if (!snap.exists()) {
    // create user doc with pinnedChats
    await setDoc(userRef, { pinnedChats: [chatId] }, { merge: true })
    return true
  }
  const data = snap.data()
  const pinned = data.pinnedChats || []
  if (pinned.includes(chatId)) {
    await updateDoc(userRef, { pinnedChats: arrayRemove(chatId) })
    return false
  } else {
    await updateDoc(userRef, { pinnedChats: arrayUnion(chatId) })
    return true
  }
}

export async function toggleMutedChat(chatId, userId) {
  const userRef = doc(db, 'users', userId)
  const snap = await getDoc(userRef)
  if (!snap.exists()) {
    await setDoc(userRef, { mutedChats: [chatId] }, { merge: true })
    return true
  }
  const data = snap.data()
  const muted = data.mutedChats || []
  if (muted.includes(chatId)) {
    await updateDoc(userRef, { mutedChats: arrayRemove(chatId) })
    return false
  } else {
    await updateDoc(userRef, { mutedChats: arrayUnion(chatId) })
    return true
  }
}

export async function getGroupMembers(chatId) {
  const chat = await getChat(chatId)
  if (!chat || !chat.participants) return []
  const members = []
  for (const pid of chat.participants) {
    const pSnap = await getDoc(doc(db, 'users', pid))
    if (pSnap.exists()) members.push({ id: pSnap.id, ...pSnap.data() })
    else members.push({ id: pid, displayName: pid })
  }
  return members
}

export async function clearChatMessages(chatId) {
  const q = query(messagesCollection(chatId))
  const snap = await getDocs(q)
  const deletes = snap.docs.map(d => deleteDoc(doc(db, `chats/${chatId}/messages`, d.id)))
  await Promise.all(deletes)
}

/**
 * Normalize messages in a chat to ensure media are stored under { type, url } and
 * to migrate legacy payloads where `text` contained an object like { url, type }.
 * This is a client-side migration helper and should be run by a logged-in user
 * with appropriate Firestore permissions. It uses batched writes (commits every 300 updates)
 * to avoid exceeding batch limits.
 */
export async function normalizeChatMessages(chatId) {
  if (!chatId) return 0
  const q = query(messagesCollection(chatId))
  const snap = await getDocs(q)
  let batch = writeBatch(db)
  let updated = 0
  try {
    for (const d of snap.docs) {
      const data = d.data()
      const updates = {}
      // Legacy: text is an object that includes url/type
      if (data.text && typeof data.text === 'object') {
        if (data.text.url) {
          updates.type = data.text.type || (data.text.url.match(/\.gif$/i) ? 'gif' : 'image')
          updates.url = data.text.url
          updates.text = ''
        }
      }
      // If message has url/mediaUrl at root but no type, normalize
      if (!data.type && (data.url || data.mediaUrl)) {
        const candidate = data.url || data.mediaUrl
        updates.type = candidate.match(/\.gif$/i) ? 'gif' : candidate.match(/\.(mp4|webm|ogg)$/i) ? 'video' : 'image'
        updates.url = candidate
      }
      if (Object.keys(updates).length) {
        const ref = doc(db, `chats/${chatId}/messages`, d.id)
        batch.update(ref, { ...updates, normalizedAt: serverTimestamp() })
        updated++
        // commit every 300 to avoid limits
        if (updated % 300 === 0) {
          await batch.commit()
          batch = writeBatch(db)
        }
      }
    }
    // commit any remaining
    await batch.commit()
  } catch (e) {
    console.error('normalizeChatMessages failed', e)
    // attempt to commit whatever we have
    try { await batch.commit() } catch (_) {}
  }
  return updated
}

/** Normalize all chats where the user participates (runs normalizeChatMessages for each chat) */
export async function normalizeAllChatsForUser(userId) {
  if (!userId) return 0
  const q = query(chatsCollection(), where('participants', 'array-contains', userId))
  const snap = await getDocs(q)
  let total = 0
  for (const d of snap.docs) {
    const count = await normalizeChatMessages(d.id)
    total += count
  }
  return total
}

export async function getUser(userId) {
  if (!userId) return null
  const snap = await getDoc(doc(db, 'users', userId))
  return snap.exists() ? { id: snap.id, ...snap.data() } : null
}

/**
 * Toggle a reaction for a user on a message. Reactions are stored as a map of emoji -> array of userIds.
 * If the user already reacted with the same emoji, they'll be removed (toggle off). Otherwise added.
 */
export async function toggleReaction(chatId, messageId, emoji, userId) {
  // Ensure IDs are strings
  const chatIdStr = String(chatId)
  const messageIdStr = String(messageId)
  const msgRef = doc(db, `chats/${chatIdStr}/messages`, messageIdStr)
  // Attempt to add the userId to reactions.<emoji> array. We can't atomically check-then-toggle
  // without a transaction here, so simplest approach: try to add via arrayUnion.
  // To support toggle (remove if already present) we try to update by reading current doc first.
  const snap = await getDoc(msgRef)
  if (!snap.exists()) return
  const data = snap.data()
  const reactions = data.reactions || {}
  const usersForEmoji = reactions[emoji] || []
  if (usersForEmoji.includes(userId)) {
    // remove
    await updateDoc(msgRef, { [`reactions.${emoji}`]: arrayRemove(userId) })
  } else {
    // add
    await updateDoc(msgRef, { [`reactions.${emoji}`]: arrayUnion(userId) })
  }
}

/**
 * Toggle starred status for a message for a specific user
 * @param {string} chatId - The chat ID
 * @param {string} messageId - The message ID
 * @param {string} userId - The user ID who is starring/unstarring
 */
export async function toggleStarMessage(chatId, messageId, userId) {
  const chatIdStr = String(chatId)
  const messageIdStr = String(messageId)
  const msgRef = doc(db, `chats/${chatIdStr}/messages`, messageIdStr)
  const snap = await getDoc(msgRef)
  if (!snap.exists()) return false
  const data = snap.data()
  const starred = data.starred || []
  if (starred.includes(userId)) {
    // unstar
    await updateDoc(msgRef, { starred: arrayRemove(userId) })
    return false
  } else {
    // star
    await updateDoc(msgRef, { starred: arrayUnion(userId) })
    return true
  }
}

/**
 * Update user settings (bio, privacy, etc.)
 * @param {string} userId - The user ID
 * @param {object} settings - The settings to update
 */
export async function updateUserSettings(userId, settings) {
  if (!userId) return
  const userRef = doc(db, 'users', userId)
  await setDoc(userRef, settings, { merge: true })
}

/**
 * Set typing indicator for a user in a chat
 * @param {string} chatId - The chat ID
 * @param {string} userId - The user ID who is typing
 * @param {boolean} isTyping - Whether the user is typing or not
 */
export async function setTypingIndicator(chatId, userId, isTyping) {
  if (!chatId || !userId) return
  const chatRef = doc(db, 'chats', String(chatId))
  
  try {
    if (isTyping) {
      await updateDoc(chatRef, {
        [`typing.${userId}`]: serverTimestamp()
      })
    } else {
      await updateDoc(chatRef, {
        [`typing.${userId}`]: null
      })
    }
  } catch (e) {
    console.error('Failed to set typing indicator:', e)
  }
}

/**
 * Listen to typing indicators in a chat
 * @param {string} chatId - The chat ID to listen to
 * @param {Function} callback - Callback function that receives typing users map
 * @returns {Function} Unsubscribe function
 */
export function listenTypingIndicators(chatId, callback) {
  if (!chatId) return () => {}
  
  const chatRef = doc(db, 'chats', String(chatId))
  return onSnapshot(chatRef, (snapshot) => {
    if (!snapshot.exists()) {
      callback({})
      return
    }
    
    const data = snapshot.data()
    const typing = data.typing || {}
    
    // Filter out stale typing indicators (older than 5 seconds)
    const now = Date.now()
    const activeTyping = {}
    
    Object.entries(typing).forEach(([userId, timestamp]) => {
      if (timestamp && timestamp.toMillis) {
        const diff = now - timestamp.toMillis()
        if (diff < 5000) { // 5 seconds timeout
          activeTyping[userId] = true
        }
      }
    })
    
    callback(activeTyping)
  })
}

// -----------------------------
// Presence & User Status
// -----------------------------

/**
 * Update user's online status and optionally lastSeen
 */
export async function setOnlineStatus(userId, online) {
  if (!userId) return
  try {
    await updateDoc(doc(db, 'users', String(userId)), {
      online: !!online,
      lastSeen: serverTimestamp()
    })
  } catch (e) {
    // If user doc may not exist yet, create minimal doc
    try {
      await setDoc(doc(db, 'users', String(userId)), {
        uid: userId,
        online: !!online,
        lastSeen: serverTimestamp()
      }, { merge: true })
    } catch (err) {
      console.error('setOnlineStatus failed', err)
    }
  }
}

/**
 * Update user's lastSeen timestamp only
 */
export async function touchLastSeen(userId) {
  if (!userId) return
  try {
    await updateDoc(doc(db, 'users', String(userId)), { lastSeen: serverTimestamp() })
  } catch (e) {
    console.warn('touchLastSeen failed', e)
  }
}

/**
 * Set arbitrary status flags under users/<uid>.status.*
 * Example: { recording: true, onCall: false, liveLocationEnabled: true }
 */
export async function setUserStatusFlags(userId, flags = {}) {
  if (!userId || !flags || typeof flags !== 'object') return
  const updates = {}
  Object.entries(flags).forEach(([k, v]) => {
    updates[`status.${k}`] = v
  })
  try {
    await updateDoc(doc(db, 'users', String(userId)), updates)
  } catch (e) {
    try {
      await setDoc(doc(db, 'users', String(userId)), updates, { merge: true })
    } catch (err) {
      console.error('setUserStatusFlags failed', err)
    }
  }
}

/**
 * Listen to a user's presence/status changes
 */
export function listenUserPresence(userId, cb) {
  if (!userId) return () => {}
  const ref = doc(db, 'users', String(userId))
  return onSnapshot(ref, (snap) => {
    if (!snap.exists()) {
      cb(null)
      return
    }
    cb(snap.data())
  })
}

// Canvas (Draw Together) Functions
export function listenCanvasStrokes(chatId, cb) {
  const q = query(collection(db, `chats/${chatId}/canvas`), orderBy('timestamp', 'asc'))
  return onSnapshot(q, snapshot => {
    const strokes = snapshot.docs.map(d => ({ id: d.id, ...d.data() }))
    cb(strokes)
  })
}

export async function addCanvasStroke(chatId, strokeData) {
  await addDoc(collection(db, `chats/${chatId}/canvas`), {
    ...strokeData,
    timestamp: serverTimestamp()
  })
}

export async function clearCanvas(chatId) {
  const snap = await getDocs(collection(db, `chats/${chatId}/canvas`))
  const batch = writeBatch(db)
  snap.docs.forEach(d => batch.delete(d.ref))
  await batch.commit()
}

