FROM oven/bun:1.2.21 AS builder

WORKDIR /app

COPY frontend/frontend-docs/package.json frontend/frontend-docs/bun.lock ./

RUN bun install --frozen-lockfile

COPY frontend/frontend-docs ./

ENV NODE_ENV=production
ENV CI=false
ENV NO_COLOR=1

RUN bun run build

FROM nginx:alpine

COPY --from=builder /app/build /usr/share/nginx/html
COPY frontend/frontend-docs/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 3000

CMD ["nginx", "-g", "daemon off;"]