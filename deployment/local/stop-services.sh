#!/bin/bash

# 获取项目根目录
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

echo "停止 LLM Chat System 服务..."

# 停止后端
if [ -f "$PROJECT_ROOT/logs/backend.pid" ]; then
    BACKEND_PID=$(cat "$PROJECT_ROOT/logs/backend.pid")
    if ps -p $BACKEND_PID > /dev/null; then
        kill $BACKEND_PID
        echo "后端服务已停止 (PID: $BACKEND_PID)"
    fi
    rm -f "$PROJECT_ROOT/logs/backend.pid"
fi

# 停止前端
if [ -f "$PROJECT_ROOT/logs/frontend.pid" ]; then
    FRONTEND_PID=$(cat "$PROJECT_ROOT/logs/frontend.pid")
    if ps -p $FRONTEND_PID > /dev/null; then
        kill $FRONTEND_PID
        echo "前端服务已停止 (PID: $FRONTEND_PID)"
    fi
    rm -f "$PROJECT_ROOT/logs/frontend.pid"
fi

echo "所有服务已停止"
