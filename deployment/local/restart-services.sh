#!/bin/bash

# 获取脚本所在目录
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

echo "重启 LLM Chat System 服务..."
"$SCRIPT_DIR/stop-services.sh"
sleep 2
"$SCRIPT_DIR/start-services.sh"
