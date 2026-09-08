#!/usr/bin/env bash
# 江润园林本地开发环境管理脚本（Linux / macOS）
set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="${JIANGRUN_DEV_ENV_FILE:-${PROJECT_DIR}/.env.development.local}"
COMPOSE_FILE="${PROJECT_DIR}/deploy/docker-compose.dev.yml"
RUNTIME_DIR="${PROJECT_DIR}/.runtime/dev"
LOG_DIR="${RUNTIME_DIR}/logs"
BIN_DIR="${RUNTIME_DIR}/bin"
NEXT_ENV_BACKUP="${RUNTIME_DIR}/next-env.d.ts.before-dev"
ENV_CHECKER="${PROJECT_DIR}/scripts/check-environment.sh"

# Homebrew 的版本化 Node/OpenSSL 可能是 keg-only，启动时主动加入当前脚本 PATH。
if [ "$(uname -s)" = "Darwin" ] && command -v brew >/dev/null 2>&1; then
  for formula in node@22 openssl@3 curl; do
    formula_prefix="$(brew --prefix "$formula" 2>/dev/null || true)"
    if [ -n "$formula_prefix" ] && [ -d "$formula_prefix/bin" ]; then
      PATH="$formula_prefix/bin:$PATH"
    fi
  done
  export PATH
