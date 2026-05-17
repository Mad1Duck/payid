# ═══════════════════════════════════════════════════════════════
# Builder: install deps + build workspace packages + build app
# ═══════════════════════════════════════════════════════════════
FROM oven/bun:1.3.13 AS builder

WORKDIR /app

# ── 1. Copy full source ──
COPY . .

# ── 2. Install ALL workspace deps ──
RUN bun install

# ── 3. Build workspace packages with esbuild directly (bypass tsup's buggy resolution) ──
RUN cd packages/sdk-core && npx esbuild src/index.ts --bundle --platform=neutral --format=esm --outfile=dist/index.js \
    --external:ethers --external:@0gfoundation/0g-storage-ts-sdk --external:wasi \
    --loader:.wasm=copy
RUN cd packages/payid-react && bun run build

# ── 4. Build the frontend ──
WORKDIR /app/frontend/example-product
RUN bunx vite build

# ═══════════════════════════════════════════════════════════════
# Runner: bun serving static build with vite preview
# ═══════════════════════════════════════════════════════════════
FROM oven/bun:1.3.13 AS runner

WORKDIR /app/frontend/example-product

COPY --from=builder /app/frontend/example-product/dist ./dist
COPY --from=builder /app/frontend/example-product/package.json ./package.json
COPY --from=builder /app/node_modules /app/node_modules

EXPOSE 3000

CMD ["bunx", "vite", "preview", "--host", "0.0.0.0", "--port", "3000"]