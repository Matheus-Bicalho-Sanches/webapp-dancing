import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    commonjsOptions: {
      esmExternals: true,
      transformMixedEsModules: true
    },
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['axios', 'react', 'react-dom', 'react-router-dom']
        }
      }
    }
  },
  optimizeDeps: {
    include: ['axios'],
    esbuildOptions: {
      target: 'es2020'
    }
  },
  server: {
    port: 3000,
    host: true,
    strictPort: true,
    proxy: {
      '/api': {
        target: 'http://localhost:5173',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/api/, ''),
        configure: (proxy, _options) => {
          proxy.on('error', (err, _req, _res) => {
            console.error('Proxy error:', err);
          });
          proxy.on('proxyReq', (proxyReq, req, _res) => {
            console.log('Sending Request:', req.method, req.url);
          });
          proxy.on('proxyRes', (proxyRes, req, _res) => {
            console.log('Received Response:', proxyRes.statusCode, req.url);
          });
        }
      }
    }
  },
  define: {
    'import.meta.env': {
      VITE_FIREBASE_API_KEY: JSON.stringify("AIzaSyDcBJ-IqpQRg-8lqOtZ4uBHAXHUEC-zt2Y"),
      VITE_FIREBASE_AUTH_DOMAIN: JSON.stringify("webapp-dancing.firebaseapp.com"),
      VITE_FIREBASE_PROJECT_ID: JSON.stringify("webapp-dancing"),
      VITE_FIREBASE_STORAGE_BUCKET: JSON.stringify("webapp-dancing.firebasestorage.app"),
      VITE_FIREBASE_MESSAGING_SENDER_ID: JSON.stringify("712270725563"),
      VITE_FIREBASE_APP_ID: JSON.stringify("1:712270725563:web:2156a6e2660b0b5218c49e"),
      VITE_STRIPE_PUBLIC_KEY: JSON.stringify("pk_live_51QZBm3DM4Y35vu3CrA4lnknsBMFZOtLawxxq3e3D5swdi9oOnsNrLG7X2zDKHrE5HOchvbp3xFfKk7YdkQxHqfj7001lvtgyxY"),
      MODE: JSON.stringify(process.env.NODE_ENV || 'development')
    }
  }
})
