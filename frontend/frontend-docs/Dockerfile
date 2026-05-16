FROM oven/bun:1.3.13 AS deps
WORKDIR /app

COPY package.json bun.lock ./
COPY frontend/frontend-docs/package.json ./frontend/frontend-docs/package.json
COPY packages ./packages
COPY tsconfig.json tsconfig.base.json ./

RUN bun install

FROM oven/bun:1.3.13 AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

WORKDIR /app/frontend/frontend-docs
RUN bun run build

FROM nginx:alpine

COPY --from=builder /app/frontend/frontend-docs/build /usr/share/nginx/html
COPY frontend/frontend-docs/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 3000

CMD ["nginx", "-g", "daemon off;"]