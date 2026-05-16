FROM oven/bun:1.3.13 AS deps
WORKDIR /app
COPY package.json bun.lock* ./
RUN bun install --frozen-lockfile

FROM oven/bun:1.3.13 AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN bun run build

FROM oven/bun:1.3.13
WORKDIR /app
COPY --from=builder /app .
EXPOSE 3000
CMD ["bun", "run", "preview", "--host", "0.0.0.0", "--port", "3000"]