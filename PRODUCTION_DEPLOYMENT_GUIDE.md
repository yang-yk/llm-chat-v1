# LLM Chat 生产环境部署完整指南

本文档提供完整的生产环境部署指南，包括详细步骤、常见问题解决方案以及不同服务器环境下的配置说明。

## 目录

- [系统要求](#系统要求)
- [部署前准备](#部署前准备)
- [快速部署步骤](#快速部署步骤)
- [详细配置说明](#详细配置说明)
- [常见问题与解决方案](#常见问题与解决方案)
- [不同环境下的配置调整](#不同环境下的配置调整)
- [安全配置建议](#安全配置建议)
- [维护与监控](#维护与监控)

---

## 系统要求

### 硬件要求
- **CPU**: 2核心及以上
- **内存**: 4GB 及以上（推荐 8GB）
- **磁盘**: 20GB 可用空间
- **网络**: 公网 IP 或域名（用于外部访问）

### 软件要求
- **操作系统**: Linux (Ubuntu 20.04+, CentOS 7+, Debian 10+)
- **Docker**: 20.10.0 或更高版本
- **Docker Compose**: V2（随 Docker 安装）
- **Git**: 用于拉取代码

---

## 部署前准备

### 1. 安装 Docker

```bash
# Ubuntu/Debian
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# 重新登录以使用户组生效
```

### 2. 配置 Docker 镜像源（中国大陆用户）

如果 Docker 官方镜像源访问缓慢或失败，需要配置国内镜像源：

```bash
# 创建或编辑 Docker 配置文件
sudo mkdir -p /etc/docker
sudo tee /etc/docker/daemon.json > /dev/null <<'EOF'
{
  "registry-mirrors": [
    "https://docker.1panel.live",
    "https://hub.rat.dev"
  ]
}
EOF

# 重启 Docker 服务
sudo systemctl daemon-reload
sudo systemctl restart docker
```

### 3. 克隆项目代码

```bash
git clone <your-repository-url>
cd llm-chat-v1
```

---

## 快速部署步骤

### 步骤 1: 配置环境变量

#### 1.1 后端配置（docker-compose.yml）

根据您的实际环境修改 `docker-compose.yml` 中的环境变量：

```yaml
services:
  backend:
    environment:
      # 1. 大模型 API 配置
      - LLM_API_URL=http://127.0.0.1:11553/v1/chat/completions  # 修改为您的模型服务地址
      - LLM_MODEL=glm4_32B_chat                                  # 修改为您的模型名称
      - LLM_API_KEY=glm432b                                      # 修改为您的 API Key

      # 2. 安全密钥配置（生产环境必须修改！）
      - SECRET_KEY=your-super-secret-key-here                    # 修改为随机字符串

      # 3. 服务端口（通常不需要修改）
      - HOST=0.0.0.0
      - PORT=8000
```

**如何生成安全的 SECRET_KEY：**

```bash
# 使用 openssl 生成随机密钥
openssl rand -hex 32
```

#### 1.2 前端配置（frontend/.env.local）

创建或修改 `frontend/.env.local` 文件：

```bash
# 将 YOUR_SERVER_IP 替换为您的服务器公网 IP 或域名
echo "NEXT_PUBLIC_API_URL=http://YOUR_SERVER_IP:8000" > frontend/.env.local
```

**示例：**
```bash
# 使用 IP 地址
echo "NEXT_PUBLIC_API_URL=http://111.19.168.151:8000" > frontend/.env.local

# 使用域名
echo "NEXT_PUBLIC_API_URL=http://chat.example.com:8000" > frontend/.env.local
```

#### 1.3 后端预设模型配置（可选）

如果需要配置多个模型，编辑 `backend/main.py` 中的 `PRESET_MODELS`：

```python
PRESET_MODELS = {
    "codegeex": {
        "name": "CodeGeex",
        "url": "http://127.0.0.1:11551/v1/chat/completions",  # 修改为实际地址
        "model": "codegeex4-all-9b",                           # 修改为实际模型名
        "key": "codegeex"                                       # 修改为实际 API Key
    },
    "glm": {
        "name": "GLM-4",
        "url": "http://127.0.0.1:11553/v1/chat/completions",  # 修改为实际地址
        "model": "glm4_32B_chat",                              # 修改为实际模型名
        "key": "glm432b"                                        # 修改为实际 API Key
    }
}
```

### 步骤 2: 创建必要的目录

```bash
# 创建前端 public 目录（避免构建错误）
mkdir -p frontend/public
```

### 步骤 3: 构建并启动服务

```bash
# 构建并启动所有服务
docker compose up -d --build

# 查看服务状态
docker compose ps

# 查看服务日志
docker compose logs -f
```

### 步骤 4: 验证部署

1. **检查服务状态**
   ```bash
   docker compose ps
   # 应该看到 backend 和 frontend 都是 Up 状态
   ```

2. **访问应用**
   - 前端页面: `http://YOUR_SERVER_IP:3000`
   - 后端 API 文档: `http://YOUR_SERVER_IP:8000/docs`

3. **测试注册和登录**
   - 访问 `http://YOUR_SERVER_IP:3000/auth`
   - 注册一个新账号并登录

### 步骤 5: 创建管理员账号

首次部署后，使用以下脚本创建管理员账号：

```bash
docker compose exec backend python3 << 'EOF'
from database import get_db, User
from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
db = next(get_db())

# 检查是否已存在 admin 用户
existing_admin = db.query(User).filter(User.username == "admin").first()
if existing_admin:
    print("管理员账号已存在")
else:
    # 创建管理员用户
    admin_user = User(
        username="admin",
        hashed_password=pwd_context.hash("Admin@2025"),  # 建议修改默认密码
        is_admin=True,
        is_active=True
    )
    db.add(admin_user)
    db.commit()
    print("管理员账号创建成功：用户名=admin, 密码=Admin@2025")
EOF
```

**重要提示**：登录后请立即修改管理员密码！

---

## 详细配置说明

### 必须修改的配置项

以下配置项在新服务器部署时**必须修改**：

| 配置项 | 配置文件 | 说明 | 示例 |
|--------|---------|------|------|
| `NEXT_PUBLIC_API_URL` | `frontend/.env.local` | 前端访问后端的地址 | `http://111.19.168.151:8000` |
| `SECRET_KEY` | `docker-compose.yml` | JWT 签名密钥（安全相关） | 使用 `openssl rand -hex 32` 生成 |
| `LLM_API_URL` | `docker-compose.yml` | 大模型 API 地址 | `http://127.0.0.1:11553/v1/chat/completions` |
| `LLM_MODEL` | `docker-compose.yml` | 大模型名称 | `glm4_32B_chat` |
| `LLM_API_KEY` | `docker-compose.yml` | 大模型 API 密钥 | `your-api-key` |

### 可选修改的配置项

| 配置项 | 配置文件 | 默认值 | 说明 |
|--------|---------|--------|------|
| `PORT` | `docker-compose.yml` | `8000` | 后端服务端口 |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | `docker-compose.yml` | `10080` (7天) | JWT Token 过期时间（分钟） |
| `frontend ports` | `docker-compose.yml` | `3000:3000` | 前端服务端口映射 |
| `PRESET_MODELS` | `backend/main.py` | 见代码 | 预设的多个模型配置 |

---

## 常见问题与解决方案

### 问题 1: Docker 镜像拉取失败

**错误信息：**
```
failed to do request: Head "https://docker.mirrors.ustc.edu.cn/...": dial tcp: lookup docker.mirrors.ustc.edu.cn: no such host
```

**解决方案：**
配置有效的 Docker 镜像源（参考"部署前准备"章节）

---

### 问题 2: 前端构建时找不到 public 目录

**错误信息：**
```
ERROR: failed to calculate checksum of ref: "/app/public": not found
```

**解决方案：**
```bash
mkdir -p frontend/public
```

---

### 问题 3: SQLite 数据库权限错误

**错误信息：**
```
sqlalchemy.exc.OperationalError: (sqlite3.OperationalError) unable to open database file
```

**解决方案：**
确保使用 Docker 命名卷而非文件挂载：

```yaml
volumes:
  - backend-db:/app/db  # 正确：使用命名卷
  # - ./data/db:/app/db  # 错误：可能导致权限问题
```

---

### 问题 4: 前端访问后端报 "Failed to Fetch" 或 ERR_CONNECTION_RESET

**原因分析：**
- 前端 `.env.local` 配置了内网 IP，但浏览器在公网访问
- 前端配置的 API URL 不可达

**解决方案：**
1. 检查 `frontend/.env.local` 中的 `NEXT_PUBLIC_API_URL`
2. 确保使用服务器的**公网 IP** 或**域名**
3. 重新构建前端容器：
   ```bash
   docker compose stop frontend
   docker compose rm -f frontend
   docker rmi llm-chat-v1-frontend
   docker compose up -d --build frontend
   ```

---

### 问题 5: 模型无响应或超时

**错误信息：**
```
[STREAM ERROR] 模型响应超时，请检查网络连接或稍后重试
```

**原因分析：**
- Docker 容器无法访问宿主机的本地模型服务
- 模型服务未启动或端口不正确

**解决方案：**

#### 方案 A: 使用 host 网络模式（当前方案）

```yaml
backend:
  network_mode: host
  environment:
    - LLM_API_URL=http://127.0.0.1:11553/v1/chat/completions  # 使用 localhost
```

#### 方案 B: 配置模型服务监听所有网络接口

如果模型服务配置为只监听 `127.0.0.1`，修改为监听 `0.0.0.0`，然后在 docker-compose.yml 中使用宿主机 IP：

```yaml
backend:
  environment:
    - LLM_API_URL=http://宿主机IP:11553/v1/chat/completions
```

---

### 问题 6: 注册后直接进入系统而非显示成功提示

**解决方案：**
已在最新版本修复，确保前端代码为最新版本并重新构建。

---

### 问题 7: Nginx 502 Bad Gateway

**原因：**
在使用 `network_mode: host` 时，Nginx 和 backend 网络配置冲突。

**解决方案：**
当前部署方案已移除 Nginx，直接访问前后端端口：
- 前端: `http://SERVER_IP:3000`
- 后端: `http://SERVER_IP:8000`

如需使用 Nginx，请参考独立的 Nginx 配置文档。

---

## 不同环境下的配置调整

### 场景 1: 使用远程大模型 API（如 OpenAI、智谱 AI 等）

**修改 `docker-compose.yml`：**

```yaml
backend:
  network_mode: bridge  # 改为 bridge 网络
  environment:
    - LLM_API_URL=https://api.openai.com/v1/chat/completions  # 远程 API 地址
    - LLM_MODEL=gpt-4
    - LLM_API_KEY=sk-xxxxxxxxxxxx  # 您的 API Key
```

**修改 `frontend/.env.local`：**

```bash
NEXT_PUBLIC_API_URL=http://YOUR_SERVER_IP:8000
```

---

### 场景 2: 使用域名访问

**前置条件：**
- 已有域名并指向服务器 IP
- 建议配置 SSL 证书（HTTPS）

**修改 `frontend/.env.local`：**

```bash
# HTTP 访问
NEXT_PUBLIC_API_URL=http://chat.example.com:8000

# HTTPS 访问（推荐）
NEXT_PUBLIC_API_URL=https://api.chat.example.com
```

**配置 Nginx 反向代理（推荐）：**

```nginx
server {
    listen 80;
    server_name chat.example.com;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}

server {
    listen 80;
    server_name api.chat.example.com;

    location / {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

---

### 场景 3: 多个服务器环境（开发/测试/生产）

**建议使用环境变量文件：**

创建不同的配置文件：
- `.env.development`
- `.env.staging`
- `.env.production`

**示例 `.env.production`：**

```bash
# 服务器配置
SERVER_IP=111.19.168.151

# 大模型配置
LLM_API_URL=http://127.0.0.1:11553/v1/chat/completions
LLM_MODEL=glm4_32B_chat
LLM_API_KEY=production-api-key

# 安全配置
SECRET_KEY=production-secret-key-xyz123456789
```

**部署时指定环境：**

```bash
# 加载环境变量
set -a
source .env.production
set +a

# 替换配置
envsubst < docker-compose.yml.template > docker-compose.yml
echo "NEXT_PUBLIC_API_URL=http://${SERVER_IP}:8000" > frontend/.env.local

# 启动服务
docker compose up -d --build
```

---

### 场景 4: 仅修改服务器 IP 地址

假设从 `111.19.168.151` 迁移到 `192.168.1.100`：

**步骤：**

```bash
# 1. 更新前端配置
echo "NEXT_PUBLIC_API_URL=http://192.168.1.100:8000" > frontend/.env.local

# 2. 重新构建前端
docker compose stop frontend
docker compose rm -f frontend
docker rmi llm-chat-v1-frontend
docker compose up -d --build frontend

# 3. 后端无需修改（使用 localhost）
```

---

## 安全配置建议

### 1. 修改默认密钥

```bash
# 生成新的 SECRET_KEY
openssl rand -hex 32
# 输出示例: a3f8c7e2b1d9f0e4a6b8c7d2e1f9a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0
```

将生成的密钥替换 `docker-compose.yml` 中的 `SECRET_KEY`。

### 2. 修改管理员密码

登录管理员账号后，访问个人设置修改密码（或在数据库中直接修改）。

### 3. 配置防火墙规则

```bash
# 仅开放必要端口
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS
sudo ufw allow 3000/tcp  # 前端（临时，生产环境建议通过 Nginx 代理）
sudo ufw allow 8000/tcp  # 后端（临时，生产环境建议通过 Nginx 代理）
sudo ufw enable
```

### 4. 启用 HTTPS

生产环境强烈建议使用 HTTPS：

```bash
# 安装 Certbot
sudo apt install certbot python3-certbot-nginx -y

# 获取 SSL 证书
sudo certbot --nginx -d chat.example.com
```

---

## 维护与监控

### 查看日志

```bash
# 查看所有服务日志
docker compose logs -f

# 查看指定服务日志
docker compose logs -f backend
docker compose logs -f frontend

# 查看最近 100 行日志
docker compose logs --tail=100 backend
```

### 备份数据库

```bash
# 备份数据库
docker run --rm -v llm-chat-v1_backend-db:/data -v $(pwd):/backup \
  alpine tar czf /backup/database-backup-$(date +%Y%m%d).tar.gz -C /data .

# 恢复数据库
docker run --rm -v llm-chat-v1_backend-db:/data -v $(pwd):/backup \
  alpine tar xzf /backup/database-backup-YYYYMMDD.tar.gz -C /data
```

### 更新应用

```bash
# 拉取最新代码
git pull

# 重新构建并启动
docker compose down
docker compose up -d --build

# 清理旧镜像（可选）
docker image prune -a -f
```

### 重启服务

```bash
# 重启所有服务
docker compose restart

# 重启指定服务
docker compose restart backend
docker compose restart frontend
```

### 停止服务

```bash
# 停止服务但保留数据
docker compose down

# 停止服务并删除数据卷（危险！）
docker compose down -v
```

---

## 部署检查清单

部署前请确认以下事项：

- [ ] 已安装 Docker 和 Docker Compose
- [ ] 已配置 Docker 镜像源（中国大陆）
- [ ] 已修改 `frontend/.env.local` 中的 `NEXT_PUBLIC_API_URL`
- [ ] 已修改 `docker-compose.yml` 中的 `SECRET_KEY`
- [ ] 已配置正确的大模型 API 地址和密钥
- [ ] 已创建 `frontend/public` 目录
- [ ] 已运行 `docker compose up -d --build`
- [ ] 已创建管理员账号
- [ ] 已测试注册、登录功能
- [ ] 已测试对话功能和模型响应
- [ ] 已配置防火墙规则
- [ ] 已设置定期备份计划
- [ ] 已修改管理员默认密码

---

## 快速参考

### 一键部署命令（适用于新服务器）

```bash
# 1. 克隆项目
git clone <repository-url>
cd llm-chat-v1

# 2. 配置前端环境变量（修改为实际 IP）
echo "NEXT_PUBLIC_API_URL=http://YOUR_SERVER_IP:8000" > frontend/.env.local

# 3. 修改 docker-compose.yml 中的配置
# 编辑以下内容：
# - SECRET_KEY
# - LLM_API_URL
# - LLM_MODEL
# - LLM_API_KEY

# 4. 创建必要目录
mkdir -p frontend/public

# 5. 启动服务
docker compose up -d --build

# 6. 创建管理员账号（可选）
docker compose exec backend python3 << 'EOF'
from database import get_db, User
from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
db = next(get_db())

admin_user = User(
    username="admin",
    hashed_password=pwd_context.hash("Admin@2025"),
    is_admin=True,
    is_active=True
)
db.add(admin_user)
db.commit()
print("管理员账号创建成功")
EOF

# 7. 验证部署
curl http://localhost:8000/docs
curl http://localhost:3000
```

### 常用维护命令

```bash
# 查看服务状态
docker compose ps

# 查看日志
docker compose logs -f

# 重启服务
docker compose restart

# 更新应用
git pull && docker compose up -d --build

# 备份数据库
docker run --rm -v llm-chat-v1_backend-db:/data -v $(pwd):/backup \
  alpine tar czf /backup/db-backup-$(date +%Y%m%d).tar.gz -C /data .
```

---

## 技术支持

如遇到问题，请检查：
1. 本文档的"常见问题与解决方案"章节
2. 项目的 GitHub Issues
3. 服务日志 `docker compose logs`

---

**最后更新**: 2025-10-04
**版本**: v1.0