fi

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; BLUE='\033[0;34m'; NC='\033[0m'
info() { echo -e "${BLUE}[INFO]${NC} $*"; }
ok()   { echo -e "${GREEN}[OK]${NC} $*"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $*"; }
err()  { echo -e "${RED}[ERROR]${NC} $*" >&2; }

rand_hex() {
  if command -v openssl >/dev/null 2>&1; then
    openssl rand -hex "$1"
  else
    head -c "$1" /dev/urandom | od -An -tx1 | tr -d ' \n'
  fi
}

init_env() {
  mkdir -p "$LOG_DIR" "$BIN_DIR"
  if [ -f "$ENV_FILE" ]; then
    return 0
  fi

  local db_password jwt_secret admin_password
  db_password="$(rand_hex 16)"
  jwt_secret="$(rand_hex 32)"
  admin_password="Dev9-$(rand_hex 8)"
  umask 077
  cat >"$ENV_FILE" <<EOF
# 本文件仅用于本地开发，禁止复制到生产环境或提交 Git。
DEV_POSTGRES_USER=postgres
DEV_POSTGRES_PASSWORD=${db_password}
DEV_POSTGRES_DB=jiangrun_dev
DEV_DB_PORT=5432

DEV_JWT_SECRET=${jwt_secret}
DEV_ADMIN_INITIAL_PASSWORD=${admin_password}
DEV_SERVER_PORT=8080
DEV_FRONTEND_PORT=3000
DEV_ADMIN_PORT=3001
DEV_CORS_ALLOWED_ORIGINS=http://localhost:3000,http://127.0.0.1:3000,http://localhost:3001,http://127.0.0.1:3001
# 国内网络默认代理；仍会依据 go.sum 校验下载内容，可按需改为 direct。
DEV_GOPROXY=https://goproxy.cn,direct
EOF
  chmod 600 "$ENV_FILE"
  ok "已生成本地开发配置：$ENV_FILE"
  echo "初始管理员：admin"
  echo "初始密码：${admin_password}"
}

load_env() {
  init_env
  # 这是脚本自己生成、权限为 600 的本地配置文件。
  set -a
  # shellcheck disable=SC1090
  . "$ENV_FILE"
  set +a

  : "${DEV_POSTGRES_USER:=postgres}"
  : "${DEV_POSTGRES_DB:=jiangrun_dev}"
  : "${DEV_DB_PORT:=5432}"
  : "${DEV_SERVER_PORT:=8080}"
  : "${DEV_FRONTEND_PORT:=3000}"
  : "${DEV_ADMIN_PORT:=3001}"
  : "${DEV_CORS_ALLOWED_ORIGINS:=http://localhost:3000,http://localhost:3001}"
  : "${DEV_GOPROXY:=https://goproxy.cn,direct}"
  : "${DEV_POSTGRES_PASSWORD:?DEV_POSTGRES_PASSWORD 未配置}"
  : "${DEV_JWT_SECRET:?DEV_JWT_SECRET 未配置}"
  : "${DEV_ADMIN_INITIAL_PASSWORD:?DEV_ADMIN_INITIAL_PASSWORD 未配置}"
  export DEV_POSTGRES_USER DEV_POSTGRES_PASSWORD DEV_POSTGRES_DB DEV_DB_PORT
  export DEV_JWT_SECRET DEV_ADMIN_INITIAL_PASSWORD DEV_SERVER_PORT
  export DEV_FRONTEND_PORT DEV_ADMIN_PORT DEV_CORS_ALLOWED_ORIGINS
  export DEV_GOPROXY
}

detect_compose() {
  if docker compose version >/dev/null 2>&1; then
    COMPOSE=(docker compose)
  elif command -v docker-compose >/dev/null 2>&1; then
    COMPOSE=(docker-compose)
  else
    err "未找到 Docker Compose，请先安装 Docker Desktop 或 Compose 插件"
    exit 1
  fi
}

compose() {
  detect_compose
  "${COMPOSE[@]}" --project-name jiangrun-dev --env-file "$ENV_FILE" -f "$COMPOSE_FILE" "$@"
}

require_command() {
  if ! command -v "$1" >/dev/null 2>&1; then
    err "缺少命令：$1"
    return 1
  fi
}

check_prerequisites() {
  if [ ! -x "$ENV_CHECKER" ]; then
    err "环境检查脚本不存在或不可执行：$ENV_CHECKER"
    exit 1
  fi
  "$ENV_CHECKER" development
}

install_node_dependencies() {
  local directory="$1" label="$2" lock_checksum stamp_file installed_checksum=""
  stamp_file="$directory/node_modules/.jiangrun-package-lock.cksum"
  lock_checksum="$(cksum "$directory/package-lock.json")"
  if [ -f "$stamp_file" ]; then
    installed_checksum="$(cat "$stamp_file" 2>/dev/null || true)"
  fi
  if [ ! -d "$directory/node_modules" ] || [ "$installed_checksum" != "$lock_checksum" ]; then
    info "安装${label}依赖（首次运行或 package-lock.json 已变化）..."
    (cd "$directory" && npm ci)
    printf '%s\n' "$lock_checksum" >"$stamp_file"
  fi
}

install_dependencies() {
  install_node_dependencies "$PROJECT_DIR/frontend" "前台"
  install_node_dependencies "$PROJECT_DIR/admin" "后台"
  info "下载 Go 依赖..."
  (cd "$PROJECT_DIR/server" && GOPROXY="$DEV_GOPROXY" go mod download)
  ok "开发依赖已就绪"
}

wait_database() {
  local attempt=0
  while [ "$attempt" -lt 30 ]; do
    if compose exec -T postgres pg_isready -U "$DEV_POSTGRES_USER" -d "$DEV_POSTGRES_DB" >/dev/null 2>&1; then
      ok "开发数据库已就绪"
      return 0
    fi
    attempt=$((attempt + 1))
    sleep 1
  done
  err "数据库在 30 秒内未就绪，请运行：./dev.sh logs postgres"
  return 1
}

start_database() {
  info "启动独立开发数据库..."
  compose up -d postgres
  wait_database
}

pid_file() { echo "$RUNTIME_DIR/$1.pid"; }
log_file() { echo "$LOG_DIR/$1.log"; }

is_running() {
  local name="$1" file pid process_command marker
  file="$(pid_file "$name")"
  [ -f "$file" ] || return 1
  pid="$(cat "$file" 2>/dev/null || true)"
  [ -n "$pid" ] && kill -0 "$pid" 2>/dev/null || return 1

  # 防止 PID 被系统复用后误判、误杀不属于本项目的进程。
  process_command="$(ps -p "$pid" -o command= 2>/dev/null || true)"
  case "$name" in
    server) marker="jiangrun-server" ;;
    frontend) marker="next" ;;
    admin) marker="vite" ;;
    *) return 1 ;;
  esac
  case "$process_command" in
    *"$PROJECT_DIR"*"$marker"*) return 0 ;;
    *) return 1 ;;
  esac
}

