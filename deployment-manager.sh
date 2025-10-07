#!/bin/bash

# LLM Chat 部署管理脚本
# 用于管理本地部署和 Docker 部署，避免端口冲突

set -e

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DOCKER_DIR="$PROJECT_ROOT/deployment/docker"
BACKEND_DIR="$PROJECT_ROOT/backend"
FRONTEND_DIR="$PROJECT_ROOT/frontend"

# 颜色输出
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# 打印带颜色的消息
print_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 检查端口占用
check_port() {
    local port=$1
    if netstat -tuln 2>/dev/null | grep -q ":$port " || ss -tuln 2>/dev/null | grep -q ":$port "; then
        return 0
    else
        return 1
    fi
}

# 检测当前部署状态
check_deployment_status() {
    local docker_running=false
    local local_backend_running=false
    local local_frontend_running=false

    # 检查 Docker 容器
    if docker ps --format '{{.Names}}' 2>/dev/null | grep -q "llm-chat-"; then
        docker_running=true
    fi

    # 检查本地服务
    if check_port 8000; then
        if ! docker ps --format '{{.Names}}' 2>/dev/null | grep -q "llm-chat-backend"; then
            local_backend_running=true
        fi
    fi

    if check_port 3000; then
        if ! docker ps --format '{{.Names}}' 2>/dev/null | grep -q "llm-chat-frontend"; then
            local_frontend_running=true
        fi
    fi

    echo "=== 当前部署状态 ==="
    echo "Docker 容器运行: $docker_running"
    echo "本地后端运行: $local_backend_running"
    echo "本地前端运行: $local_frontend_running"
    echo ""

    if [ "$docker_running" = true ] && ([ "$local_backend_running" = true ] || [ "$local_frontend_running" = true ]); then
        print_warn "检测到本地部署和 Docker 部署同时运行，可能存在端口冲突！"
        echo ""
    fi
}

# 停止本地部署
stop_local() {
    print_info "停止本地部署..."

    # 查找并停止后端进程
    if pgrep -f "uvicorn main:app" > /dev/null; then
        print_info "停止后端服务..."
        pkill -f "uvicorn main:app" || true
    fi

    # 查找并停止前端进程
    if pgrep -f "next-server" > /dev/null; then
        print_info "停止前端服务..."
        pkill -f "next-server" || true
        pkill -f "next dev" || true
        pkill -f "npm.*start" || true
    fi

    sleep 2
    print_info "本地部署已停止"
}

# 停止 Docker 部署
stop_docker() {
    print_info "停止 Docker 部署..."

    if [ -d "$DOCKER_DIR" ]; then
        cd "$DOCKER_DIR"
        if docker compose ps --quiet 2>/dev/null | grep -q .; then
            docker compose down
            print_info "Docker 部署已停止"
        else
            print_info "Docker 容器未运行"
        fi
    else
        print_error "Docker 部署目录不存在: $DOCKER_DIR"
        exit 1
    fi
}

# 启动 Docker 部署
start_docker() {
    print_info "启动 Docker 部署..."

    # 检查并停止本地部署
    if check_port 3000 || check_port 8000; then
        print_warn "检测到端口占用，尝试停止本地部署..."
        stop_local
    fi

    if [ ! -d "$DOCKER_DIR" ]; then
        print_error "Docker 部署目录不存在: $DOCKER_DIR"
        exit 1
    fi

    # 检查配置文件
    if [ ! -f "$PROJECT_ROOT/deployment-config.local.json" ]; then
        print_warn "未找到配置文件，请先运行 ./apply-config.sh"
        exit 1
    fi

    # 检查部署类型，如果不是docker则重新应用配置
    local deployment_type=$(jq -r '.deployment.type // "docker"' "$PROJECT_ROOT/deployment-config.local.json")
    if [ "$deployment_type" != "docker" ]; then
        print_info "检测到配置类型为 $deployment_type，切换为 docker 并重新应用配置..."

        # 临时修改配置类型
        jq '.deployment.type = "docker" | .nginx.enabled = true' "$PROJECT_ROOT/deployment-config.local.json" > "$PROJECT_ROOT/deployment-config.local.json.tmp"
        mv "$PROJECT_ROOT/deployment-config.local.json.tmp" "$PROJECT_ROOT/deployment-config.local.json"

        # 重新应用配置
        cd "$PROJECT_ROOT"
        echo "Y" | ./apply-config.sh deployment-config.local.json > /dev/null 2>&1
        print_info "配置已更新为 Docker 部署模式"
    fi

    cd "$DOCKER_DIR"

    # 启动 Docker 容器
    print_info "启动 Docker 容器..."
    docker compose up -d --build

    sleep 3

    # 检查容器状态
    print_info "检查容器状态..."
    docker compose ps

    echo ""
    print_info "Docker 部署已启动"
    print_info "访问地址："
    print_info "  - 主页面: http://$(hostname -I | awk '{print $1}') (通过 Nginx)"
    print_info "  - 后端API: http://$(hostname -I | awk '{print $1}'):8000"
}

