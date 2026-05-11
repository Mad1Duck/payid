import { defineConfig } from 'vite'
import { devtools } from '@tanstack/devtools-vite'
import viteReact from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { fileURLToPath, URL } from 'node:url'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [devtools(), viteReact(), tailwindcss()],

  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
    dedupe: ['react', 'react-dom', 'wagmi', 'viem', '@wagmi/core'],
  },

  define: {
    'process.env': '{}',
  },

  optimizeDeps: {
    include: ['payid-react'],
    exclude: ['payid-rule-engine'],
  },

  // Node.js built-ins referenced in sdk-core's server-mode code path.
  // Never called in browser mode — marking them external keeps them out
  // of the browser bundle.
  build: {
    rollupOptions: {
      external: ['http', 'https', 'zlib', 'fs', 'path', 'url', 'crypto'],
    },
  },

  assetsInclude: ['**/*.wasm'],
})
