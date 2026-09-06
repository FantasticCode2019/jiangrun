#!/usr/bin/env bash
# 江润园林生产环境统一入口（Linux / macOS）
set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DEPLOY_SCRIPT="${PROJECT_DIR}/deploy/deploy.sh"

usage() {
  cat <<EOF
江润园林生产环境脚本

用法：./production.sh <命令>

推荐的首次上线顺序：
  ./production.sh init       # 生成生产密钥配置
  # 放置 deploy/certs/fullchain.pem 和 privkey.pem
  ./production.sh check      # 强密码、域名、CORS、TLS 安全检查
  ./production.sh up         # 拉取、构建并启动

可用命令：
  init check build up start stop restart down clean
  logs [服务] status stats help

说明：生产入口会调用 deploy/deploy.sh，不会绕过上线安全检查。
EOF
}

if [ ! -x "$DEPLOY_SCRIPT" ]; then
  echo "[ERROR] 生产部署脚本不存在或不可执行：$DEPLOY_SCRIPT" >&2
  exit 1
fi

command="${1:-help}"
case "$command" in
  init|check|build|up|start|stop|restart|down|clean|status|ps|stats|logs)
    exec "$DEPLOY_SCRIPT" "$@"
    ;;
  help|-h|--help)
    usage
    ;;
  *)
    usage
    exit 1
    ;;
esac
