# ===== 构建阶段 =====
FROM node:22-alpine AS builder

ARG API_URL=http://localhost:8080
ENV API_URL=$API_URL
ENV NEXT_TELEMETRY_DISABLED=1

WORKDIR /app

# 单独复制依赖清单以利用 Docker 层缓存
COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# ===== 运行阶段：仅保留独立产物，体积更小 =====
FROM node:22-alpine AS runner

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

WORKDIR /app

# 非 root 用户提升安全性
# 运行镜像不需要 npm/corepack；删除包管理器同时缩小攻击面并避免其依赖留在镜像中。
RUN apk upgrade --no-cache \
  && rm -rf /usr/local/lib/node_modules/npm \
  && rm -f /usr/local/bin/npm /usr/local/bin/npx /usr/local/bin/corepack \
  && addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 nextjs

# 静态资源（图片等）
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
# 独立的服务端产物（含最小化的 node_modules）
COPY --from=builder --chown=nextjs:nodejs --chmod=755 /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

CMD ["node", "server.js"]
