#!/bin/bash
# server/start.sh - 江润后台启动脚本
# 使用方法：
#   ./start.sh start          # 启动后台
#   ./start.sh stop           # 停止后台
#   ./start.sh restart        # 重启
#   ./start.sh logs           # 查看日志

PROJECT_DIR="$(cd "$(dirname "$0")"; pwd)"
LOG_DIR="${PROJECT_DIR}/../logs"
LOG_FILE="${LOG_DIR}/server.log"

# 创建日志目录
mkdir -p "${LOG_DIR}"

# 编译检查
BINARY="${PROJECT_DIR}/jiangrun-server"
if [ ! -f "${BINARY}" ] || [ "${PROJECT_DIR}/server/main.go" -ot "${BINARY}" ]; then
    echo "🔨 检测到代码更新，正在重新编译..."
    cd "${PROJECT_DIR}"
    go build -o jiangrun-server main.go
    if [ $? -ne 0 ]; then
        echo "❌ 编译失败，请检查代码！"
        exit 1
    fi
    echo "✅ 编译成功"
fi

case "$1" in
    "start")
        if pgrep -f "jiangrun-server" > /dev/null; then
            echo "⚠️  服务已在运行"
        else
            echo "🚀 正在启动后台服务..."
            nohup "${BINARY}" > "${LOG_FILE}" 2>&1 &
            echo "✅ 服务已启动！"
            echo "   日志文件: ${LOG_FILE}"
            echo "   查看日志: tail -f ${LOG_FILE}"
            echo "   停止服务: ./start.sh stop"
        fi
        ;;

    "stop")
        if pkill -f "jiangrun-server"; then
            echo "🛑 服务已停止"
        else
            echo "⚠️  未找到正在运行的服务"
        fi
        ;;

    "restart")
        $0 stop
        sleep 1
        $0 start
        ;;

    "logs")
        if [ -f "${LOG_FILE}" ]; then
            tail -f "${LOG_FILE}"
        else
            echo "❌ 未找到日志文件"
        fi
        ;;

    *)
        echo "使用方法："
        echo "  ./start.sh start    - 启动后台"
        echo "  ./start.sh stop     - 停止后台"
        echo "  ./start.sh restart  - 重启后台"
        echo "  ./start.sh logs     - 查看实时日志"
        echo ""
        echo "默认配置文件位于: ${PROJECT_DIR}/config/config.yaml"
        ;;
esac
