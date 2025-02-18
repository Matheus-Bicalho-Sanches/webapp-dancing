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
      '^/api/asaas/.*': {
        target: 'https://sandbox.asaas.com/api/v3',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/api\/asaas/, ''),
        configure: (proxy, _options) => {
          proxy.on('error', (err, _req, _res) => {
            console.error('Proxy error:', err);
          });
          proxy.on('proxyReq', (proxyReq, req, _res) => {
            proxyReq.setHeader('access_token', process.env.VITE_ASAAS_API_KEY || '$aact_MzkwODA2MWY2OGM3MWRlMDU2NWM3MzJlNzZmNGZhZGY6OjBjNGYwMjI2LWVlZjAtNDQyMi04NzI3LWY4NGZkMWIyYzZmYjo6JGFhY2hfMjQ0MTQ3OGItYmRjOS00ODZmLTk1OWYtMWIxNDgyYTllYmE1');
            console.log('Sending Request to Asaas:', {
              method: req.method,
              url: req.url,
              headers: proxyReq.getHeaders()
            });
          });
          proxy.on('proxyRes', (proxyRes, req, _res) => {
            console.log('Received Response from Asaas:', {
              statusCode: proxyRes.statusCode,
              url: req.url,
              headers: proxyRes.headers
            });
            
            if (proxyRes.statusCode >= 400) {
              let body = '';
              proxyRes.on('data', chunk => {
                body += chunk;
              });
              proxyRes.on('end', () => {
                try {
                  const data = JSON.parse(body);
                  console.error('Asaas API Error:', {
                    status: proxyRes.statusCode,
                    url: req.url,
                    error: data
                  });
                } catch (e) {
                  console.error('Failed to parse error response:', body);
                }
              });
            }
          });
        }
      },
      '/api': {
        target: 'http://localhost:3001',
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
      VITE_ASAAS_API_KEY: JSON.stringify("$aact_MzkwODA2MWY2OGM3MWRlMDU2NWM3MzJlNzZmNGZhZGY6OjBjNGYwMjI2LWVlZjAtNDQyMi04NzI3LWY4NGZkMWIyYzZmYjo6JGFhY2hfMjQ0MTQ3OGItYmRjOS00ODZmLTk1OWYtMWIxNDgyYTllYmE1"),
      MODE: JSON.stringify(process.env.NODE_ENV || 'development')
    }
  }
})
