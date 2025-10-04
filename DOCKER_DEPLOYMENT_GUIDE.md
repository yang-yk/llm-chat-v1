# Docker 部署完整教程

本文档记录了 LLM Chat System 的完整 Docker 部署过程及遇到的问题解决方案。

## 目录

- [环境要求](#环境要求)
- [快速开始](#快速开始)
- [详细部署步骤](#详细部署步骤)
- [常见问题及解决方案](#常见问题及解决方案)
- [访问和使用](#访问和使用)
- [维护管理](#维护管理)

---

## 环境要求

### 必需软件
- Docker 20.10+
- Docker Compose V2 (2.0+)
- Linux 操作系统（Ubuntu 20.04+ 推荐）

### 硬件要求
- CPU: 2 核心+
- 内存: 4GB+
- 磁盘: 10GB+ 可用空间

### 检查环境
```bash
# 检查 Docker 版本
docker --version

# 检查 Docker Compose 版本
docker compose version

# 检查 Docker 服务状态
sudo systemctl status docker
```

---

## 快速开始

如果你的环境已经配置好，可以使用以下命令快速部署：

```bash
# 1. 进入项目目录
cd /path/to/llm-chat-v1

# 2. 启动服务
docker compose up -d

# 3. 查看服务状态
docker compose ps

# 4. 查看日志
docker compose logs -f
```

访问地址：
- 前端: http://YOUR_SERVER_IP:3000
- 后端 API: http://YOUR_SERVER_IP:8000/docs

---

## 详细部署步骤

### 步骤 1: 配置 Docker 镜像源

#### 问题：国内无法访问 Docker Hub

**现象：**
```
failed to do request: Head "https://docker.mirrors.ustc.edu.cn/v2/library/python/manifests/3.9-slim":
dial tcp: lookup docker.mirrors.ustc.edu.cn on 127.0.0.53:53: no such host
```

**原因：**
- 默认 Docker Hub 在国内访问速度慢或无法访问
- 原有镜像源（如中科大镜像）已失效

**解决方案：**

1. 创建镜像源更新脚本（已提供 `update-docker-mirror.sh`）：
```bash
#!/bin/bash

echo "正在更新 Docker 镜像源配置..."

sudo tee /etc/docker/daemon.json > /dev/null <<'EOF'
{
    "registry-mirrors": [
        "https://docker.1panel.live",
        "https://hub.rat.dev"
    ],
    "runtimes": {
        "nvidia": {
            "args": [],
            "path": "nvidia-container-runtime"
        }
    }
}
EOF

echo "配置文件已更新"
echo "正在重启 Docker 服务..."

sudo systemctl restart docker

echo "Docker 服务已重启"
echo "镜像源配置完成！"
```

2. 执行脚本：
```bash
chmod +x update-docker-mirror.sh
./update-docker-mirror.sh
```

3. 验证配置：
```bash
# 查看 Docker 配置
cat /etc/docker/daemon.json

# 测试拉取镜像
docker pull hello-world
```

**其他可用镜像源：**
- 阿里云: `https://[your-id].mirror.aliyuncs.com` (需注册)
- 网易: `https://hub-mirror.c.163.com`
- 腾讯云: `https://mirror.ccs.tencentyun.com`

---

### 步骤 2: 配置 Docker Compose

#### 问题：Docker Compose 版本兼容性

**现象：**
```
错误: 未检测到 docker-compose
```

**原因：**
- 服务器安装的是 Docker Compose V2（集成在 docker 命令中）
- 旧版使用 `docker-compose`（连字符），新版使用 `docker compose`（空格）

**解决方案：**

项目已兼容两个版本，可以使用以下任一命令：

```bash
# V2 版本（推荐）
docker compose up -d

# V1 版本（如果安装了独立的 docker-compose）
docker-compose up -d
```

---

### 步骤 3: 处理前端构建问题

#### 问题：缺少 public 目录

**现象：**
```
ERROR: failed to calculate checksum of ref: "/app/public": not found
```

**原因：**
- Next.js 项目的 `public` 目录是可选的
- Dockerfile 中尝试复制不存在的目录

**解决方案：**

项目已创建空的 public 目录。如果遇到此问题：

```bash
# 创建 public 目录
mkdir -p frontend/public

# 重新构建
docker compose up -d --build
```

---

### 步骤 4: 解决数据库权限问题

#### 问题：SQLite 数据库文件无法创建

**现象：**
```
sqlalchemy.exc.OperationalError: (sqlite3.OperationalError) unable to open database file
```

**原因分析：**
1. 容器内应用无权限创建数据库文件
2. 卷挂载覆盖了应用代码或目录权限不正确
3. 数据库路径配置错误

**最终解决方案：**

使用 Docker 命名卷（named volume）而非绑定挂载：

1. **docker-compose.yml 配置：**
```yaml
services:
  backend:
    environment:
      - DATABASE_URL=sqlite:////app/db/conversation.db
    volumes:
      # 使用命名卷挂载数据库目录
      - backend-db:/app/db
      # 持久化日志
      - backend-logs:/app/logs

volumes:
  backend-db:
  backend-logs:
```

2. **Dockerfile 配置：**
```dockerfile
# 创建数据库目录并设置权限
RUN mkdir -p logs db && chmod 777 db
```

**为什么这样做：**
- 命名卷不会覆盖容器内的文件
- Docker 自动管理卷的权限
- 数据持久化且易于备份

**其他尝试过的方案（不推荐）：**

❌ 方案 1：直接挂载文件（失败）
```yaml
volumes:
  - ./backend/conversation.db:/app/conversation.db
```
问题：文件不存在时无法创建

❌ 方案 2：挂载整个 backend 目录（失败）
```yaml
volumes:
  - ./backend:/app/data
```
问题：覆盖了应用代码

✅ 方案 3：使用命名卷挂载独立目录（成功）
```yaml
volumes:
  - backend-db:/app/db
```

---

### 步骤 5: 启动服务

```bash
# 清理旧容器和卷（可选，首次部署跳过）
docker compose down -v

# 构建并启动
docker compose up -d --build

# 等待服务启动（约 10-15 秒）
sleep 10

# 检查服务状态
docker compose ps
```

**预期输出：**
```
NAME                IMAGE                  STATUS          PORTS
llm-chat-backend    llm-chat-v1-backend    Up 18 seconds   0.0.0.0:8000->8000/tcp
llm-chat-frontend   llm-chat-v1-frontend   Up 18 seconds   0.0.0.0:3000->3000/tcp
```

---

## 常见问题及解决方案

### 1. 容器不断重启

**检查方法：**
```bash
# 查看容器状态
docker compose ps

# 查看日志
docker compose logs backend
docker compose logs frontend
```

**可能原因及解决方案：**

#### 原因 1：后端启动失败
```bash
# 检查后端日志
docker compose logs backend --tail=50

# 常见错误：数据库连接失败
# 解决：检查 DATABASE_URL 环境变量配置
```

#### 原因 2：端口被占用
```bash
# 检查端口占用
netstat -tulpn | grep -E ':(3000|8000)'

# 解决：修改 docker-compose.override.yml 中的端口映射
```

#### 原因 3：内存不足
```bash
# 检查系统资源
free -h
df -h

# 解决：清理 Docker 资源
docker system prune -a
```

---

### 2. 前端无法连接后端

**现象：**
- 前端页面正常显示
- 调用 API 时报错 500 或连接超时

**检查步骤：**

1. **检查后端是否正常运行：**
```bash
# 测试后端健康检查
curl http://localhost:8000/api/health

# 预期输出
{"status":"ok","message":"大模型对话后端服务运行中","version":"1.0.0"}
```

2. **检查网络配置：**
```bash
# 查看 Docker 网络
docker network ls
docker network inspect llm-chat-v1_llm-chat-network
```

3. **检查环境变量：**
```bash
# 查看前端环境变量
docker compose exec frontend env | grep API

# 应该看到
NEXT_PUBLIC_API_URL=http://111.19.168.151:8000
```

**解决方案：**

修改 `docker-compose.override.yml`：
```yaml
services:
  frontend:
    environment:
      # 使用服务器外网 IP 或域名
      - NEXT_PUBLIC_API_URL=http://YOUR_SERVER_IP:8000
```

重启前端：
```bash
docker compose restart frontend
```

---

### 3. 权限问题

**现象：**
```
Permission denied
unable to open database file
```

**解决方案：**

#### 方法 1：使用 Docker 命名卷（推荐）
```yaml
volumes:
  - backend-db:/app/db  # 而非 ./backend:/app
```

#### 方法 2：修改宿主机文件权限
```bash
# 修改目录权限
sudo chown -R $USER:docker backend/
sudo chmod 755 backend/
```

#### 方法 3：在 Dockerfile 中设置权限
```dockerfile
RUN mkdir -p db && chmod 777 db
```

---

### 4. Docker 镜像拉取失败

**现象：**
```
Error response from daemon: Get https://registry-1.docker.io/v2/: net/http: TLS handshake timeout
```

**解决方案：**

1. **配置镜像源**（见步骤 1）

2. **使用代理：**
```bash
# 配置 Docker 代理
sudo mkdir -p /etc/systemd/system/docker.service.d
sudo tee /etc/systemd/system/docker.service.d/http-proxy.conf > /dev/null <<EOF
[Service]
Environment="HTTP_PROXY=http://proxy.example.com:8080"
Environment="HTTPS_PROXY=http://proxy.example.com:8080"
Environment="NO_PROXY=localhost,127.0.0.1"
EOF

sudo systemctl daemon-reload
sudo systemctl restart docker
```

3. **离线部署：**
```bash
# 在有网络的机器上导出镜像
docker save -o backend.tar llm-chat-v1-backend
docker save -o frontend.tar llm-chat-v1-frontend

# 在目标机器上导入
docker load -i backend.tar
docker load -i frontend.tar
```

---

### 5. 数据备份与恢复

#### 备份数据

```bash
# 方法 1：备份命名卷
docker run --rm -v llm-chat-v1_backend-db:/data -v $(pwd):/backup \
  ubuntu tar czf /backup/db-backup-$(date +%Y%m%d).tar.gz /data

# 方法 2：进入容器复制数据
docker compose exec backend cp /app/db/conversation.db /app/logs/
docker cp llm-chat-backend:/app/logs/conversation.db ./backup/
```

#### 恢复数据

```bash
# 停止服务
docker compose down

# 恢复数据到命名卷
docker run --rm -v llm-chat-v1_backend-db:/data -v $(pwd):/backup \
  ubuntu tar xzf /backup/db-backup-20251004.tar.gz -C /

# 重启服务
docker compose up -d
```

---

## 访问和使用

### 本地访问

```bash
# 前端
http://localhost:3000

# 后端 API 文档
http://localhost:8000/docs
```

### 局域网访问

```bash
# 获取服务器 IP
hostname -I | awk '{print $1}'

# 访问地址
http://YOUR_LOCAL_IP:3000
http://YOUR_LOCAL_IP:8000/docs
```

### 外网访问

#### 方法 1：直接访问（需要公网 IP）

```bash
# 开放防火墙端口
sudo ufw allow 3000/tcp
sudo ufw allow 8000/tcp
sudo ufw reload

# 访问
http://YOUR_PUBLIC_IP:3000
```

#### 方法 2：使用 Nginx 反向代理

1. **启用 Nginx 服务：**

取消 `docker-compose.yml` 中 Nginx 配置的注释：
```yaml
nginx:
  image: nginx:alpine
  container_name: llm-chat-nginx
  ports:
    - "80:80"
    - "443:443"
  volumes:
    - ./nginx/llm-chat.conf:/etc/nginx/conf.d/default.conf
    - ./nginx/ssl:/etc/nginx/ssl
  depends_on:
    - backend
    - frontend
  restart: unless-stopped
  networks:
    - llm-chat-network
```

2. **创建 Nginx 配置：**

```bash
mkdir -p nginx
```

创建 `nginx/llm-chat.conf`：
```nginx
upstream frontend {
    server frontend:3000;
}

upstream backend {
    server backend:8000;
}

server {
    listen 80;
    server_name your-domain.com;

    # 前端
    location / {
        proxy_pass http://frontend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # 后端 API
    location /api/ {
        proxy_pass http://backend/api/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # WebSocket 支持
    location /ws/ {
        proxy_pass http://backend/ws/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

3. **重启服务：**
```bash
docker compose up -d
```

4. **访问：**
```
http://your-domain.com
```

---

## 维护管理

### 常用命令

```bash
# 启动服务
docker compose up -d

# 停止服务
docker compose down

# 重启服务
docker compose restart

# 查看状态
docker compose ps

# 查看日志
docker compose logs -f
docker compose logs -f backend
docker compose logs -f frontend

# 进入容器
docker compose exec backend bash
docker compose exec frontend sh

# 查看资源占用
docker stats

# 清理未使用的资源
docker system prune -a
```

### 更新应用

```bash
# 1. 拉取最新代码
git pull

# 2. 重新构建镜像
docker compose build

# 3. 重启服务
docker compose down
docker compose up -d

# 4. 查看日志确认
docker compose logs -f
```

### 监控和日志

#### 实时监控
```bash
# 查看容器资源使用
docker stats llm-chat-backend llm-chat-frontend

# 查看实时日志
docker compose logs -f --tail=100
```

#### 日志管理
```bash
# 日志文件位置
# 后端日志：Docker 卷 backend-logs
# 前端日志：容器标准输出

# 导出日志
docker compose logs backend > backend.log
docker compose logs frontend > frontend.log

# 清理日志
docker compose down
docker volume rm llm-chat-v1_backend-logs
docker compose up -d
```

### 性能优化

#### 1. 限制容器资源
```yaml
services:
  backend:
    deploy:
      resources:
        limits:
          cpus: '2.0'
          memory: 2G
        reservations:
          cpus: '1.0'
          memory: 1G
```

#### 2. 优化镜像大小
```bash
# 使用多阶段构建
# 清理缓存和临时文件
# 使用 .dockerignore
```

#### 3. 使用容器编排
```bash
# 对于生产环境，建议使用：
# - Docker Swarm
# - Kubernetes
# - Portainer（可视化管理）
```

---

## 故障排查清单

遇到问题时，按以下顺序检查：

1. **检查 Docker 服务**
```bash
sudo systemctl status docker
```

2. **检查容器状态**
```bash
docker compose ps
```

3. **检查日志**
```bash
docker compose logs --tail=100
```

4. **检查网络**
```bash
docker network ls
curl http://localhost:8000/api/health
curl http://localhost:3000
```

5. **检查资源**
```bash
df -h
free -h
docker system df
```

6. **检查配置**
```bash
cat docker-compose.yml
cat docker-compose.override.yml
cat .env
```

---

## 总结

### 部署过程中遇到的主要问题

1. ✅ **Docker 镜像源问题** - 配置国内可用镜像源
2. ✅ **Docker Compose 版本兼容** - 支持 V1 和 V2
3. ✅ **前端 public 目录缺失** - 创建空目录
4. ✅ **数据库权限问题** - 使用 Docker 命名卷
5. ✅ **容器不断重启** - 修复数据库路径配置

### 关键配置要点

- 使用 Docker 命名卷而非绑定挂载
- 在 Dockerfile 中预创建目录并设置权限
- 配置正确的数据库路径
- 使用环境变量管理配置
- 启用容器自动重启策略

### 最佳实践

1. **定期备份数据**
2. **监控容器资源使用**
3. **使用日志轮转避免磁盘占满**
4. **配置健康检查**
5. **使用 Nginx 反向代理**
6. **启用 HTTPS**
7. **限制容器资源使用**

---

## 附录

### 项目文件结构

```
llm-chat-v1/
├── backend/
│   ├── Dockerfile
│   ├── requirements.txt
│   ├── main.py
│   └── ...
├── frontend/
│   ├── Dockerfile
│   ├── package.json
│   └── ...
├── nginx/
│   └── llm-chat.conf
├── docker-compose.yml
├── docker-compose.override.yml
├── .env
├── update-docker-mirror.sh
└── DOCKER_DEPLOYMENT_GUIDE.md
```

### 环境变量说明

**docker-compose.yml:**
```yaml
# 大模型配置
LLM_API_URL=http://111.19.168.151:11553/v1/chat/completions
LLM_MODEL=glm4_32B_chat
LLM_API_KEY=glm432b

# 数据库配置
DATABASE_URL=sqlite:////app/db/conversation.db

# JWT 配置
SECRET_KEY=${SECRET_KEY}
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=10080

# 服务器配置
HOST=0.0.0.0
PORT=8000
```

**docker-compose.override.yml:**
```yaml
# 后端配置
SECRET_KEY=<your-secret-key>

# 前端配置
NEXT_PUBLIC_API_URL=http://111.19.168.151:8000
```

### 相关文档

- [Docker 官方文档](https://docs.docker.com/)
- [Docker Compose 文档](https://docs.docker.com/compose/)
- [Next.js 文档](https://nextjs.org/docs)
- [FastAPI 文档](https://fastapi.tiangolo.com/)

---

**文档版本:** 1.0
**最后更新:** 2025-10-04
**维护者:** LLM Chat Team
