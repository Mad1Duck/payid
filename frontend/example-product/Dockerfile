# ═══════════════════════════════════════════════════════════════
# Builder: install deps + build workspace packages + build app
# ═══════════════════════════════════════════════════════════════
FROM oven/bun:1.3.13 AS builder

WORKDIR /app

# ── 1. Copy package files first (layer cache) ──
COPY bun.lock ./
COPY package.json ./
COPY packages/sdk-core/package.json ./packages/sdk-core/
COPY packages/payid-react/package.json ./packages/payid-react/
COPY packages/contracts/package.json ./packages/contracts/
COPY frontend/example-product/package.json ./frontend/example-product/

# ── 2. Install ALL workspace deps ──
RUN bun install

# ── 3. Copy full source ──
COPY . .

# ── 4. Re-install to pick up any workspace links ──
RUN bun install

# ── 5. Build workspace packages (sdk-core first, then payid-react) ──
RUN cd packages/sdk-core && bun run build
RUN cd packages/payid-react && bun run build

# ── 6. Build the frontend ──
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