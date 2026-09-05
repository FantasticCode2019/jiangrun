FROM nginx:1.30.4-alpine3.24

# 边缘反向代理只保留核心 Nginx 能力；构建时应用 Alpine 安全更新。
RUN apk upgrade --no-cache \
  && apk del --no-cache curl nginx-module-acme nginx-module-geoip nginx-module-image-filter nginx-module-njs nginx-module-xslt
