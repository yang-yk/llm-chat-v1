#!/bin/bash

# LLM Chat System 停止脚本

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# 项目根目录
PROJECT_ROOT="$(cd "$(dirname "$0")" && pwd)"
LOG_DIR="$PROJECT_ROOT/logs"
BACKEND_PID_FILE="$LOG_DIR/backend.pid"
FRONTEND_PID_FILE="$LOG_DIR/frontend.pid"

echo -e "${BLUE}"
echo "================================================"
echo "   🛑 LLM Chat System - 停止脚本"
echo "================================================"
echo -e "${NC}"

# 停止后端
stop_backend() {
    echo -e "${YELLOW}🛑 停止后端服务...${NC}"

    if [ -f "$BACKEND_PID_FILE" ]; then
        BACKEND_PID=$(cat "$BACKEND_PID_FILE")
        if ps -p $BACKEND_PID > /dev/null 2>&1; then
            echo -e "${YELLOW}   停止主进程 (PID: $BACKEND_PID)...${NC}"
            # 优雅关闭
            kill $BACKEND_PID 2>/dev/null || true

            # 等待进程结束
            for i in {1..10}; do
                if ! ps -p $BACKEND_PID > /dev/null 2>&1; then
                    break
                fi
                sleep 0.5
            done

            # 如果还在运行，强制关闭
            if ps -p $BACKEND_PID > /dev/null 2>&1; then
                echo -e "${YELLOW}   强制停止进程...${NC}"
                kill -9 $BACKEND_PID 2>/dev/null || true
            fi

            rm -f "$BACKEND_PID_FILE"
            echo -e "${GREEN}✅ 后端服务已停止${NC}"
        else
            echo -e "${YELLOW}⚠️  后端进程已不存在${NC}"
            rm -f "$BACKEND_PID_FILE"
        fi
    else
        echo -e "${YELLOW}⚠️  未找到后端PID文件${NC}"
    fi

    # 清理端口8000的所有进程（包括uvicorn子进程）
    if lsof -Pi :8000 -sTCP:LISTEN -t >/dev/null 2>&1; then
        echo -e "${YELLOW}🔧 清理端口8000的残留进程...${NC}"
        lsof -ti:8000 | xargs kill -9 2>/dev/null || true
        sleep 1
    fi

    # 查找并清理可能的 uvicorn 进程
    UVICORN_PIDS=$(ps aux | grep "[u]vicorn main:app" | awk '{print $2}')
    if [ ! -z "$UVICORN_PIDS" ]; then
        echo -e "${YELLOW}🔧 清理uvicorn残留进程...${NC}"
        echo "$UVICORN_PIDS" | xargs kill -9 2>/dev/null || true
    fi
}

# 停止前端
stop_frontend() {
    echo -e "${YELLOW}🛑 停止前端服务...${NC}"

    if [ -f "$FRONTEND_PID_FILE" ]; then
        FRONTEND_PID=$(cat "$FRONTEND_PID_FILE")
        if ps -p $FRONTEND_PID > /dev/null 2>&1; then
            echo -e "${YELLOW}   停止主进程 (PID: $FRONTEND_PID)...${NC}"
            # 优雅关闭
            kill $FRONTEND_PID 2>/dev/null || true

            # 等待进程结束
            for i in {1..10}; do
                if ! ps -p $FRONTEND_PID > /dev/null 2>&1; then
                    break
                fi
                sleep 0.5
            done

            # 如果还在运行，强制关闭
            if ps -p $FRONTEND_PID > /dev/null 2>&1; then
                echo -e "${YELLOW}   强制停止进程...${NC}"
                kill -9 $FRONTEND_PID 2>/dev/null || true
            fi

            rm -f "$FRONTEND_PID_FILE"
            echo -e "${GREEN}✅ 前端服务已停止${NC}"
        else
            echo -e "${YELLOW}⚠️  前端进程已不存在${NC}"
            rm -f "$FRONTEND_PID_FILE"
        fi
    else
        echo -e "${YELLOW}⚠️  未找到前端PID文件${NC}"
    fi

    # 清理端口3000的所有进程（包括Next.js子进程）
    if lsof -Pi :3000 -sTCP:LISTEN -t >/dev/null 2>&1; then
        echo -e "${YELLOW}🔧 清理端口3000的残留进程...${NC}"
        lsof -ti:3000 | xargs kill -9 2>/dev/null || true
        sleep 1
    fi

    # 查找并清理可能的 node/npm 进程
    NODE_PIDS=$(ps aux | grep "[n]ode.*next dev" | awk '{print $2}')
    if [ ! -z "$NODE_PIDS" ]; then
        echo -e "${YELLOW}🔧 清理Next.js残留进程...${NC}"
        echo "$NODE_PIDS" | xargs kill -9 2>/dev/null || true
    fi
}

# 主函数
main() {
    stop_backend
    echo ""
    stop_frontend

    echo ""
    echo -e "${BLUE}================================================${NC}"
    echo -e "${GREEN}✅ 所有服务已停止${NC}"
    echo -e "${BLUE}================================================${NC}"
}

main
