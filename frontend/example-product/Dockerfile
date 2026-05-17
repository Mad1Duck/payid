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

# ── 4. Patch workspace package.json to point to src/ so Vite transpiles from source ──
RUN bun -e "const fs=require('fs');const s=JSON.parse(fs.readFileSync('packages/sdk-core/package.json','utf8'));s.main='./src/index.ts';s.module='./src/index.ts';s.exports={'.':{'import':'./src/index.ts'},'./sessionPolicy':{'import':'./src/sessionPolicy/index.ts'},'./rule':{'import':'./src/rule/index.ts'},'./issuer':{'import':'./src/issuer/index.ts'},'./context':{'import':'./src/context/index.ts'},'./client':{'import':'./src/core/client/index.ts'},'./server':{'import':'./src/core/server/index.ts'}};fs.writeFileSync('packages/sdk-core/package.json',JSON.stringify(s,null,2));const r=JSON.parse(fs.readFileSync('packages/payid-react/package.json','utf8'));r.main='./src/index.ts';r.module='./src/index.ts';r.exports={'.':{'import':'./src/index.ts'}};fs.writeFileSync('packages/payid-react/package.json',JSON.stringify(r,null,2));console.log('Done patching');"

# ── 5. Build the frontend (Vite transpiles workspace packages from source) ──
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