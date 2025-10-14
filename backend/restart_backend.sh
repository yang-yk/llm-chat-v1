#!/bin/bash
# 停止旧的后端进程
echo "停止旧的后端服务..."
pkill -f "uvicorn main:app --host 0.0.0.0 --port 8000"
sleep 2

# 启动新的后端（日志输出到文件）
echo "启动后端服务..."
cd /home/data2/yangyk/llm-chat-v2/backend
nohup python -m uvicorn main:app --host 0.0.0.0 --port 8000 > backend.log 2>&1 &

echo "后端已启动，查看日志："
echo "  tail -f /home/data2/yangyk/llm-chat-v2/backend/backend.log"