# 启动本地部署
start_local() {
    print_info "启动本地部署..."

    # 检查并停止 Docker 部署
    if docker ps --format '{{.Names}}' 2>/dev/null | grep -q "llm-chat-"; then
        print_warn "检测到 Docker 部署运行中，尝试停止..."
        stop_docker
    fi

    # 检查配置文件
    if [ ! -f "$PROJECT_ROOT/deployment-config.local.json" ]; then
        print_warn "未找到配置文件，请先运行 ./apply-config.sh"
        exit 1
    fi

    # 检查部署类型，如果不是local则重新应用配置
    local deployment_type=$(jq -r '.deployment.type // "docker"' "$PROJECT_ROOT/deployment-config.local.json")
    if [ "$deployment_type" != "local" ]; then
        print_info "检测到配置类型为 $deployment_type，切换为 local 并重新应用配置..."

        # 临时修改配置类型
        jq '.deployment.type = "local" | .nginx.enabled = false' "$PROJECT_ROOT/deployment-config.local.json" > "$PROJECT_ROOT/deployment-config.local.json.tmp"
        mv "$PROJECT_ROOT/deployment-config.local.json.tmp" "$PROJECT_ROOT/deployment-config.local.json"

        # 重新应用配置
        cd "$PROJECT_ROOT"
        echo "Y" | ./apply-config.sh deployment-config.local.json > /dev/null 2>&1
        print_info "配置已更新为本地部署模式"
    fi

    # 使用 deployment/local/start.sh 启动
    print_info "使用 start.sh 启动本地服务..."
    cd "$PROJECT_ROOT/deployment/local"

    if [ ! -f "start.sh" ]; then
        print_error "未找到 start.sh 脚本"
        exit 1
    fi

    bash start.sh

    if [ $? -eq 0 ]; then
        print_info "本地部署已启动"
        print_info "访问地址："
        print_info "  - 前端页面: http://$(hostname -I | awk '{print $1}'):3000"
        print_info "  - 后端API: http://$(hostname -I | awk '{print $1}'):8000"
        return 0
    else
        print_error "本地部署启动失败"
        exit 1
    fi
}


# 显示使用帮助
show_help() {
    cat << EOF
LLM Chat 部署管理脚本

用法: $0 [命令]

命令:
  status              查看当前部署状态
  start-docker        启动 Docker 部署（自动停止本地部署）
  stop-docker         停止 Docker 部署
  start-local         启动本地部署（自动停止 Docker 部署）
  stop-local          停止本地部署
  stop-all            停止所有部署
  restart-docker      重启 Docker 部署
  restart-local       重启本地部署
  help                显示此帮助信息

说明:
  - Docker 部署: 使用 Nginx 反向代理，访问 http://IP 即可
  - 本地部署: 直接访问 http://IP:3000

示例:
  $0 status           # 查看当前状态
  $0 start-docker     # 切换到 Docker 部署
  $0 start-local      # 切换到本地部署
  $0 stop-all         # 停止所有服务
EOF
}

# 主逻辑
case "${1:-}" in
    status)
        check_deployment_status
        ;;
    start-docker)
        check_deployment_status
        start_docker
        ;;
    stop-docker)
        stop_docker
        ;;
    start-local)
        check_deployment_status
        start_local
        ;;
    stop-local)
        stop_local
        ;;
    stop-all)
        stop_docker
        stop_local
        ;;
    restart-docker)
        stop_docker
        sleep 2
        start_docker
        ;;
    restart-local)
        stop_local
        sleep 2
        start_local
        ;;
    help|--help|-h|"")
        show_help
        ;;
    *)
        print_error "未知命令: $1"
        echo ""
        show_help
        exit 1
        ;;
esac
