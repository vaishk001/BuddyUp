# Firebase Storage Setup Guide

## Quick Setup

The upload functionality now uses **Firebase Storage** instead of Cloudinary (which requires paid setup).

### Deploy Storage Rules

Run this command to deploy the storage security rules:

```bash
firebase deploy --only storage
```

### Verify Setup

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: `chat-application-88be5`
3. Click on **Storage** in the left menu
4. Click **Get Started** if you haven't enabled Storage yet
5. Choose your storage location (use same as Firestore: `nam5`)
6. Click **Done**

### Test Upload

1. Start your dev server: `npm run dev`
2. Open the chat application
3. Click the paperclip icon (📎)
4. Try uploading an image, video, or document
5. Upload progress will show in real-time

### Features Working

✅ Photo & Video Upload (max 10MB for images, 100MB for videos)
✅ Camera Capture (mobile only)
✅ Document Upload (PDF, DOC, DOCX, etc.)
✅ Audio Upload (MP3, WAV, OGG)
✅ Location Sharing (uses browser geolocation)
✅ Gift Sending
✅ Code Snippet Sharing

### File Size Limits

- Images: 10MB
- Videos: 100MB
- Audio: 50MB
- Documents: 100MB

### Troubleshooting

**If uploads fail:**

1. Make sure Firebase Storage is enabled in console
2. Deploy storage rules: `firebase deploy --only storage`
3. Check browser console for errors
4. Verify you're signed in to the app

**Storage rules are in:** `storage.rules`
