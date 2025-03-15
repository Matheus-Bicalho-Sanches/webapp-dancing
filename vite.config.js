import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'
import fs from 'fs'

// Plugin para copiar o arquivo _redirects para a pasta dist durante o build
const copyRedirectsPlugin = () => {
  return {
    name: 'copy-redirects',
    closeBundle: () => {
      const publicDir = resolve(__dirname, 'public')
      const distDir = resolve(__dirname, 'dist')
      
      // Verifica se o arquivo _redirects existe na pasta public
      const redirectsPath = resolve(publicDir, '_redirects')
      if (fs.existsSync(redirectsPath)) {
        // Copia o arquivo para a pasta dist
        fs.copyFileSync(redirectsPath, resolve(distDir, '_redirects'))
        console.log('✅ Arquivo _redirects copiado para a pasta dist')
      }
    }
  }
}

export default defineConfig({
  plugins: [
    react(),
    copyRedirectsPlugin()
  ],
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
      // Proxy para ZapSign API de produção
      '/zapsign-api/prod': {
        target: 'https://api.zapsign.com.br',
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path.replace(/^\/zapsign-api\/prod/, '/api/v1'),
        configure: (proxy, _options) => {
          proxy.on('error', (err, _req, _res) => {
            console.error('ZapSign Proxy error:', err);
          });
          proxy.on('proxyReq', (proxyReq, req, _res) => {
            console.log('Sending Request to ZapSign API:', req.method, req.url);
          });
          proxy.on('proxyRes', (proxyRes, req, _res) => {
            console.log('Received Response from ZapSign API:', proxyRes.statusCode, req.url);
          });
        }
      },
      // Proxy para ZapSign API de sandbox (caso volte a funcionar)
      '/zapsign-api/sandbox': {
        target: 'https://sandbox.zapsign.com.br',
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path.replace(/^\/zapsign-api\/sandbox/, '/api/v1'),
        configure: (proxy, _options) => {
          proxy.on('error', (err, _req, _res) => {
            console.error('ZapSign Sandbox Proxy error:', err);
          });
        }
      },
      '/api/asaas': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        secure: false,
        configure: (proxy, _options) => {
          proxy.on('error', (err, _req, _res) => {
            console.error('Proxy error:', err);
          });
          proxy.on('proxyReq', (proxyReq, req, _res) => {
            console.log('Sending Request to API Server:', req.method, req.url);
          });
          proxy.on('proxyRes', (proxyRes, req, _res) => {
            console.log('Received Response from API Server:', proxyRes.statusCode, req.url);
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
