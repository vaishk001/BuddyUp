// Enhanced upload helper with Firebase Storage fallback
import { storage } from '../firebase'
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'

class UploadService {
  constructor() {
    // Cloudinary config (optional - falls back to Firebase)
    this.cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || 'YOUR_CLOUD_NAME'
    this.uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || 'YOUR_UPLOAD_PRESET'
    this.useFirebase = !import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || this.cloudName === 'YOUR_CLOUD_NAME'
  }

  async uploadToCloudinary(file, onProgress = null) {
    // Use Cloudinary if configured, otherwise fall back to Firebase
    if (!this.useFirebase) {
      return this.uploadToCloudinaryAPI(file, onProgress)
    }
    return this.uploadToFirebase(file, onProgress)
  }

  async uploadToCloudinaryAPI(file, onProgress = null) {
    try {
      // Validate file
      if (!file) {
        throw new Error('No file provided')
      }

      const maxSize = file.type.startsWith('video/') ? 100 * 1024 * 1024 : 10 * 1024 * 1024
      if (file.size > maxSize) {
        const limit = maxSize / (1024 * 1024)
        throw new Error(`File size must be less than ${limit}MB`)
      }

      // Create FormData for Cloudinary upload
      const formData = new FormData()
      formData.append('file', file)
      formData.append('upload_preset', this.uploadPreset)
      formData.append('cloud_name', this.cloudName)

      // Determine resource type
      const resourceType = file.type.startsWith('video/') ? 'video' : 'image'

      // Upload with progress tracking
      const xhr = new XMLHttpRequest()
      
      return new Promise((resolve, reject) => {
        xhr.upload.addEventListener('progress', (e) => {
          if (e.lengthComputable && onProgress) {
            const progress = (e.loaded / e.total) * 100
            onProgress(Math.round(progress))
          }
        })

        xhr.addEventListener('load', () => {
          if (xhr.status === 200) {
            const response = JSON.parse(xhr.responseText)
            resolve({
              success: true,
              url: response.secure_url,
              path: response.public_id,
              name: file.name,
              size: file.size,
              type: file.type
            })
          } else {
            reject({
              success: false,
              error: 'Upload failed',
              code: xhr.status
            })
          }
        })

        xhr.addEventListener('error', () => {
          reject({
            success: false,
            error: 'Network error occurred',
            code: 'network_error'
          })
        })

        xhr.open('POST', `https://api.cloudinary.com/v1_1/${this.cloudName}/${resourceType}/upload`)
        xhr.send(formData)
      })
    } catch (error) {
      console.error('Cloudinary upload error:', error)
      return {
        success: false,
        error: error.message || 'Upload failed'
      }
    }
  }

  async uploadToFirebase(file, onProgress = null) {
    try {
      // Validate file
      if (!file) {
        throw new Error('No file provided')
      }

      // Check file size (max 100MB for videos/documents, 10MB for images)
      const maxSize = file.type.startsWith('video/') || file.type.startsWith('application/') 
        ? 100 * 1024 * 1024 
        : 10 * 1024 * 1024
      if (file.size > maxSize) {
        const limit = maxSize / (1024 * 1024)
        throw new Error(`File size must be less than ${limit}MB`)
      }

      // Determine file path based on type
      let folder = 'images'
      if (file.type.startsWith('video/')) {
        folder = 'videos'
      } else if (file.type.startsWith('audio/')) {
        folder = 'audio'
      } else if (file.type.startsWith('application/') || file.name.match(/\.(pdf|doc|docx|txt|xls|xlsx|ppt|pptx)$/i)) {
        folder = 'documents'
      }

      // Create unique filename
      const timestamp = Date.now()
      const randomStr = Math.random().toString(36).substring(7)
      const extension = file.name.split('.').pop()
      const fileName = `${folder}/${timestamp}_${randomStr}.${extension}`

      // Create storage reference
      const storageRef = ref(storage, fileName)

      // Set metadata with proper content type
      const metadata = {
        contentType: file.type,
        customMetadata: {
          uploadedAt: new Date().toISOString()
        }
      }

      // Use simple uploadBytes for better CORS compatibility
      try {
        if (onProgress) onProgress(50)
        
        const snapshot = await uploadBytes(storageRef, file, metadata)
        
        if (onProgress) onProgress(100)
        
        const downloadURL = await getDownloadURL(snapshot.ref)
        
        return {
          success: true,
          url: downloadURL,
          path: fileName,
          name: file.name,
          size: file.size,
          type: file.type
        }
      } catch (error) {
        console.error('Firebase upload error:', error)
        let errorMessage = 'Upload failed'
        
        switch (error.code) {
          case 'storage/unauthorized':
            errorMessage = 'Unauthorized. Please check Firebase Storage rules.'
            break
          case 'storage/canceled':
            errorMessage = 'Upload canceled'
            break
          case 'storage/unknown':
            errorMessage = 'Unknown error occurred'
            break
          default:
            errorMessage = error.message || 'Upload failed'
        }
        
        throw {
          success: false,
          error: errorMessage,
          code: error.code
        }
      }
    } catch (error) {
      console.error('Upload error:', error)
      return {
        success: false,
        error: error.message || 'Upload failed'
      }
    }
  }

  // Generate optimized image URL (Firebase doesn't support transformations like Cloudinary)
  generateOptimizedUrl(url) {
    return url
  }

  // Generate thumbnail URL
  generateThumbnailUrl(url) {
    return url
  }
}

// Create singleton instance
export const uploadService = new UploadService()

// Legacy export for backward compatibility
export async function uploadToCloudinary(file, onProgress = null) {
  return uploadService.uploadToCloudinary(file, onProgress)
}

// Default export for compatibility
export default uploadService
