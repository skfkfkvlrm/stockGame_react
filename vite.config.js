import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const target = env.VITE_API_URL || 'http://localhost:8882';

  return {
    plugins: [react()],
    server: {
      proxy: {
        '/api/ollama': {
          target: 'http://localhost:11434/api',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/ollama/, '')
        },
        '/api': {
          target: target,
          changeOrigin: true,
        },
        '/ws': {
          target: target,
          ws: true,
          changeOrigin: true,
        }
      }
    },
    test: {
      globals: true,
      environment: 'jsdom'
    }
  }
})
