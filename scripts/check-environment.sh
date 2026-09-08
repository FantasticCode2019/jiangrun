#!/usr/bin/env bash
# macOS / Linux 启动环境预检。检查失败时打印手动方案，并可在交互确认后用 Homebrew 安装。
set -u

PROFILE="${1:-development}"
INSTALL_MODE="${2:-}"
PROBLEM_KEYS=()
PROBLEM_MESSAGES=()

green='\033[0;32m'; yellow='\033[1;33m'; red='\033[0;31m'; nc='\033[0m'
pass() { echo -e "${green}[满足]${nc} $*"; }
warn() { echo -e "${yellow}[提示]${nc} $*"; }
fail() { echo -e "${red}[缺失]${nc} $*"; }

add_problem() {
  PROBLEM_KEYS+=("$1")
  PROBLEM_MESSAGES+=("$2")
  fail "$2"
}

version_at_least() {
  local actual="$1" required_major="$2" required_minor="$3" major minor
  major="${actual%%.*}"
  minor="${actual#*.}"; minor="${minor%%.*}"
  [[ "$major" =~ ^[0-9]+$ ]] || return 1
  [[ "$minor" =~ ^[0-9]+$ ]] || minor=0
  [ "$major" -gt "$required_major" ] || { [ "$major" -eq "$required_major" ] && [ "$minor" -ge "$required_minor" ]; }
}

check_docker() {
  if ! command -v docker >/dev/null 2>&1; then
    add_problem docker "Docker 未安装"
    return
  fi
  pass "Docker CLI：$(docker --version 2>/dev/null || echo 已安装)"
  if docker compose version >/dev/null 2>&1; then
    pass "Docker Compose：$(docker compose version --short 2>/dev/null || docker compose version 2>/dev/null)"
  elif command -v docker-compose >/dev/null 2>&1; then
    pass "Docker Compose：$(docker-compose version --short 2>/dev/null || docker-compose version 2>/dev/null)"
  else
    add_problem compose "Docker Compose 未安装或不可用"
  fi
  if docker info >/dev/null 2>&1; then
    pass "Docker daemon 正在运行"
  else
    add_problem docker_running "Docker 已安装，但 daemon/Desktop 尚未启动或当前用户无权访问"
  fi
}

check_development() {
  check_docker
  if command -v node >/dev/null 2>&1; then
    local node_version
    node_version="$(node -p 'process.versions.node' 2>/dev/null || true)"
    if version_at_least "$node_version" 22 0; then pass "Node.js：v$node_version"; else add_problem node "Node.js 版本过低（当前 v${node_version:-未知}，要求 22+）"; fi
  else
    add_problem node "Node.js 未安装（要求 22+，并包含 npm）"
  fi
  if command -v npm >/dev/null 2>&1; then pass "npm：$(npm --version 2>/dev/null)"; else add_problem npm "npm 未安装或不在 PATH 中"; fi
  if command -v go >/dev/null 2>&1; then
    local go_version
    go_version="$(go version 2>/dev/null | sed -E 's/.*go([0-9]+\.[0-9]+).*/\1/' || true)"
    if version_at_least "$go_version" 1 26; then pass "Go：$(go version 2>/dev/null)"; else add_problem go "Go 版本过低（当前 ${go_version:-未知}，要求 1.26+）"; fi
  else
    add_problem go "Go 未安装（要求 1.26+）"
  fi
}

check_production() {
  check_docker
  if command -v curl >/dev/null 2>&1; then pass "curl：$(curl --version 2>/dev/null | head -1)"; else add_problem curl "curl 未安装（生产健康检查需要）"; fi
  if ! command -v openssl >/dev/null 2>&1; then
    add_problem openssl "OpenSSL 未安装（生产证书检查需要）"
  elif openssl x509 -help 2>&1 | grep -q -- '-checkhost'; then
    pass "OpenSSL：$(openssl version 2>/dev/null)"
  else
    add_problem openssl "OpenSSL 不支持 x509 -checkhost，请安装 OpenSSL 1.1.1+/3.x"
  fi
}