assert_port_available() {
  local port="$1" name="$2"
  if command -v lsof >/dev/null 2>&1 && lsof -nP -iTCP:"$port" -sTCP:LISTEN >/dev/null 2>&1; then
    err "$name 端口 $port 已被其他进程占用"
    return 1
  fi
}

run_service() {
  local name="$1" workdir="$2"
  shift 2
  if is_running "$name"; then
    info "$name 已在运行"
    return 0
  fi

  local file log
  file="$(pid_file "$name")"
  log="$(log_file "$name")"
  : >"$log"
  (
    cd "$workdir"
    nohup "$@" >>"$log" 2>&1 &
    echo $! >"$file"
  )
  sleep 1
  if ! is_running "$name"; then
    err "$name 启动失败，日志如下："
    tail -n 30 "$log" || true
    return 1
  fi
  ok "$name 已启动（PID $(cat "$file")）"
}

build_server() {
  info "编译 Go API..."
  (cd "$PROJECT_DIR/server" && GOPROXY="$DEV_GOPROXY" go build -o "$BIN_DIR/jiangrun-server" .)
}

start_apps() {
  if ! is_running server; then
    assert_port_available "$DEV_SERVER_PORT" "API"
    build_server
  fi
  if ! is_running frontend; then
    assert_port_available "$DEV_FRONTEND_PORT" "前台"
    if [ -f "$PROJECT_DIR/frontend/next-env.d.ts" ] && [ ! -f "$NEXT_ENV_BACKUP" ]; then
      cp "$PROJECT_DIR/frontend/next-env.d.ts" "$NEXT_ENV_BACKUP"
    fi
  fi
  if ! is_running admin; then
    assert_port_available "$DEV_ADMIN_PORT" "后台"
  fi

  run_service server "$PROJECT_DIR/server" env \
    DATABASE_HOST=127.0.0.1 \
    DATABASE_PORT="$DEV_DB_PORT" \
    DATABASE_USER="$DEV_POSTGRES_USER" \
    DATABASE_PASSWORD="$DEV_POSTGRES_PASSWORD" \
    DATABASE_DBNAME="$DEV_POSTGRES_DB" \
    DATABASE_SSLMODE=disable \
    JWT_SECRET="$DEV_JWT_SECRET" \
    ADMIN_INITIAL_PASSWORD="$DEV_ADMIN_INITIAL_PASSWORD" \
    SERVER_MODE=debug \
    SERVER_PORT="$DEV_SERVER_PORT" \
    CORS_ALLOWED_ORIGINS="$DEV_CORS_ALLOWED_ORIGINS" \
    "$BIN_DIR/jiangrun-server"

  if "$PROJECT_DIR/frontend/node_modules/.bin/next" dev --help 2>&1 | grep -q -- '--webpack'; then
    run_service frontend "$PROJECT_DIR/frontend" env \
      API_URL="http://127.0.0.1:${DEV_SERVER_PORT}" \
      NEXT_TELEMETRY_DISABLED=1 \
      "$PROJECT_DIR/frontend/node_modules/.bin/next" dev \
      --webpack --hostname 127.0.0.1 --port "$DEV_FRONTEND_PORT"
  else
    warn "当前 Next.js 不支持 --webpack，使用该版本默认的开发编译器"
    run_service frontend "$PROJECT_DIR/frontend" env \
      API_URL="http://127.0.0.1:${DEV_SERVER_PORT}" \
      NEXT_TELEMETRY_DISABLED=1 \
      "$PROJECT_DIR/frontend/node_modules/.bin/next" dev \
      --hostname 127.0.0.1 --port "$DEV_FRONTEND_PORT"
  fi

  run_service admin "$PROJECT_DIR/admin" env \
    VITE_SITE_URL="http://127.0.0.1:${DEV_FRONTEND_PORT}" \
    "$PROJECT_DIR/admin/node_modules/.bin/vite" \
    --host 127.0.0.1 --port "$DEV_ADMIN_PORT"
}

