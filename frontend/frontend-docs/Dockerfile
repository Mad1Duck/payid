FROM oven/bun:1.3.13 AS builder

WORKDIR /app

COPY . .

ENV NODE_ENV=development

RUN bun install

WORKDIR /app/frontend/frontend-docs

RUN bunx docusaurus build

FROM nginx:alpine

COPY --from=builder /app/frontend/frontend-docs/build /usr/share/nginx/html
COPY frontend/frontend-docs/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 3000

CMD ["nginx", "-g", "daemon off;"]