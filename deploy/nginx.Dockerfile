FROM nginx:1.30.4-alpine3.24-slim

# 使用官方 slim 运行镜像，不在构建时访问 Alpine 软件仓库。
# deploy.sh 会通过 --pull 获取该固定版本标签的最新安全重建。