wait_http() {
  local name="$1" url="$2" attempt=0
  if ! command -v curl >/dev/null 2>&1; then
    warn "未安装 curl，跳过 $name HTTP 就绪检查"
    return 0
  fi
  while [ "$attempt" -lt 40 ]; do
    if curl --fail --silent --show-error --max-time 3 "$url" >/dev/null 2>&1; then
      ok "$name HTTP 检查通过"
      return 0
    fi
    attempt=$((attempt + 1))
    sleep 0.5
  done
  err "$name 在 20 秒内未能正常响应：$url"
  return 1
}

wait_apps() {
  wait_http "API" "http://127.0.0.1:${DEV_SERVER_PORT}/api/v1/settings"
  wait_http "前台" "http://127.0.0.1:${DEV_FRONTEND_PORT}/"
  wait_http "后台" "http://127.0.0.1:${DEV_ADMIN_PORT}/admin/"
}

print_summary() {
  echo ""
  echo "=========================================================="
  echo "  本地开发环境已启动"
  echo "  前台：http://localhost:${DEV_FRONTEND_PORT}"
  echo "  后台：http://localhost:${DEV_ADMIN_PORT}/admin/"
  echo "  API： http://localhost:${DEV_SERVER_PORT}/api/v1"
  echo "  账号：admin（初始密码保存在 $ENV_FILE）"
  echo "  日志：./dev.sh logs [server|frontend|admin|postgres]"
  echo "=========================================================="
}

do_up() {
  load_env
  check_prerequisites
  install_dependencies
  start_database
  start_apps
  wait_apps
  print_summary
}

stop_service() {
  local name="$1" file pid attempt=0
  file="$(pid_file "$name")"
  if ! is_running "$name"; then
    rm -f "$file"
    if [ "$name" = "frontend" ] && [ -f "$NEXT_ENV_BACKUP" ]; then
      cp "$NEXT_ENV_BACKUP" "$PROJECT_DIR/frontend/next-env.d.ts"
      rm -f "$NEXT_ENV_BACKUP"
    fi
    info "$name 未运行"
    return 0
  fi
  pid="$(cat "$file")"
  kill "$pid" 2>/dev/null || true
  while kill -0 "$pid" 2>/dev/null && [ "$attempt" -lt 20 ]; do
    attempt=$((attempt + 1))
    sleep 0.25
  done
  if kill -0 "$pid" 2>/dev/null; then
    warn "$name 未及时退出，发送强制终止信号"
    kill -KILL "$pid" 2>/dev/null || true
  fi
  rm -f "$file"
  if [ "$name" = "frontend" ] && [ -f "$NEXT_ENV_BACKUP" ]; then
    cp "$NEXT_ENV_BACKUP" "$PROJECT_DIR/frontend/next-env.d.ts"
    rm -f "$NEXT_ENV_BACKUP"
  fi
  ok "$name 已停止"
}

stop_apps() {
  init_env
  stop_service admin
  stop_service frontend
  stop_service server
}

do_stop() {
  load_env
  stop_apps
  if command -v docker >/dev/null 2>&1 && docker info >/dev/null 2>&1; then
    compose stop postgres
  fi
  ok "开发环境已停止，数据库数据已保留"
}

