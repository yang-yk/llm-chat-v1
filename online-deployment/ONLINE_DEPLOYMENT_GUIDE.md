# LLM Chat 在线部署指南

本指南详细说明如何在有网络环境下快速部署 LLM Chat 系统。

## 📋 目录

- [环境要求](#环境要求)
- [快速开始](#快速开始)
- [详细步骤](#详细步骤)
- [配置说明](#配置说明)
- [常用命令](#常用命令)
- [故障排查](#故障排查)
- [升级维护](#升级维护)

## 🔧 环境要求

### 硬件要求
- **CPU**: 2核或以上
- **内存**: 4GB 或以上
- **磁盘**: 至少 5GB 可用空间

### 软件要求
- **操作系统**: Linux (推荐 Ubuntu 20.04+, CentOS 7+)
- **网络**: 需要连接互联网（下载依赖和镜像）
- **权限**: sudo 权限（用于安装 Docker）

### 可选要求
- **Git**: 用于从仓库克隆代码
- **Docker**: 如已安装可跳过安装步骤

## 🚀 快速开始

### 方式一：使用部署脚本（推荐）

```bash
# 1. 下载部署脚本
wget https://your-repo/online-deploy.sh
# 或者从项目获取
cp /path/to/online-deployment/online-deploy.sh .

# 2. 添加执行权限
chmod +x online-deploy.sh

# 3. 运行部署脚本
bash online-deploy.sh
```

### 方式二：手动部署

详见 [详细步骤](#详细步骤) 章节。

## 📝 详细步骤

### 步骤 1: 安装 Docker

#### Ubuntu/Debian
```bash
# 安装 Docker
curl -fsSL https://get.docker.com | bash

# 将当前用户添加到 docker 组
sudo usermod -aG docker $USER

# 启动 Docker
sudo systemctl start docker
sudo systemctl enable docker

# 验证安装
docker --version
```

#### CentOS/RHEL
```bash
# 安装 Docker
curl -fsSL https://get.docker.com | bash

# 启动 Docker
sudo systemctl start docker
sudo systemctl enable docker

# 验证安装
docker --version
```

### 步骤 2: 安装 Docker Compose

```bash
# Ubuntu/Debian
sudo apt-get update
sudo apt-get install -y docker-compose-plugin

# 验证安装
docker compose version
```

### 步骤 3: 获取项目源码

#### 从 Git 仓库
```bash
git clone https://github.com/your-repo/llm-chat.git /opt/llm-chat
cd /opt/llm-chat
```

#### 从本地复制
```bash
cp -r /path/to/llm-chat-v1 /opt/llm-chat
cd /opt/llm-chat
```

### 步骤 4: 配置环境变量

创建并编辑配置文件：

#### docker-compose.yml
```yaml
version: '3.8'

services:
  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    container_name: llm-chat-backend
    network_mode: host
    environment:
      - LLM_API_URL=http://127.0.0.1:11553/v1/chat/completions
      - MODEL_NAME=glm4_32B_chat
      - API_KEY=your_api_key
      - PORT=8000
      - SECRET_KEY=your_secret_key
    volumes:
      - ./backend/db:/app/db
      - ./backend/logs:/app/logs
    restart: unless-stopped

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    container_name: llm-chat-frontend
    ports:
      - "3000:3000"
    environment:
      - NEXT_PUBLIC_API_URL=http://your_server_ip:8000
      - BACKEND_URL=http://172.17.0.1:8000
    restart: unless-stopped
    depends_on:
      - backend

  nginx:
    image: nginx:alpine
    container_name: llm-chat-nginx
    network_mode: host
    volumes:
      - ./nginx:/etc/nginx/conf.d
    restart: unless-stopped
    depends_on:
      - frontend
      - backend
```

#### nginx/default.conf
```nginx
server {
    listen 80;
    server_name _;

    client_max_body_size 50M;

    # API 请求转发到后端
    location /api/ {
        proxy_pass http://127.0.0.1:8000/api/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # SSE 支持
        proxy_buffering off;
        proxy_read_timeout 300s;
    }

    # 前端请求
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

#### frontend/.env.local
```bash
NEXT_PUBLIC_API_URL=http://your_server_ip:8000
BACKEND_URL=http://172.17.0.1:8000
```

### 步骤 5: 构建和启动

```bash
# 构建镜像
docker compose build

# 启动服务
docker compose up -d

# 查看服务状态
docker compose ps
```

### 步骤 6: 创建管理员账号

```bash
docker compose exec backend python -c "
from app.database import SessionLocal
from app.models import User
from app.auth import get_password_hash

db = SessionLocal()
try:
    admin_user = User(
        username='admin',
        hashed_password=get_password_hash('Admin@2025'),
        is_admin=True
    )
    db.add(admin_user)
    db.commit()
    print('管理员创建成功')
except Exception as e:
    print(f'错误: {e}')
finally:
    db.close()
"
```

### 步骤 7: 验证部署

```bash
# 检查容器状态
docker compose ps

# 查看日志
docker compose logs -f

# 测试访问
curl http://localhost:80
```

## ⚙️ 配置说明

### 环境变量

| 变量名 | 说明 | 默认值 | 必填 |
|--------|------|--------|------|
| `LLM_API_URL` | LLM 模型 API 地址 | http://127.0.0.1:11553/v1/chat/completions | 是 |
| `MODEL_NAME` | 模型名称 | glm4_32B_chat | 是 |
| `API_KEY` | 模型 API 密钥 | - | 是 |
| `PORT` | 后端端口 | 8000 | 否 |
| `SECRET_KEY` | JWT 密钥 | - | 是 |
| `NEXT_PUBLIC_API_URL` | 前端 API 地址 | - | 是 |
| `BACKEND_URL` | 容器内后端地址 | http://172.17.0.1:8000 | 是 |

### 端口配置

| 服务 | 默认端口 | 说明 |
|------|----------|------|
| Nginx | 80 | 主入口 |
| Frontend | 3000 | Next.js 应用 |
| Backend | 8000 | FastAPI 后端 |

### 网络架构

```
用户 → Nginx:80 → 前端:3000 ┐
                 ↓           ↓
              后端:8000 → LLM模型
```

- **Nginx**: host 网络模式，监听 80 端口
- **Backend**: host 网络模式，访问本地 LLM 服务
- **Frontend**: bridge 网络，通过 172.17.0.1 访问后端

## 📝 常用命令

### 服务管理
```bash
# 启动服务
docker compose up -d

# 停止服务
docker compose down

# 重启服务
docker compose restart

# 查看服务状态
docker compose ps

# 查看日志
docker compose logs -f

# 查看特定服务日志
docker compose logs -f backend
docker compose logs -f frontend
```

### 数据备份
```bash
# 备份数据库
docker compose exec backend cp /app/db/conversation.db /tmp/backup.db
docker compose cp backend:/tmp/backup.db ./backup-$(date +%Y%m%d).db

# 恢复数据库
docker compose cp ./backup-20251005.db backend:/tmp/restore.db
docker compose exec backend cp /tmp/restore.db /app/db/conversation.db
docker compose restart backend
```

### 更新部署
```bash
# 拉取最新代码
git pull

# 重新构建镜像
docker compose build

# 重启服务
docker compose down
docker compose up -d
```

## 🐛 故障排查

### 容器无法启动

```bash
# 查看详细错误
docker compose logs backend
docker compose logs frontend

# 检查端口占用
netstat -tulpn | grep -E '80|3000|8000'

# 检查磁盘空间
df -h
```

### 前端无法连接后端

```bash
# 检查后端是否运行
docker compose ps backend

# 测试后端 API
curl http://localhost:8000/api/health

# 检查前端环境变量
docker compose exec frontend env | grep API_URL

# 检查 Nginx 配置
docker compose exec nginx cat /etc/nginx/conf.d/default.conf
```

### 无法访问服务

```bash
# 检查防火墙
sudo ufw status
sudo ufw allow 80/tcp

# 检查 Nginx
docker compose logs nginx

# 测试端口连通性
curl http://localhost:80
```

### LLM 模型连接失败

```bash
# 检查模型服务
curl http://127.0.0.1:11553/v1/models

# 检查后端日志
docker compose logs backend | grep -i "llm\|model\|api"

# 测试模型连接
docker compose exec backend python -c "
import requests
response = requests.get('http://127.0.0.1:11553/v1/models')
print(response.json())
"
```

### 数据库问题

```bash
# 检查数据库文件
docker compose exec backend ls -lh /app/db/

# 重置数据库
docker compose exec backend rm /app/db/conversation.db
docker compose restart backend
```

## 🔄 升级维护

### 升级系统

```bash
# 1. 备份数据
docker compose exec backend cp /app/db/conversation.db /tmp/backup.db
docker compose cp backend:/tmp/backup.db ./backup-$(date +%Y%m%d).db

# 2. 拉取最新代码
git pull

# 3. 重新构建
docker compose build

# 4. 停止旧服务
docker compose down

# 5. 启动新服务
docker compose up -d

# 6. 验证
docker compose ps
docker compose logs -f
```

### 清理旧镜像

```bash
# 查看镜像
docker images

# 删除无用镜像
docker image prune -a

# 清理构建缓存
docker builder prune -f
```

### 性能优化

```bash
# 查看资源使用
docker stats

# 限制容器资源
# 在 docker-compose.yml 中添加：
services:
  backend:
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 2G
```

## 🔒 安全建议

1. **修改默认密码**
   - 首次登录后立即修改管理员密码

2. **使用 HTTPS**
   ```bash
   # 安装 certbot
   sudo apt-get install certbot python3-certbot-nginx

   # 获取证书
   sudo certbot --nginx -d your-domain.com
   ```

3. **配置防火墙**
   ```bash
   sudo ufw enable
   sudo ufw allow 22/tcp
   sudo ufw allow 80/tcp
   sudo ufw allow 443/tcp
   ```

4. **定期备份**
   - 设置自动备份脚本
   - 备份到远程存储

5. **监控日志**
   ```bash
   # 设置日志轮转
   docker compose logs --tail=1000 > logs/app-$(date +%Y%m%d).log
   ```

## 📚 相关文档

- [项目主文档](../README.md)
- [离线部署指南](../offline-deployment/OFFLINE_DEPLOYMENT_GUIDE.md)
- [快速参考](../QUICK_REFERENCE.md)
- [故障排查](../TROUBLESHOOTING_FAILED_TO_FETCH.md)

## 🆘 获取帮助

1. 查看日志: `docker compose logs -f`
2. 检查服务状态: `docker compose ps`
3. 参考故障排查章节
4. 查看详细文档

---

**文档版本**: v1.0
**更新时间**: 2025-10-05
**适用系统**: Ubuntu 20.04+, CentOS 7+, Debian 10+
