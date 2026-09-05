FROM node:22-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM nginx:1.30.4-alpine3.24

# 静态站点不需要 curl 与官方镜像附带的可选动态模块。
RUN apk upgrade --no-cache \
  && apk del --no-cache curl nginx-module-acme nginx-module-geoip nginx-module-image-filter nginx-module-njs nginx-module-xslt

COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

RUN chown -R nginx:nginx /usr/share/nginx/html /var/cache/nginx /var/run

USER nginx

EXPOSE 3001

CMD ["nginx", "-g", "daemon off;"]
