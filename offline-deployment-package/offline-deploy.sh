#!/bin/bash

# LLM Chat 离线部署脚本 v2.0
# 用于在无网络环境下部署应用
# 支持灵活配置 IP 和端口

set -e

echo "=========================================="
echo "  LLM Chat 离线部署脚本 v2.0"
echo "=========================================="
echo ""

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 检查是否为 root 用户
if [ "$EUID" -ne 0 ] && ! groups | grep -q docker; then
    echo -e "${YELLOW}警告: 当前用户不在 docker 组中，某些操作可能需要 sudo${NC}"
fi

# 步骤 1: 检查 Docker 是否已安装
echo -e "${GREEN}[步骤 1/7]${NC} 检查 Docker 环境..."
if ! command -v docker &> /dev/null; then
    echo -e "${RED}错误: Docker 未安装！${NC}"
    echo "请先运行: bash install-docker-offline.sh"
    echo "或参考: OFFLINE_DEPLOYMENT_GUIDE.md"
    exit 1
fi

if ! docker info &> /dev/null; then
    echo -e "${RED}错误: Docker 服务未启动！${NC}"
    echo "请运行: sudo systemctl start docker"
    exit 1
fi

echo -e "${GREEN}✓${NC} Docker 环境检查通过"
echo "  Docker 版本: $(docker --version)"
echo ""

# 步骤 2: 配置部署参数
echo -e "${GREEN}[步骤 2/7]${NC} 配置部署参数..."
echo ""
echo -e "${BLUE}请根据您的实际环境填写以下配置信息：${NC}"
echo ""

# 2.1 服务器 IP/域名
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "1. 服务器访问地址配置"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "请输入服务器的 IP 地址或域名（用户通过此地址访问服务）"
echo "示例: 192.168.1.100, 10.0.0.50, example.com"
read -p "服务器地址: " SERVER_IP

if [ -z "$SERVER_IP" ]; then
    echo -e "${RED}错误: 服务器地址不能为空${NC}"
    exit 1
fi

# 2.2 端口配置
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "2. 端口配置"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "配置服务监听的端口（如果端口被占用，请修改）"
echo ""

read -p "Nginx 端口 (默认 80): " NGINX_PORT
NGINX_PORT=${NGINX_PORT:-80}

read -p "前端端口 (默认 3000): " FRONTEND_PORT
FRONTEND_PORT=${FRONTEND_PORT:-3000}

read -p "后端 API 端口 (默认 8000): " BACKEND_PORT
BACKEND_PORT=${BACKEND_PORT:-8000}

echo ""
echo -e "${GREEN}端口配置:${NC}"
echo "  Nginx:   ${NGINX_PORT}"
echo "  前端:    ${FRONTEND_PORT}"
echo "  后端:    ${BACKEND_PORT}"

# 2.3 部署目录
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "3. 部署目录配置"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
read -p "项目部署目录 (默认 /opt/llm-chat): " DEPLOY_BASE
DEPLOY_BASE=${DEPLOY_BASE:-/opt/llm-chat}

if [ ! -d "$(dirname "$DEPLOY_BASE")" ]; then
    echo -e "${RED}错误: 父目录 $(dirname "$DEPLOY_BASE") 不存在${NC}"
    exit 1
fi

# 2.4 大模型 API 配置
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "4. 大模型 API 配置"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "配置后端连接的大语言模型服务"
echo ""

