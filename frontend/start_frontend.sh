#!/bin/bash
cd /home/data2/yangyk/llm-chat-v2/frontend

# 停止旧的前端进程
pkill -f "next start"
pkill -f "next dev"
sleep 1

# 启动前端（生产模式）
nohup npm run start > ../logs/frontend.log 2>&1 &

echo "✓ 前端已启动"
echo "访问地址: http://localhost:3000"
echo "查看日志: tail -f /home/data2/yangyk/llm-chat-v2/logs/frontend.log"
