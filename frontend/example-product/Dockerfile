FROM oven/bun:1.3.13 AS builder
WORKDIR /app
COPY . .
RUN bun install
RUN cd /app/frontend/example-product && bun install
RUN ls /app/frontend/example-product/node_modules/payid-react/dist/ || echo "NO DIST"
RUN ls /app/node_modules/payid-react/dist/ || echo "NO DIST IN ROOT"
RUN cat /app/node_modules/payid-react/package.json | grep -E "main|module|exports" || echo "NOT FOUND"
WORKDIR /app/frontend/example-product
RUN bunx vite build

FROM oven/bun:1.3.13 AS runner
WORKDIR /app/frontend/example-product
COPY --from=builder /app/frontend/example-product/dist ./dist
COPY --from=builder /app/frontend/example-product/package.json ./package.json
COPY --from=builder /app/frontend/example-product/node_modules ./node_modules
EXPOSE 3000
CMD ["bunx", "vite", "preview", "--host", "0.0.0.0", "--port", "3000"]