read -p "模型 API 地址 (默认 http://127.0.0.1:11553/v1/chat/completions): " LLM_API_URL
LLM_API_URL=${LLM_API_URL:-http://127.0.0.1:11553/v1/chat/completions}

read -p "模型名称 (默认 glm4_32B_chat): " LLM_MODEL
LLM_MODEL=${LLM_MODEL:-glm4_32B_chat}

read -p "模型 API Key (默认 glm432b): " LLM_API_KEY
LLM_API_KEY=${LLM_API_KEY:-glm432b}

# 2.5 管理员账号
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "5. 管理员账号配置"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

read -p "管理员用户名 (默认 admin): " ADMIN_USERNAME
ADMIN_USERNAME=${ADMIN_USERNAME:-admin}

read -sp "管理员密码 (默认 Admin@2025): " ADMIN_PASSWORD
echo ""
ADMIN_PASSWORD=${ADMIN_PASSWORD:-Admin@2025}

# 生成随机 SECRET_KEY
SECRET_KEY=$(openssl rand -hex 32 2>/dev/null || echo "change-this-secret-key-$(date +%s)")

echo ""
echo -e "${GREEN}配置汇总:${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "服务器地址: ${SERVER_IP}"
echo "Nginx 端口: ${NGINX_PORT}"
echo "前端端口:   ${FRONTEND_PORT}"
echo "后端端口:   ${BACKEND_PORT}"
echo "部署目录:   ${DEPLOY_BASE}"
echo "模型 API:   ${LLM_API_URL}"
echo "管理员:     ${ADMIN_USERNAME}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
read -p "确认以上配置是否正确? (Y/n): " CONFIRM
CONFIRM=${CONFIRM:-Y}

if [[ ! "$CONFIRM" =~ ^[Yy]$ ]]; then
    echo "部署已取消"
    exit 0
fi

echo ""

# 步骤 3: 解压项目源码
echo -e "${GREEN}[步骤 3/7]${NC} 解压项目源码..."
if [ ! -f "project-source.tar.gz" ]; then
    echo -e "${RED}错误: 找不到 project-source.tar.gz${NC}"
    exit 1
fi

# 创建部署目录
mkdir -p "$DEPLOY_BASE"
tar xzf project-source.tar.gz -C "$DEPLOY_BASE"
echo -e "${GREEN}✓${NC} 项目源码已解压到: $DEPLOY_BASE"
echo ""

# 步骤 4: 加载 Docker 镜像
echo -e "${GREEN}[步骤 4/7]${NC} 加载 Docker 镜像..."
if [ ! -f "llm-chat-images.tar" ]; then
    echo -e "${RED}错误: 找不到 llm-chat-images.tar${NC}"
    exit 1
fi

echo "正在加载镜像（文件较大，请耐心等待）..."
docker load -i llm-chat-images.tar
echo -e "${GREEN}✓${NC} Docker 镜像加载完成"
echo ""

# 步骤 5: 配置文件修改
echo -e "${GREEN}[步骤 5/7]${NC} 生成配置文件..."
cd "$DEPLOY_BASE"

# 5.1 修改 docker-compose.yml
echo "正在配置 docker-compose.yml..."

cat > docker-compose.yml <<EOF
version: '3.8'

services:
  # 后端服务
  backend:
    image: llm-chat-v1-backend:latest
    container_name: llm-chat-backend
    network_mode: host
    environment:
      # 大模型API配置
      - LLM_API_URL=${LLM_API_URL}
      - LLM_MODEL=${LLM_MODEL}
      - LLM_API_KEY=${LLM_API_KEY}
      # 数据库配置
      - DATABASE_URL=sqlite:////app/db/conversation.db
      # JWT 配置
      - SECRET_KEY=${SECRET_KEY}
      - ALGORITHM=HS256
      - ACCESS_TOKEN_EXPIRE_MINUTES=10080
      # 服务器配置
      - HOST=0.0.0.0
      - PORT=${BACKEND_PORT}
    volumes:
      - backend-db:/app/db
      - backend-logs:/app/logs
    restart: unless-stopped

  # 前端服务
  frontend:
    image: llm-chat-v1-frontend:latest
    container_name: llm-chat-frontend
    ports:
      - "${FRONTEND_PORT}:3000"
    environment:
      - NEXT_PUBLIC_API_URL=http://${SERVER_IP}:${BACKEND_PORT}
      - BACKEND_URL=http://172.17.0.1:${BACKEND_PORT}
    depends_on:
      - backend
    restart: unless-stopped
    networks:
      - llm-chat-network

  # Nginx 反向代理
  nginx:
    image: nginx:alpine
    container_name: llm-chat-nginx
    network_mode: host
    volumes:
      - ./nginx/default.conf:/etc/nginx/conf.d/default.conf
    depends_on:
      - backend
      - frontend
    restart: unless-stopped

networks:
  llm-chat-network:
    driver: bridge

volumes:
  backend-db:
  backend-logs:
EOF

echo -e "${GREEN}✓${NC} docker-compose.yml 配置完成"

# 5.2 生成 Nginx 配置
echo "正在配置 Nginx..."
mkdir -p nginx

cat > nginx/default.conf <<EOF
server {
    listen ${NGINX_PORT};
    server_name _;

    # 后端 API 路由
    location /api/ {
        proxy_pass http://127.0.0.1:${BACKEND_PORT}/api/;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;

        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # 对话相关接口
    location /conversations {
        proxy_pass http://127.0.0.1:${BACKEND_PORT}/conversations;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;

        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # 聊天接口（SSE 流式响应）
    location /chat {
        proxy_pass http://127.0.0.1:${BACKEND_PORT}/chat;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;

        # SSE 需要的配置
        proxy_buffering off;
        proxy_cache off;
        proxy_set_header Connection '';
        chunked_transfer_encoding off;

        proxy_connect_timeout 300s;
        proxy_send_timeout 300s;
        proxy_read_timeout 300s;
    }

    # 前端页面
    location / {
        proxy_pass http://127.0.0.1:${FRONTEND_PORT};
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
EOF

echo -e "${GREEN}✓${NC} Nginx 配置完成"

# 5.3 生成前端环境变量（备用）
mkdir -p frontend
cat > frontend/.env.local <<EOF
NEXT_PUBLIC_API_URL=http://${SERVER_IP}:${BACKEND_PORT}
BACKEND_URL=http://172.17.0.1:${BACKEND_PORT}
EOF

echo -e "${GREEN}✓${NC} 前端环境变量配置完成"
echo ""

# 步骤 6: 启动服务
echo -e "${GREEN}[步骤 6/7]${NC} 启动服务..."

echo "正在启动 Docker 容器..."
docker compose up -d

echo ""
echo "等待服务启动（15秒）..."
sleep 15

# 检查容器状态
echo ""
echo "检查容器状态："
docker compose ps

echo ""
echo -e "${GREEN}✓${NC} 服务启动完成"
echo ""

# 步骤 7: 创建管理员账号
echo -e "${GREEN}[步骤 7/7]${NC} 创建管理员账号..."

# 等待后端启动
echo "等待后端服务完全启动（10秒）..."
sleep 10

docker compose exec -T backend python3 << EOF
from database import get_db, User
from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
db = next(get_db())

# 检查是否已存在
existing_admin = db.query(User).filter(User.username == "${ADMIN_USERNAME}").first()
if existing_admin:
    print("管理员账号已存在")
else:
    admin_user = User(
        username="${ADMIN_USERNAME}",
        hashed_password=pwd_context.hash("${ADMIN_PASSWORD}"),
        is_admin=True,
        is_active=True
    )
    db.add(admin_user)
    db.commit()
    print("✓ 管理员账号创建成功")
EOF

echo ""
echo "=========================================="
echo -e "${GREEN}  部署完成！${NC}"
echo "=========================================="
echo ""
echo -e "${BLUE}访问地址：${NC}"
echo "  主页（通过 Nginx）:  http://${SERVER_IP}:${NGINX_PORT}"
echo "  前端（直接访问）:    http://${SERVER_IP}:${FRONTEND_PORT}"
echo "  后端 API 文档:       http://${SERVER_IP}:${BACKEND_PORT}/docs"
echo "  管理后台:            http://${SERVER_IP}:${NGINX_PORT}/admin"
echo ""
echo -e "${BLUE}管理员凭证：${NC}"
echo "  用户名: ${ADMIN_USERNAME}"
echo "  密码:   ${ADMIN_PASSWORD}"
echo ""
echo -e "${BLUE}项目信息：${NC}"
echo "  部署目录: ${DEPLOY_BASE}"
echo "  配置文件: ${DEPLOY_BASE}/docker-compose.yml"
echo "  Nginx 配置: ${DEPLOY_BASE}/nginx/default.conf"
echo ""
echo -e "${BLUE}常用命令：${NC}"
echo "  查看日志:   cd ${DEPLOY_BASE} && docker compose logs -f"
echo "  查看状态:   cd ${DEPLOY_BASE} && docker compose ps"
echo "  重启服务:   cd ${DEPLOY_BASE} && docker compose restart"
echo "  停止服务:   cd ${DEPLOY_BASE} && docker compose down"
echo "  启动服务:   cd ${DEPLOY_BASE} && docker compose up -d"
echo ""
echo -e "${YELLOW}重要提示：${NC}"
echo "1. 请妥善保管 SECRET_KEY 和管理员密码"
echo "2. 建议定期备份数据库文件"
echo "3. 生产环境请修改默认管理员密码"
echo "4. 如需修改配置，请编辑 docker-compose.yml 后重启服务"
echo ""

# 保存部署信息
cat > "${DEPLOY_BASE}/deployment-info.txt" <<EOF
LLM Chat 部署信息
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

部署时间: $(date '+%Y-%m-%d %H:%M:%S')
部署目录: ${DEPLOY_BASE}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
服务器配置
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
服务器地址: ${SERVER_IP}
Nginx 端口: ${NGINX_PORT}
前端端口:   ${FRONTEND_PORT}
后端端口:   ${BACKEND_PORT}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
访问地址
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
主页:       http://${SERVER_IP}:${NGINX_PORT}
前端:       http://${SERVER_IP}:${FRONTEND_PORT}
后端 API:   http://${SERVER_IP}:${BACKEND_PORT}/docs
管理后台:   http://${SERVER_IP}:${NGINX_PORT}/admin

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
安全凭证（请妥善保管）
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SECRET_KEY:     ${SECRET_KEY}
管理员用户名:   ${ADMIN_USERNAME}
管理员密码:     ${ADMIN_PASSWORD}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
模型配置
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
API URL:    ${LLM_API_URL}
模型名称:   ${LLM_MODEL}
API Key:    ${LLM_API_KEY}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
常用命令
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
进入项目目录:
  cd ${DEPLOY_BASE}

查看服务状态:
  docker compose ps

查看日志:
  docker compose logs -f

重启服务:
  docker compose restart

停止服务:
  docker compose down

启动服务:
  docker compose up -d

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
数据备份
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
数据库位置（容器内）: /app/db/conversation.db
数据库 Volume: backend-db

备份命令:
  docker compose exec backend cp /app/db/conversation.db /tmp/backup.db
  docker compose cp backend:/tmp/backup.db ./backup-\$(date +%Y%m%d).db

恢复命令:
  docker compose cp ./backup.db backend:/tmp/restore.db
  docker compose exec backend cp /tmp/restore.db /app/db/conversation.db
  docker compose restart backend

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
EOF

echo -e "${GREEN}部署信息已保存到: ${DEPLOY_BASE}/deployment-info.txt${NC}"
echo ""
echo -e "${GREEN}部署脚本执行完毕！祝您使用愉快！${NC}"
echo ""
