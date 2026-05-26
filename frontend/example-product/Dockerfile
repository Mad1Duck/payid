FROM oven/bun:1.3.13 AS builder
WORKDIR /app
COPY . .
RUN bun install
# Build sdk-core (payid) first, then payid-react which depends on it
RUN cd /app/packages/sdk-core && bunx tsup --no-dts
RUN cd /app/packages/payid-react && bunx tsup --no-dts
RUN cd frontend/example-product && bunx vite build

FROM oven/bun:1.3.13 AS runner
WORKDIR /app
RUN bun add serve
WORKDIR /app/frontend/example-product
COPY --from=builder /app/frontend/example-product/dist ./dist
EXPOSE 3000
CMD ["bunx", "serve", "-s", "dist", "-l", "3000"]
