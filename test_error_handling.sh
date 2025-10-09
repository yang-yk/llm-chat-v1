#!/bin/bash

echo "=== 测试错误处理机制 ==="
echo ""

echo "1. 检查前端服务状态..."
ps aux | grep -E "next-server" | grep -v grep
echo ""

echo "2. 检查后端服务状态..."
ps aux | grep -E "python.*main.py|uvicorn" | grep -v grep
echo ""

echo "3. 检查 codegeex 服务状态 (11551端口)..."
curl -s http://127.0.0.1:11551/v1/models > /dev/null 2>&1
if [ $? -eq 0 ]; then
    echo "✓ CodeGeex 服务正常运行"
else
    echo "✗ CodeGeex 服务未运行 (这是预期的，用于测试错误处理)"
fi
echo ""

echo "4. 检查前端代码中的超时设置..."
grep -A 2 "设置总体请求超时时间" /home/data2/yangyk/llm-chat-v1/frontend/lib/api.ts | head -3
grep -A 2 "设置无数据接收超时时间" /home/data2/yangyk/llm-chat-v1/frontend/lib/api.ts | head -3
echo ""

echo "5. 检查前端构建时间..."
ls -lh /home/data2/yangyk/llm-chat-v1/frontend/.next/BUILD_ID 2>/dev/null || echo "未找到构建ID"
echo ""

echo "=== 测试完成 ==="
echo ""
echo "测试步骤："
echo "1. 确保 codegeex 服务停止"
echo "2. 在浏览器中打开前端 (按 Ctrl+Shift+R 强制刷新)"
echo "3. 发送一条消息"
echo "4. 应该在 15 秒内看到超时错误提示"
echo ""
echo "如果没有看到提示，请："
echo "- 打开浏览器开发者工具 (F12)"
echo "- 查看 Console 标签页的错误信息"
echo "- 查看 Network 标签页，找到 /chat 请求，查看响应"
