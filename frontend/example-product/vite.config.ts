import { defineConfig } from 'vite';
import { devtools } from '@tanstack/devtools-vite';
import viteReact from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { fileURLToPath, URL } from 'node:url';
import { nodePolyfills } from 'vite-plugin-node-polyfills';

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
      { find: 'node:fs/promises', replacement: fileURLToPath(new URL('./src/stubs/node-fs.stub.ts', import.meta.url)) },
      { find: 'node:fs', replacement: fileURLToPath(new URL('./src/stubs/node-fs.stub.ts', import.meta.url)) },
      { find: /^fs\/promises$/, replacement: fileURLToPath(new URL('./src/stubs/node-fs.stub.ts', import.meta.url)) },
      { find: /^fs$/, replacement: fileURLToPath(new URL('./src/stubs/node-fs.stub.ts', import.meta.url)) },
      // Alias shims ke empty stub — nodePolyfills() sudah handle globals
      { find: 'vite-plugin-node-polyfills/shims/buffer', replacement: fileURLToPath(new URL('./src/stubs/empty.stub.ts', import.meta.url)) },
      { find: 'vite-plugin-node-polyfills/shims/process', replacement: fileURLToPath(new URL('./src/stubs/empty.stub.ts', import.meta.url)) },
      { find: 'vite-plugin-node-polyfills/shims/global', replacement: fileURLToPath(new URL('./src/stubs/empty.stub.ts', import.meta.url)) },
      { find: '@', replacement: fileURLToPath(new URL('./src', import.meta.url)) },
    ],
    dedupe: ['react', 'react-dom', 'wagmi', 'viem', '@wagmi/core'],
  },
  define: {
    'process.env': '{}',
  },
  optimizeDeps: {
    include: ['payid-react', 'payid', 'payid > ethers'],
    exclude: ['payid-rule-engine'],
  },
  build: {
    rollupOptions: {
      external: ['http', 'https', 'zlib'],
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
    host: "0.0.0.0",
    port: 3000,
    allowedHosts: true,
  },
  assetsInclude: ['**/*.wasm'],
});