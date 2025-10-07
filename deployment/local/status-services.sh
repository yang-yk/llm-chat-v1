#!/bin/bash

# 获取项目根目录
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

echo "LLM Chat System 服务状态:"
echo "========================================="

# 检查后端
if [ -f "$PROJECT_ROOT/logs/backend.pid" ]; then
    BACKEND_PID=$(cat "$PROJECT_ROOT/logs/backend.pid")
    if ps -p $BACKEND_PID > /dev/null; then
        echo "后端服务: 运行中 (PID: $BACKEND_PID)"
    else
        echo "后端服务: 已停止"
    fi
else
    echo "后端服务: 未启动"
fi

# 检查前端
if [ -f "$PROJECT_ROOT/logs/frontend.pid" ]; then
    FRONTEND_PID=$(cat "$PROJECT_ROOT/logs/frontend.pid")
    if ps -p $FRONTEND_PID > /dev/null; then
        echo "前端服务: 运行中 (PID: $FRONTEND_PID)"
    else
        echo "前端服务: 已停止"
    fi
else
    echo "前端服务: 未启动"
fi

echo "========================================="
