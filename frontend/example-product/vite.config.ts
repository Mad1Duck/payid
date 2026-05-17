import { defineConfig } from 'vite';
import { devtools } from '@tanstack/devtools-vite';
import viteReact from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { fileURLToPath, URL } from 'node:url';
import { nodePolyfills } from 'vite-plugin-node-polyfills';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    devtools(),
    viteReact(),
    tailwindcss(),
    nodePolyfills({
      include: ['crypto', 'buffer', 'stream', 'util', 'path'],
      globals: { Buffer: true, process: true, global: true },
    }),
  ],

  resolve: {
    alias: [
      // Stub Node.js fs APIs — 0G Storage SDK imports them at load time
      // but only calls them in Node-only paths (ZgFile, appendFileSync).
      // We use MemData in the browser so these are never actually invoked.
      { find: 'node:fs/promises', replacement: fileURLToPath(new URL('./src/stubs/node-fs.stub.ts', import.meta.url)) },
      { find: 'node:fs', replacement: fileURLToPath(new URL('./src/stubs/node-fs.stub.ts', import.meta.url)) },
      { find: /^fs\/promises$/, replacement: fileURLToPath(new URL('./src/stubs/node-fs.stub.ts', import.meta.url)) },
      { find: /^fs$/, replacement: fileURLToPath(new URL('./src/stubs/node-fs.stub.ts', import.meta.url)) },
      { find: '@', replacement: fileURLToPath(new URL('./src', import.meta.url)) },
    ],
    dedupe: ['react', 'react-dom', 'wagmi', 'viem', '@wagmi/core'],
  },

  define: {
    'process.env': '{}',
  },

  optimizeDeps: {
    include: ['payid-react', 'payid', 'payid > ethers'],
    exclude: ['payid-rule-engine', 'vite-plugin-node-polyfills/shims/buffer', 'vite-plugin-node-polyfills/shims/process', 'vite-plugin-node-polyfills/shims/global'],
  },

  // http/https/zlib remain external (never called in browser).
  // fs/crypto/path are now polyfilled by vite-plugin-node-polyfills
  // so 0G Storage SDK can run in the browser.
  build: {
    rollupOptions: {
      external: ['http', 'https', 'zlib', 'vite-plugin-node-polyfills/shims/buffer', 'vite-plugin-node-polyfills/shims/process', 'vite-plugin-node-polyfills/shims/global'],
    },
  },

  server: {
    proxy: {
      '/rpc': {
        target: 'http://100.73.196.95:8550',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/rpc/, ''),
      },
    },
    cors: true,
  },

  preview: {
    allowedHosts: ['app.payid.nawasena-labs.com'],
  },

  assetsInclude: ['**/*.wasm'],
});
