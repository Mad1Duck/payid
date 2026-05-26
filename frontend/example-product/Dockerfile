FROM oven/bun:1.3.13 AS builder
WORKDIR /app
COPY . .
# Install from root so bun resolves workspace:* packages
RUN bun install
# Build workspace packages (payid, payid-react) so their dist/ exists before vite build
RUN bun run --filter './packages/*' build
# Build the frontend app
RUN cd frontend/example-product && bunx vite build

FROM oven/bun:1.3.13 AS runner
WORKDIR /app
RUN bun add serve
WORKDIR /app/frontend/example-product
COPY --from=builder /app/frontend/example-product/dist ./dist
EXPOSE 3000
CMD ["bunx", "serve", "-s", "dist", "-l", "3000"]
