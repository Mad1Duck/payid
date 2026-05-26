FROM oven/bun:1.3.13 AS builder
# Copy entire monorepo so workspace:* packages (payid, payid-react) are resolvable
WORKDIR /app
COPY . .
# Install from root so bun resolves workspace packages in packages/
RUN bun install
RUN cd frontend/example-product && bunx vite build

FROM oven/bun:1.3.13 AS runner
WORKDIR /app
RUN bun add serve
WORKDIR /app/frontend/example-product
COPY --from=builder /app/frontend/example-product/dist ./dist
EXPOSE 3000
CMD ["bunx", "serve", "-s", "dist", "-l", "3000"]
