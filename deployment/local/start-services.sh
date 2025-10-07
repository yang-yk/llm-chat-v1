#!/bin/bash

# 获取项目根目录
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

echo "启动 LLM Chat System 服务..."

# 启动后端
cd "$PROJECT_ROOT/backend"
nohup python -m uvicorn main:app --host 0.0.0.0 --port 8000 > "$PROJECT_ROOT/logs/backend.log" 2>&1 &
BACKEND_PID=$!
echo $BACKEND_PID > "$PROJECT_ROOT/logs/backend.pid"
echo "后端服务已启动 (PID: $BACKEND_PID)"

# 启动前端
cd "$PROJECT_ROOT/frontend"
nohup npm start > "$PROJECT_ROOT/logs/frontend.log" 2>&1 &
FRONTEND_PID=$!
echo $FRONTEND_PID > "$PROJECT_ROOT/logs/frontend.pid"
echo "前端服务已启动 (PID: $FRONTEND_PID)"

echo "所有服务已启动"
echo "访问地址: http://$(hostname -I | awk '{print $1}'):3000"
