import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'fs'
import path from 'path'

// Vite dev server with HTTPS using local certs.
// To avoid browser security warnings, create locally-trusted certs (mkcert recommended)
// and place them at ./certs/localhost.pem and ./certs/localhost-key.pem

const certPath = path.resolve(__dirname, 'certs', 'localhost.pem')
const keyPath = path.resolve(__dirname, 'certs', 'localhost-key.pem')

let httpsConfig = false
try {
  if (fs.existsSync(certPath) && fs.existsSync(keyPath)) {
    httpsConfig = {
      cert: fs.readFileSync(certPath),
      key: fs.readFileSync(keyPath),
    }
    console.log('Using HTTPS certs from', certPath)
  }
} catch (e) {
  // ignore and fall back to http
}

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 5173,
    https: httpsConfig || false,
    proxy: {
      '/api': 'http://localhost:4000'
    }
  },
})
