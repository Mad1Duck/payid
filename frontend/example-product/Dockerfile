FROM oven/bun:1.3.13 AS builder
WORKDIR /app
COPY . .
RUN rm -f bun.lock
WORKDIR /app/frontend/example-product
RUN bun install
RUN bunx vite build

FROM oven/bun:1.3.13 AS runner
WORKDIR /app
RUN bun add serve
WORKDIR /app/frontend/example-product
COPY --from=builder /app/frontend/example-product/dist ./dist
EXPOSE 3000
CMD ["bunx", "serve", "-s", "dist", "-l", "3000"]