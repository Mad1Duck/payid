FROM oven/bun:1.3.13 AS deps
WORKDIR /app

COPY package.json bun.lock ./
COPY frontend/example-product/package.json ./frontend/example-product/package.json
COPY packages ./packages
COPY tsconfig.json tsconfig.base.json ./

RUN bun install

FROM oven/bun:1.3.13 AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

WORKDIR /app/frontend/example-product
RUN bun run build

FROM oven/bun:1.3.13
WORKDIR /app/frontend/example-product

COPY --from=builder /app/node_modules /app/node_modules
COPY --from=builder /app/frontend/example-product/package.json ./package.json
COPY --from=builder /app/frontend/example-product/dist ./dist

EXPOSE 3000

CMD ["bun", "run", "preview", "--host", "0.0.0.0", "--port", "3000"]