# ═══════════════════════════════════════════════════════════════
# Builder: install deps + build workspace packages + build app
# ═══════════════════════════════════════════════════════════════
FROM oven/bun:1.3.13 AS builder

WORKDIR /app

# ── 1. Copy full source ──
COPY . .

# ── 2. Install ALL workspace deps ──
RUN bun install

# ── 3. Debug: verify issuer directory exists ──
RUN ls packages/sdk-core/src/

# ── 4. Build workspace packages with tsup (from source, no DTS to avoid resolution issues) ──
RUN cd packages/sdk-core && bunx tsup src/index.ts src/rule/index.ts src/sessionPolicy/index.ts src/context/index.ts src/issuer/index.ts src/core/client/index.ts src/core/server/index.ts \
    --format esm --outDir dist --dts false --external ethers --external @0gfoundation/0g-storage-ts-sdk --external wasi
RUN cd packages/payid-react && bun run build

# ── 5. Build the frontend ──
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