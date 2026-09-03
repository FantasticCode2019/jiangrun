#!/usr/bin/env bash
# deploy.sh - 江润园林网站一键部署脚本
# 用法: ./deploy.sh [命令]
set -euo pipefail

# ---------- 颜色 ----------
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; BLUE='\033[0;34m'; NC='\033[0m'
info() { echo -e "${BLUE}[INFO]${NC} $*"; }
ok()   { echo -e "${GREEN}[OK]${NC} $*"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $*"; }
err()  { echo -e "${RED}[ERROR]${NC} $*"; }

DEPLOY_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$DEPLOY_DIR"

# ---------- 环境检查 ----------
if ! command -v docker >/dev/null 2>&1; then
  err "未检测到 Docker，请先安装: https://docs.docker.com/get-docker/"
  exit 1
fi
if ! docker info >/dev/null 2>&1; then
  err "Docker 未运行，请先启动 Docker Desktop 或 docker daemon"
  exit 1
fi

# 兼容 docker compose v2 与 v1
if docker compose version >/dev/null 2>&1; then
  COMPOSE="docker compose -p jiangrun"
elif command -v docker-compose >/dev/null 2>&1; then
  COMPOSE="docker-compose -p jiangrun"
else
  err "未检测到 docker compose，请安装 Docker Compose 插件"
  exit 1
fi

# ---------- 工具函数 ----------
rand_hex() {
  if command -v openssl >/dev/null 2>&1; then
    openssl rand -hex "$1"
  else
    head -c "$1" /dev/urandom | od -An -tx1 | tr -d ' \n'
  fi
}

get_ip() {
  if [ "$(uname)" = "Darwin" ]; then
    ipconfig getifaddr en0 2>/dev/null || echo "127.0.0.1"
  else
    hostname -I 2>/dev/null | awk '{print $1}' || echo "127.0.0.1"
  fi
}

# ---------- 生成 .env ----------
init_env() {
  if [ -f .env ]; then
    info ".env 已存在，跳过生成（如需重置请删除后重跑）"
    return 0
  fi

  local dbpass adminpass jwt
  dbpass=$(rand_hex 16)
	adminpass="Jr9-$(rand_hex 8)"
  jwt=$(rand_hex 32)

  ok "首次运行，生成随机密钥与初始密码 → .env"

  cat > .env <<EOF
# 数据库
POSTGRES_USER=postgres
POSTGRES_PASSWORD=${dbpass}
POSTGRES_DB=jiangrun

# 后端
JWT_SECRET=${jwt}
ADMIN_INITIAL_PASSWORD=${adminpass}
SERVER_MODE=release
CORS_ALLOWED_ORIGINS=https://jiangrun.net,https://www.jiangrun.net

# 域名、TLS 证书目录（目录中必须包含 fullchain.pem、privkey.pem）
DOMAIN=jiangrun.net
TLS_CERT_DIR=./certs
HTTP_PORT=80
HTTPS_PORT=443

# 前端反代到后端的地址（容器内部服务名，一般无需修改）
API_URL=http://server:8080
EOF
  chmod 600 .env

  echo ""
  echo "=========================================================="
  echo "  已生成随机凭据，请妥善保存："
  echo "    管理员账号: admin"
  echo "    初始密码:   ${adminpass}"
  echo "  登录后台后请立即在「修改密码」中更改。"
  echo "=========================================================="
  echo ""
}

# ---------- 安全自检 ----------
# 检查 .env 中是否仍在使用危险的默认值/弱值，避免生产环境回退到弱密钥
do_check() {
  if [ ! -f .env ]; then
    err ".env 不存在，请先执行 ./deploy.sh init 生成"
    return 1
  fi
  # 不要打印真实值，只判断是否安全；fail=1 表示存在不安全项
  local jwt dbpass adminpass fail=0
	jwt=$(grep '^JWT_SECRET=' .env | head -1 | cut -d= -f2- || true)
	dbpass=$(grep '^POSTGRES_PASSWORD=' .env | head -1 | cut -d= -f2- || true)
	adminpass=$(grep '^ADMIN_INITIAL_PASSWORD=' .env | head -1 | cut -d= -f2- || true)

	[ "${#jwt}" -ge 32 ] && [ "$jwt" != "jiangrun-secret-key-change-in-production" ] || { err "JWT_SECRET 未设置、过短或仍为默认值，请运行 ./deploy.sh init 重新生成"; fail=1; }
  [ -n "$dbpass" ] && [ "$dbpass" != "postgres" ] && [ "$dbpass" != "change-me-to-a-random-password" ] || { err "POSTGRES_PASSWORD 未设置或仍为默认值"; fail=1; }
	if [ "${#adminpass}" -lt 12 ] || [ "${#adminpass}" -gt 72 ] || [ "$adminpass" = "admin123" ] ||
	   [[ ! "$adminpass" =~ [[:alpha:]] ]] || [[ ! "$adminpass" =~ [[:digit:]] ]]; then
	  err "ADMIN_INITIAL_PASSWORD 必须为12-72位并同时包含字母和数字"
	  fail=1
	fi
	local domain origins
	domain=$(grep '^DOMAIN=' .env | head -1 | cut -d= -f2- || true)
	origins=$(grep '^CORS_ALLOWED_ORIGINS=' .env | head -1 | cut -d= -f2- || true)
	[ "$domain" = "jiangrun.net" ] || { err "DOMAIN 必须与当前 Nginx 配置一致：jiangrun.net"; fail=1; }
	[ -n "$origins" ] && [[ "$origins" != *"*"* ]] && [[ "$origins" == https://* ]] || { err "CORS_ALLOWED_ORIGINS 必须是明确的 HTTPS 域名且不能包含通配符"; fail=1; }
	local cert_dir
	cert_dir=$(grep '^TLS_CERT_DIR=' .env | head -1 | cut -d= -f2- || true)
	if [ -z "$cert_dir" ] || [ ! -f "$cert_dir/fullchain.pem" ] || [ ! -f "$cert_dir/privkey.pem" ]; then
	  err "TLS 证书缺失：请在 TLS_CERT_DIR 放置 fullchain.pem 和 privkey.pem"
	  fail=1
	elif command -v openssl >/dev/null 2>&1; then
	  openssl x509 -in "$cert_dir/fullchain.pem" -noout -checkend 2592000 >/dev/null 2>&1 || { err "TLS 证书无效、已过期或将在30天内过期"; fail=1; }
	  openssl x509 -in "$cert_dir/fullchain.pem" -noout -checkhost "$domain" >/dev/null 2>&1 || { err "TLS 证书与 DOMAIN 不匹配"; fail=1; }
	fi

  if [ "$fail" = "0" ]; then
    ok ".env 密钥检查通过"
  fi
  return $fail
}

# ---------- 各命令 ----------
# 构建并启动（代码更新后使用）
do_up() {
  init_env
  if ! do_check; then
    err "安全检查未通过，已中止启动。请修复 .env 后重试。"
    exit 1
  fi
  check_port
  info "构建并启动所有服务（首次构建约需数分钟）..."
  $COMPOSE up -d --build
  ok "服务已启动"
  wait_ready
  print_summary
}

# 启动（不重新构建，更快；镜像不存在时会自动构建）
do_start() {
  init_env
  if ! do_check; then
    err "安全检查未通过，已中止启动。请修复 .env 后重试。"
    exit 1
  fi
  check_port
  info "启动所有服务..."
  $COMPOSE up -d
  ok "服务已启动"
  wait_ready
  print_summary
}

# 仅构建镜像，不启动
do_build() {
  init_env
  info "构建所有镜像..."
  $COMPOSE build
  ok "镜像构建完成"
}

# 停止容器（保留容器与数据）
do_stop() {
  $COMPOSE stop
  ok "已停止容器（容器与数据保留，可用 start 再次启动）"
}

# 重启容器（不重新构建）
do_restart() {
  $COMPOSE restart
  ok "已重启所有服务"
}

# 停止并移除容器（保留数据卷）
do_down() {
  $COMPOSE down
  ok "已停止并移除容器（数据卷保留，下次 up 数据仍在）"
}

# 彻底清理（含数据卷，危险）
do_clean() {
  warn "即将删除所有容器、镜像和数据卷（数据库数据将丢失）！"
  read -r -p "确认继续？输入 yes 继续: " confirm
  if [ "$confirm" != "yes" ]; then
    info "已取消"
    return 0
  fi
  $COMPOSE down -v --rmi local
  ok "已清理容器、本地镜像和数据卷"
}

# 查看日志
do_logs() {
  $COMPOSE logs -f --tail=100 "$@"
}

# 查看状态
do_status() {
  $COMPOSE ps
}

# 查看资源占用
do_stats() {
  $COMPOSE stats "$@"
}

# ---------- 辅助 ----------
# 检查对外端口是否被占用，避免冲突
check_port() {
	local hp="${HTTPS_PORT:-443}"
  if command -v lsof >/dev/null 2>&1; then
    if lsof -nP -iTCP:"$hp" -sTCP:LISTEN >/dev/null 2>&1; then
      warn "端口 $hp 已被占用，可在 .env 中修改 HTTP_PORT 后重试"
    fi
  fi
}

wait_ready() {
  if ! command -v curl >/dev/null 2>&1; then
    warn "未安装 curl，跳过健康检查"
    return 0
  fi
  local hp="${HTTPS_PORT:-443}"
  info "等待服务就绪（经 Nginx 检测 $hp 端口）..."
  for _ in $(seq 1 75); do
	if curl -ksf "https://127.0.0.1:${hp}/api/v1/settings" >/dev/null 2>&1; then
      ok "服务已就绪"
      return 0
    fi
    sleep 2
  done
  warn "服务未在 150 秒内就绪，请执行 ./deploy.sh logs server 查看日志"
}

print_summary() {
	local domain
	domain=$(grep '^DOMAIN=' .env | head -1 | cut -d= -f2-)
	[ -n "$domain" ] || domain="jiangrun.net"
  echo "=========================================================="
  echo "  部署完成，访问地址："
	echo "    前台官网:  https://${domain}/"
	echo "    后台管理:  https://${domain}/admin/"
	echo "  后台没有独立公网端口，仅能通过 HTTPS 入口访问。"
  echo "=========================================================="
  echo ""
}

usage() {
  cat <<EOF
江润园林网站一键部署脚本

用法: $0 [命令]

启动类:
  up         构建并启动所有服务（首次部署 / 代码更新后）
  start      启动服务（不重新构建，更快；镜像缺失时自动构建）
  build      仅重新构建镜像

停止类:
  stop       停止容器（保留容器与数据）
  restart    重启容器（不重新构建）
  down       停止并移除容器（保留数据卷）
  clean      彻底清理容器、镜像与数据卷（危险，会删数据库）

查看类:
  logs       查看日志，可指定服务名，如: $0 logs server
  status     查看各服务运行状态
  stats      查看资源占用

其他:
  init       仅生成 .env 配置文件
  check      安全检查：校验 .env 中密钥是否为默认/弱值
  help       显示本帮助

示例:
  $0                # 构建并启动（等同于 up）
  $0 start          # 快速启动
  $0 check          # 检查密钥安全
  $0 logs server    # 查看后端日志
  $0 status         # 查看服务状态
  $0 down           # 停止并移除
EOF
}

# ---------- 入口 ----------
case "${1:-up}" in
  up)               do_up ;;
  start)            do_start ;;
  build)            do_build ;;
  stop)             do_stop ;;
  restart)          do_restart ;;
  down)             do_down ;;
  clean)            do_clean ;;
  check)            do_check ;;
  logs)             shift; do_logs "$@" ;;
  status|ps)        do_status ;;
  stats)            shift; do_stats "$@" ;;
  init)             init_env ;;
  -h|--help|help)   usage ;;
  *)                usage; exit 1 ;;
esac