do_down() {
  load_env
  stop_apps
  if command -v docker >/dev/null 2>&1 && docker info >/dev/null 2>&1; then
    compose down
  fi
  ok "开发容器已移除，数据库数据卷已保留"
}

do_restart() {
  do_stop
  do_up
}

service_status() {
  if is_running "$1"; then
    echo "  $1: 运行中（PID $(cat "$(pid_file "$1")")）"
  else
    echo "  $1: 已停止"
  fi
}

do_status() {
  load_env
  echo "开发服务状态："
  service_status server
  service_status frontend
  service_status admin
  if command -v docker >/dev/null 2>&1 && docker info >/dev/null 2>&1; then
    compose ps postgres
  else
    echo "  postgres: Docker 不可用"
  fi
}

do_logs() {
  load_env
  local service="${1:-all}"
  case "$service" in
    postgres) compose logs -f --tail=100 postgres ;;
    server|frontend|admin)
      touch "$(log_file "$service")"
      tail -f "$(log_file "$service")"
      ;;
    all)
      touch "$(log_file server)" "$(log_file frontend)" "$(log_file admin)"
      tail -f "$(log_file server)" "$(log_file frontend)" "$(log_file admin)"
      ;;
    *) err "未知服务：$service"; exit 1 ;;
  esac
}

do_check() {
  load_env
  check_prerequisites
  echo "Node:   $(node --version)"
  echo "npm:    $(npm --version)"
  echo "Go:     $(go version)"
  echo "Docker: $(docker version --format '{{.Server.Version}}')"
  compose config --quiet
  ok "开发环境检查通过"
}

do_test() {
  load_env
  check_prerequisites
  install_dependencies
  info "运行 Go 测试..."
  (cd "$PROJECT_DIR/server" && GOPROXY="$DEV_GOPROXY" go test ./...)
  info "构建前台..."
  (cd "$PROJECT_DIR/frontend" && API_URL="http://127.0.0.1:${DEV_SERVER_PORT}" npm run build)
  info "构建后台..."
  (cd "$PROJECT_DIR/admin" && npm run build)
  ok "开发检查全部通过"
}

do_clean() {
  load_env
  warn "此操作会删除开发数据库数据卷；生产数据不受影响。"
  read -r -p "输入 yes 确认：" answer
  if [ "$answer" != "yes" ]; then
    info "已取消"
    return 0
  fi
  stop_apps
  compose down -v
  rm -rf "$RUNTIME_DIR"
  ok "开发容器、日志和开发数据库已清理"
}

usage() {
  cat <<EOF
江润园林本地开发脚本

用法：./dev.sh <命令>

  up          初始化并启动数据库、API、前台和后台
  stop        停止全部开发服务，保留数据库数据
  restart     重启全部开发服务
  down        停止应用并移除开发容器，保留数据卷
  status      查看服务状态
  logs [服务] 查看日志：server/frontend/admin/postgres/all
  install     安装 Node 与 Go 依赖
  check       检查本机开发工具和 Compose 配置
  install-tools 尝试使用 Homebrew 自动安装缺失开发工具
  test        运行 Go 测试并构建前台、后台
  init        仅生成本地开发配置
  clean       删除开发数据库、容器和运行日志（需确认）
  help        显示帮助

首次使用：
  ./dev.sh up
EOF
}

case "${1:-help}" in
  up|start) do_up ;;
  stop) do_stop ;;
  restart) do_restart ;;
  down) do_down ;;
  status|ps) do_status ;;
  logs) shift; do_logs "${1:-all}" ;;
  install) load_env; check_prerequisites; install_dependencies ;;
  check|doctor) do_check ;;
  install-tools) "$ENV_CHECKER" development --install ;;
  test) do_test ;;
  init) init_env ;;
  clean) do_clean ;;
  help|-h|--help) usage ;;
  *) usage; exit 1 ;;
esac
