# ═══════════════════════════════════════════════════════════════
# Builder: install deps + build workspace packages + build app
# ═══════════════════════════════════════════════════════════════
FROM oven/bun:1.3.13 AS builder

WORKDIR /app

# ── 1. Copy full source ──
COPY . .

# ── 2. Install deps (workspace) ──
RUN bun install

# ── 3. Build workspace packages (SKIPPED — relies on pre-built dist files) ──
RUN cd packages/sdk-core && bun run build
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