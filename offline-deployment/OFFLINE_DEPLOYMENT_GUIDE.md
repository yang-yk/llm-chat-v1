# LLM Chat 离线部署完整指南

本文档提供在**无网络环境**下部署 LLM Chat 系统的完整指南。

## 目录

- [概述](#概述)
- [准备工作](#准备工作)
- [离线部署包内容](#离线部署包内容)
- [目标服务器要求](#目标服务器要求)
- [Docker 离线安装](#docker-离线安装)
- [部署步骤](#部署步骤)
- [验证部署](#验证部署)
- [常见问题](#常见问题)
- [维护操作](#维护操作)

---

## 概述

离线部署适用于以下场景：
- 目标服务器无法访问互联网
- 内网环境部署
- 需要在隔离网络中部署
- 对安全性有严格要求的环境

**部署流程概览：**
1. 在有网络的机器上准备离线部署包
2. 将离线部署包传输到目标服务器
3. 在目标服务器上安装 Docker（如果未安装）
4. 运行离线部署脚本完成部署

---

## 准备工作

### 在有网络的机器上准备离线部署包

离线部署包已经为您准备好，包含以下文件：

```
offline-deployment/
├── llm-chat-images.tar         # Docker 镜像文件（约 1.8GB）
├── project-source.tar.gz       # 项目源码
├── offline-deploy.sh           # 离线部署脚本
├── OFFLINE_DEPLOYMENT_GUIDE.md # 本文档
└── docker-offline-installer/   # Docker 离线安装包（需要手动下载）
```

### 将离线部署包传输到目标服务器

使用 U 盘、移动硬盘或内网文件传输工具，将整个 `offline-deployment` 目录复制到目标服务器。

**传输方式示例：**

```bash
# 方式 1: 使用 SCP（如果有临时网络连接）
scp -r offline-deployment/ user@target-server:/home/user/

# 方式 2: 使用 rsync
rsync -avz offline-deployment/ user@target-server:/home/user/offline-deployment/

# 方式 3: 物理介质
# 将 offline-deployment 目录复制到 U 盘，然后在目标服务器上复制回来
```

---

## 离线部署包内容

### 1. llm-chat-images.tar (约 1.8GB)

包含以下 Docker 镜像：
- `llm-chat-v1-backend:latest` - 后端服务镜像
- `llm-chat-v1-frontend:latest` - 前端服务镜像
- `nginx:alpine` - Nginx 镜像（可选）

### 2. project-source.tar.gz

包含项目源码：
- `backend/` - 后端代码
- `frontend/` - 前端代码
- `nginx/` - Nginx 配置
- `docker-compose.yml` - Docker Compose 配置文件
- 各种文档和脚本

### 3. offline-deploy.sh

自动化部署脚本，执行以下操作：
- 检查 Docker 环境
- 解压项目源码
- 加载 Docker 镜像
- 配置环境变量
- 启动服务
- 创建管理员账号

---

## 目标服务器要求

### 硬件要求
- **CPU**: 2核心及以上
- **内存**: 4GB 及以上（推荐 8GB）
- **磁盘**: 至少 10GB 可用空间（用于 Docker 镜像和数据）

### 操作系统要求
- **Linux**: Ubuntu 18.04+, CentOS 7+, Debian 10+
- **内核版本**: 3.10 或更高

### 软件要求
- **Docker**: 20.10.0 或更高版本
- **Docker Compose**: V2（随 Docker 安装）

---

## Docker 离线安装

如果目标服务器没有安装 Docker，需要先离线安装 Docker。

### 方式 1: 使用官方离线安装包（推荐）

#### 步骤 1: 在有网络的机器上下载 Docker

访问 Docker 官方下载页面：https://download.docker.com/linux/static/stable/

根据系统架构下载对应版本，例如：

```bash
# x86_64 架构
wget https://download.docker.com/linux/static/stable/x86_64/docker-24.0.7.tgz

# ARM64 架构
wget https://download.docker.com/linux/static/stable/aarch64/docker-24.0.7.tgz
```

#### 步骤 2: 创建安装脚本

在有网络的机器上创建 `install-docker-offline.sh`：

```bash
#!/bin/bash

# Docker 离线安装脚本

set -e

echo "开始安装 Docker..."

# 解压 Docker
tar xzvf docker-*.tgz

# 复制二进制文件到系统目录
sudo cp docker/* /usr/bin/

# 创建 Docker 服务文件
sudo tee /etc/systemd/system/docker.service > /dev/null <<'EOF'
[Unit]
Description=Docker Application Container Engine
Documentation=https://docs.docker.com
After=network-online.target firewalld.service
Wants=network-online.target

[Service]
Type=notify
ExecStart=/usr/bin/dockerd
ExecReload=/bin/kill -s HUP $MAINPID
LimitNOFILE=infinity
LimitNPROC=infinity
LimitCORE=infinity
TimeoutStartSec=0
Delegate=yes
KillMode=process
Restart=on-failure
StartLimitBurst=3
StartLimitInterval=60s

[Install]
WantedBy=multi-user.target
EOF

# 创建 docker 组
sudo groupadd docker || true

# 将当前用户添加到 docker 组
sudo usermod -aG docker $USER

# 启动 Docker
sudo systemctl daemon-reload
sudo systemctl enable docker
sudo systemctl start docker

echo "Docker 安装完成！"
echo "请运行 'docker --version' 验证安装"
echo "如果遇到权限问题，请重新登录或运行: newgrp docker"
EOF

chmod +x install-docker-offline.sh
```

#### 步骤 3: 在目标服务器上安装

将 `docker-*.tgz` 和 `install-docker-offline.sh` 复制到目标服务器，然后运行：

```bash
sudo ./install-docker-offline.sh
```

#### 步骤 4: 验证安装

```bash
docker --version
docker info
```

### 方式 2: 使用系统包管理器离线安装

#### Ubuntu/Debian

**在有网络的机器上下载包：**

```bash
# 下载 Docker 及其依赖
mkdir docker-offline-deb
cd docker-offline-deb

apt-get download docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# 下载依赖包
apt-get download libltdl7 pigz
```

**在目标服务器上安装：**

```bash
sudo dpkg -i *.deb
```

#### CentOS/RHEL

**在有网络的机器上下载包：**

```bash
# 添加 Docker 仓库
sudo yum-config-manager --add-repo https://download.docker.com/linux/centos/docker-ce.repo

# 下载 Docker 及其依赖
mkdir docker-offline-rpm
cd docker-offline-rpm

yumdownloader --resolve docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
```

**在目标服务器上安装：**

```bash
sudo rpm -ivh *.rpm
sudo systemctl start docker
sudo systemctl enable docker
```

---

## 部署步骤

### 快速部署（推荐）

在目标服务器上，进入离线部署包目录并运行部署脚本：

```bash
cd /path/to/offline-deployment
sudo ./offline-deploy.sh
```

脚本会交互式地引导您完成配置，包括：
- 服务器 IP 地址
- 大模型 API 配置
- 管理员账号设置

### 手动部署

如果您希望手动控制每个步骤，请按照以下说明操作：

#### 步骤 1: 解压项目源码

```bash
cd /path/to/offline-deployment
tar xzf project-source.tar.gz -C /opt/
cd /opt
```

#### 步骤 2: 加载 Docker 镜像

```bash
docker load -i /path/to/offline-deployment/llm-chat-images.tar
```

验证镜像加载：
```bash
docker images | grep llm-chat
```

应该看到：
```
llm-chat-v1-backend    latest    ...
llm-chat-v1-frontend   latest    ...
nginx                  alpine    ...
```

#### 步骤 3: 配置前端环境变量

创建 `frontend/.env.local` 文件：

```bash
# 替换为实际的服务器 IP 地址
cat > frontend/.env.local <<EOF
NEXT_PUBLIC_API_URL=http://YOUR_SERVER_IP:8000
EOF
```

#### 步骤 4: 配置后端环境变量

编辑 `docker-compose.yml`，修改以下环境变量：

```yaml
backend:
  environment:
    # 修改为实际的模型 API 地址
    - LLM_API_URL=http://127.0.0.1:11553/v1/chat/completions
    - LLM_MODEL=glm4_32B_chat
    - LLM_API_KEY=your-api-key

    # 生成新的安全密钥（重要！）
    - SECRET_KEY=your-random-secret-key-here
```

生成 SECRET_KEY：
```bash
openssl rand -hex 32
```

#### 步骤 5: 创建必要的目录

```bash
mkdir -p frontend/public
```

#### 步骤 6: 启动服务

```bash
docker compose up -d
```

#### 步骤 7: 检查服务状态

```bash
docker compose ps
docker compose logs -f
```

#### 步骤 8: 创建管理员账号

```bash
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
```

---

## 验证部署

### 1. 检查容器状态

```bash
docker compose ps
```

所有容器应该处于 `Up` 状态。

### 2. 检查服务端口

```bash
# 检查端口是否在监听
sudo netstat -tlnp | grep -E ':(3000|8000)'

# 或使用 ss 命令
sudo ss -tlnp | grep -E ':(3000|8000)'
```

应该看到：
```
0.0.0.0:3000  (frontend)
0.0.0.0:8000  (backend)
```

### 3. 访问应用

在浏览器中访问：
- **前端页面**: `http://SERVER_IP:3000`
- **后端 API 文档**: `http://SERVER_IP:8000/docs`
- **管理后台**: `http://SERVER_IP:3000/admin`

### 4. 测试功能

1. **注册新用户**：访问 `/auth` 页面注册账号
2. **登录系统**：使用注册的账号登录
3. **创建对话**：测试对话功能
4. **管理员登录**：使用管理员账号登录后台

---

## 常见问题

### 问题 1: Docker 镜像加载失败

**错误信息：**
```
Error response from daemon: error loading tar: open /var/lib/docker/tmp/...: no space left on device
```

**解决方案：**
检查磁盘空间，至少需要 5GB 可用空间：
```bash
df -h
```

清理不必要的文件或使用更大的磁盘。

---

### 问题 2: 容器无法启动

**错误信息：**
```
Error response from daemon: driver failed programming external connectivity
```

**解决方案：**
端口被占用，检查端口使用情况：
```bash
sudo netstat -tlnp | grep -E ':(3000|8000)'
```

停止占用端口的服务或修改 `docker-compose.yml` 中的端口映射。

---

### 问题 3: 前端无法访问后端

**症状：**
前端页面打开正常，但登录/注册时报错 "Failed to fetch"

**解决方案：**
检查 `frontend/.env.local` 中的 `NEXT_PUBLIC_API_URL` 配置是否正确：
```bash
cat frontend/.env.local
```

确保使用的是服务器的**实际 IP 地址**，而非 `localhost` 或 `127.0.0.1`。

修改后需要重新构建前端：
```bash
docker compose down
docker compose up -d --build frontend
```

---

### 问题 4: 模型无响应

**症状：**
可以发送消息，但模型一直无响应或超时

**原因分析：**
- 模型 API 地址配置错误
- 模型服务未启动
- 网络不通

**解决方案：**

1. 检查模型服务是否运行：
   ```bash
   curl http://127.0.0.1:11553/v1/models
   ```

2. 检查 `docker-compose.yml` 中的模型配置：
   ```bash
   grep LLM_API docker-compose.yml
   ```

3. 如果使用本地模型服务，确保使用 `network_mode: host`

---

### 问题 5: 权限不足

**错误信息：**
```
permission denied while trying to connect to the Docker daemon socket
```

**解决方案：**
将当前用户添加到 docker 组：
```bash
sudo usermod -aG docker $USER
newgrp docker
```

或使用 `sudo` 运行命令。

---

## 维护操作

### 查看日志

```bash
# 查看所有服务日志
docker compose logs -f

# 查看指定服务日志
docker compose logs -f backend
docker compose logs -f frontend

# 查看最近 100 行
docker compose logs --tail=100 backend
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

# 停止服务并删除数据（危险！）
docker compose down -v
```

### 备份数据

```bash
# 备份数据库
docker run --rm \
  -v llm-chat-v1_backend-db:/data \
  -v $(pwd):/backup \
  alpine tar czf /backup/database-backup-$(date +%Y%m%d).tar.gz -C /data .

# 备份日志
docker run --rm \
  -v llm-chat-v1_backend-logs:/logs \
  -v $(pwd):/backup \
  alpine tar czf /backup/logs-backup-$(date +%Y%m%d).tar.gz -C /logs .
```

### 恢复数据

```bash
# 恢复数据库
docker run --rm \
  -v llm-chat-v1_backend-db:/data \
  -v $(pwd):/backup \
  alpine tar xzf /backup/database-backup-YYYYMMDD.tar.gz -C /data
```

### 更新应用

如果有新版本的离线部署包：

```bash
# 1. 停止当前服务
docker compose down

# 2. 备份数据（重要！）
# 参考上面的备份操作

# 3. 加载新的镜像
docker load -i /path/to/new/llm-chat-images.tar

# 4. 解压新的源码
tar xzf /path/to/new/project-source.tar.gz -C /opt/

# 5. 重新启动服务
cd /opt
docker compose up -d
```

---

## 配置参考

### 必须修改的配置项

| 配置项 | 文件位置 | 说明 | 示例 |
|--------|---------|------|------|
| `NEXT_PUBLIC_API_URL` | `frontend/.env.local` | 前端访问后端的地址 | `http://192.168.1.100:8000` |
| `SECRET_KEY` | `docker-compose.yml` | JWT 签名密钥 | 使用 `openssl rand -hex 32` 生成 |
| `LLM_API_URL` | `docker-compose.yml` | 大模型 API 地址 | `http://127.0.0.1:11553/v1/chat/completions` |
| `LLM_MODEL` | `docker-compose.yml` | 模型名称 | `glm4_32B_chat` |
| `LLM_API_KEY` | `docker-compose.yml` | 模型 API 密钥 | `your-api-key` |

### 可选配置项

| 配置项 | 文件位置 | 默认值 | 说明 |
|--------|---------|--------|------|
| `PORT` | `docker-compose.yml` | `8000` | 后端服务端口 |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | `docker-compose.yml` | `10080` | Token 过期时间（分钟） |
| `frontend ports` | `docker-compose.yml` | `3000:3000` | 前端端口映射 |

---

## 安全建议

1. **修改默认密钥**：必须修改 `SECRET_KEY` 和管理员密码
2. **配置防火墙**：只开放必要的端口
3. **定期备份**：设置定时任务备份数据库
4. **日志监控**：定期检查日志文件
5. **及时更新**：关注安全更新并及时应用

---

## 部署检查清单

部署前请确认：

- [ ] 目标服务器满足硬件要求
- [ ] 已安装 Docker 并正常运行
- [ ] 离线部署包已完整传输到目标服务器
- [ ] 已修改 `frontend/.env.local` 中的服务器 IP
- [ ] 已修改 `docker-compose.yml` 中的 SECRET_KEY
- [ ] 已配置正确的模型 API 信息
- [ ] 已创建 `frontend/public` 目录
- [ ] 已运行部署脚本或手动完成所有步骤
- [ ] 已创建管理员账号
- [ ] 已测试前端访问
- [ ] 已测试后端 API
- [ ] 已测试对话功能
- [ ] 已备份部署配置信息

---

## 技术支持

如遇到问题：
1. 检查本文档的"常见问题"章节
2. 查看服务日志：`docker compose logs`
3. 检查容器状态：`docker compose ps`
4. 验证网络连接：`curl http://localhost:8000/docs`

---

## 附录

### A. 部署脚本执行示例

```bash
$ sudo ./offline-deploy.sh

==========================================
  LLM Chat 离线部署脚本
==========================================

[步骤 1/6] 检查 Docker 环境...
✓ Docker 环境检查通过

[步骤 2/6] 解压项目源码...
✓ 项目源码已解压到: /tmp/llm-chat-deploy-1234567890

[步骤 3/6] 加载 Docker 镜像...
正在加载镜像（文件较大，请耐心等待）...
✓ Docker 镜像加载完成

[步骤 4/6] 配置环境变量...
请输入服务器 IP 地址或域名 (例如: 192.168.1.100): 192.168.1.100
✓ 前端配置: NEXT_PUBLIC_API_URL=http://192.168.1.100:8000

配置大模型 API 信息：
模型 API 地址 (回车使用默认):
模型名称 (回车使用默认):
模型 API Key (回车使用默认):
✓ 后端配置已更新
✓ SECRET_KEY: a3f8c7e2b1d9f0e4a6b8c7d2e1f9a3b4...

[步骤 5/6] 启动服务...
正在启动 Docker 容器...
✓ 服务启动完成

[步骤 6/6] 创建管理员账号...
是否创建管理员账号? (Y/n): y
管理员用户名 (回车使用默认: admin):
管理员密码 (回车使用默认: Admin@2025):
✓ 管理员账号创建完成

==========================================
  部署完成！
==========================================

访问地址：
  前端页面: http://192.168.1.100:3000
  后端 API: http://192.168.1.100:8000/docs
  管理后台: http://192.168.1.100:3000/admin
```

### B. 文件清单

```
offline-deployment/
├── llm-chat-images.tar              # 1.8GB - Docker 镜像
├── project-source.tar.gz            # 约 5MB - 项目源码
├── offline-deploy.sh                # 自动部署脚本
├── OFFLINE_DEPLOYMENT_GUIDE.md      # 本文档
└── README.txt                       # 快速说明
```

---

**最后更新**: 2025-10-04
**版本**: v1.0