print_manual_instructions() {
  local os key
  os="$(uname -s)"
  echo ""
  echo "请按以下方式手动补齐环境："
  if [ "$os" = "Darwin" ]; then
    echo "  Docker Desktop: https://www.docker.com/products/docker-desktop/"
    echo "  Node.js 22+:    https://nodejs.org/"
    echo "  Go 1.26+:       https://go.dev/dl/"
    echo "  Homebrew:       https://brew.sh/"
    echo ""
    echo "也可以使用 Homebrew："
    for key in "${PROBLEM_KEYS[@]}"; do
      case "$key" in
        docker|compose) echo "  brew install --cask docker" ;;
        docker_running) echo "  open -a Docker" ;;
        node|npm) echo "  brew install node@22" ;;
        go) echo "  brew install go" ;;
        curl) echo "  brew install curl" ;;
        openssl) echo "  brew install openssl@3" ;;
      esac
    done | awk '!seen[$0]++'
  else
    echo "  Docker Engine/Compose: https://docs.docker.com/engine/install/"
    echo "  Node.js 22+:           https://nodejs.org/"
    echo "  Go 1.26+:              https://go.dev/dl/"
    echo "  请使用当前 Linux 发行版的软件包管理器安装 curl 与 openssl。"
  fi
}

auto_install_macos() {
  local key install_failed=0
  if [ "$(uname -s)" != "Darwin" ]; then
    warn "当前自动安装仅支持 macOS；请按上方说明手动安装"
    return 1
  fi
  if ! command -v brew >/dev/null 2>&1; then
    warn "未检测到 Homebrew。出于安全考虑，脚本不会自动执行远程 Homebrew 安装脚本，请先从 https://brew.sh/ 安装"
    return 1
  fi
  for key in "${PROBLEM_KEYS[@]}"; do
    case "$key" in
      docker|compose)
        brew list --cask docker >/dev/null 2>&1 || brew install --cask docker || install_failed=1
        ;;
      docker_running)
        open -a Docker >/dev/null 2>&1 || install_failed=1
        ;;
      node|npm)
        brew list node@22 >/dev/null 2>&1 || brew install node@22 || install_failed=1
        ;;
      go)
        brew list go >/dev/null 2>&1 || brew install go || install_failed=1
        ;;
      curl)
        brew list curl >/dev/null 2>&1 || brew install curl || install_failed=1
        ;;
      openssl)
        brew list openssl@3 >/dev/null 2>&1 || brew install openssl@3 || install_failed=1
        ;;
    esac
  done
  [ "$install_failed" = "0" ] || return 1
  echo ""
  pass "自动安装命令已执行。请启动 Docker Desktop、重新打开终端，再次运行原启动脚本。"
  # PATH、WSL2 或 Docker daemon 可能尚未刷新；阻止本次启动继续，要求重新运行。
  return 2
}

case "$PROFILE" in
  development) echo "正在检查开发环境..."; check_development ;;
  production) echo "正在检查生产环境..."; check_production ;;
  *) echo "用法：$0 development|production [--install]" >&2; exit 2 ;;
esac

if [ "${#PROBLEM_KEYS[@]}" -eq 0 ]; then
  pass "环境检查全部通过"
  exit 0
fi

echo ""
fail "共有 ${#PROBLEM_KEYS[@]} 项环境条件不满足"
print_manual_instructions

if [ "$INSTALL_MODE" = "--install" ]; then
  auto_install_macos
  exit $?
fi

if [ -t 0 ] && [ "$(uname -s)" = "Darwin" ] && command -v brew >/dev/null 2>&1; then
  echo ""
  read -r -p "是否允许脚本使用 Homebrew 尝试自动安装/启动缺失项？[y/N] " answer
  case "$answer" in
    y|Y|yes|YES) auto_install_macos; exit $? ;;
  esac
fi

exit 1
