FROM node:20-alpine AS builder

WORKDIR /app

COPY frontend/frontend-docs/package.json ./

RUN npm install

COPY frontend/frontend-docs ./

RUN npm run build

FROM nginx:alpine

COPY --from=builder /app/build /usr/share/nginx/html
COPY frontend/frontend-docs/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 3000

CMD ["nginx", "-g", "daemon off;"]