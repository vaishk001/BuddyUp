require('dotenv').config()
const express = require('express')
const cors = require('cors')
const multer = require('multer')
const axios = require('axios')
const FormData = require('form-data')

const app = express()
app.use(cors())

const upload = multer({ storage: multer.memoryStorage() })

app.post('/api/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file' })
    // Server-side signed upload to Cloudinary using unsigned upload preset is shown here as example
    // For production, generate signed signature server-side with cloudinary SDK.
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME
    const uploadPreset = process.env.CLOUDINARY_UPLOAD_PRESET
    if (!cloudName || !uploadPreset) return res.status(500).json({ error: 'Cloudinary not configured' })

    const form = new FormData()
    form.append('file', req.file.buffer, { filename: req.file.originalname })
    form.append('upload_preset', uploadPreset)

    const resp = await axios.post(`https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`, form, {
      headers: form.getHeaders()
    })

    return res.json(resp.data)
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: err.message })
  }
})

const port = process.env.PORT || 4000
app.listen(port, () => console.log('Upload server running on', port))
