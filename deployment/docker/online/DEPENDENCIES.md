# LLM Chat 依赖清单

本文档列出 LLM Chat 系统的所有依赖包及版本信息。

## 📋 目录

- [系统要求](#系统要求)
- [后端依赖](#后端依赖)
- [前端依赖](#前端依赖)
- [Docker 镜像](#docker-镜像)
- [系统软件](#系统软件)
- [可选依赖](#可选依赖)

## 🔧 系统要求

### 操作系统
- **Ubuntu**: 20.04 LTS 或更高
- **CentOS**: 7.x 或更高
- **Debian**: 10 或更高
- **其他**: 任何支持 Docker 的 Linux 发行版

### 硬件要求
- **CPU**: 2核心或以上
- **内存**: 4GB RAM 或以上
- **磁盘**: 5GB 可用空间（用于代码和 Docker 镜像）

### 运行时环境
- **Python**: 3.9+ (用于后端)
- **Node.js**: 18+ (用于前端构建)
- **Docker**: 20.10+
- **Docker Compose**: 2.0+

## 🐍 后端依赖

### Python 版本
```
Python 3.9-slim (Docker 基础镜像)
```

### 核心依赖

| 包名 | 版本 | 说明 |
|------|------|------|
| `fastapi` | 0.115.5 | Web 框架 |
| `uvicorn` | 0.32.1 | ASGI 服务器 |
| `sqlalchemy` | 2.0.36 | ORM 框架 |
| `httpx` | 0.28.1 | HTTP 客户端（用于调用 LLM API） |
| `pydantic` | 2.10.3 | 数据验证 |

### 安全和认证

| 包名 | 版本 | 说明 |
|------|------|------|
| `passlib[bcrypt]` | 1.7.4 | 密码哈希 |
| `bcrypt` | 4.0.1 | 加密算法 |
| `python-jose[cryptography]` | 3.3.0 | JWT 处理 |

### 工具包

| 包名 | 版本 | 说明 |
|------|------|------|
| `python-dotenv` | 1.0.1 | 环境变量管理 |
| `python-multipart` | 0.0.9 | 表单数据处理 |

### 完整 requirements.txt

```txt
fastapi==0.115.5
uvicorn==0.32.1
sqlalchemy==2.0.36
httpx==0.28.1
pydantic==2.10.3
python-dotenv==1.0.1
passlib[bcrypt]==1.7.4
bcrypt==4.0.1
python-jose[cryptography]==3.3.0
python-multipart==0.0.9
```

### 系统依赖（编译时）

```bash
# Debian/Ubuntu
gcc
python3-dev
libssl-dev

# 这些依赖已包含在 Dockerfile 中
```

## ⚛️ 前端依赖

### Node.js 版本
```
Node.js 18-alpine (Docker 基础镜像)
```

### 核心框架

| 包名 | 版本 | 说明 |
|------|------|------|
| `next` | ^15.0.0 | React 框架 |
| `react` | ^18.3.1 | UI 库 |
| `react-dom` | ^18.3.1 | React DOM 渲染 |

### UI 和样式

| 包名 | 版本 | 说明 |
|------|------|------|
| `tailwindcss` | ^3.4.0 | CSS 框架 |
| `postcss` | ^8.4.0 | CSS 处理器 |
| `autoprefixer` | ^10.4.0 | CSS 自动前缀 |

### Markdown 渲染

| 包名 | 版本 | 说明 |
|------|------|------|
| `react-markdown` | ^10.1.0 | Markdown 组件 |
| `remark-gfm` | ^4.0.1 | GitHub 风格 Markdown |
| `rehype-highlight` | ^7.0.2 | 代码高亮插件 |
| `highlight.js` | ^11.9.0 | 语法高亮库 |

### 开发依赖

| 包名 | 版本 | 说明 |
|------|------|------|
| `typescript` | ^5.5.0 | TypeScript 编译器 |
| `@types/node` | ^22.0.0 | Node.js 类型定义 |
| `@types/react` | ^18.3.0 | React 类型定义 |
| `@types/react-dom` | ^18.3.0 | React DOM 类型定义 |

### 完整 package.json

```json
{
  "name": "llm-chat-frontend",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint"
  },
  "dependencies": {
    "highlight.js": "^11.9.0",
    "next": "^15.0.0",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "react-markdown": "^10.1.0",
    "rehype-highlight": "^7.0.2",
    "remark-gfm": "^4.0.1"
  },
  "devDependencies": {
    "@types/node": "^22.0.0",
    "@types/react": "^18.3.0",
    "@types/react-dom": "^18.3.0",
    "autoprefixer": "^10.4.0",
    "postcss": "^8.4.0",
    "tailwindcss": "^3.4.0",
    "typescript": "^5.5.0"
  }
}
```

## 🐳 Docker 镜像

### 基础镜像

| 镜像 | 版本/标签 | 用途 | 大小 |
|------|----------|------|------|
| `python` | 3.9-slim | 后端运行环境 | ~122MB |
| `node` | 18-alpine | 前端构建环境 | ~177MB |
| `nginx` | alpine | 反向代理 | ~41MB |

### 项目镜像

| 镜像 | 标签 | 说明 | 大小 |
|------|------|------|------|
| `llm-chat-v1-backend` | latest | 后端服务 | ~300MB |
| `llm-chat-v1-frontend` | latest | 前端服务 | ~450MB |
| `nginx` | alpine | Web 服务器 | ~41MB |

### Docker 镜像构建

```dockerfile
# 后端 Dockerfile
FROM python:3.9-slim
WORKDIR /app
RUN apt-get update && apt-get install -y gcc && rm -rf /var/lib/apt/lists/*
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
RUN mkdir -p logs db && chmod 777 db
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]

# 前端 Dockerfile (多阶段构建)
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:18-alpine AS runner
WORKDIR /app
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/node_modules ./node_modules
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs && \
    chown -R nextjs:nodejs /app
USER nextjs
EXPOSE 3000
CMD ["npm", "start"]
```

## 💻 系统软件

### 必需软件

| 软件 | 版本要求 | 安装方式 | 说明 |
|------|---------|---------|------|
| Docker | 20.10+ | `curl -fsSL https://get.docker.com \| bash` | 容器运行时 |
| Docker Compose | 2.0+ | `apt install docker-compose-plugin` | 容器编排 |
| Git | 2.0+ | `apt install git` | 版本控制（可选） |

### Docker 安装

#### Ubuntu/Debian
```bash
# 安装 Docker
curl -fsSL https://get.docker.com | bash
sudo usermod -aG docker $USER

# 安装 Docker Compose
sudo apt-get update
sudo apt-get install -y docker-compose-plugin

# 启动服务
sudo systemctl start docker
sudo systemctl enable docker
```

#### CentOS/RHEL
```bash
# 安装 Docker
curl -fsSL https://get.docker.com | bash

# 启动服务
sudo systemctl start docker
sudo systemctl enable docker

# 安装 Docker Compose
sudo yum install -y docker-compose-plugin
```

### 网络工具（调试用）

```bash
# Ubuntu/Debian
apt install net-tools curl wget

# CentOS/RHEL
yum install net-tools curl wget
```

## 🔌 可选依赖

### SSL/TLS 支持

```bash
# 用于 HTTPS 支持
sudo apt-get install certbot python3-certbot-nginx
```

### 监控工具

```bash
# Docker 监控
docker stats

# 系统监控
apt install htop iotop
```

### 日志管理

```bash
# 日志查看
apt install jq  # JSON 格式化
```

## 📦 依赖安装脚本

### 在线环境

```bash
#!/bin/bash
# install-dependencies.sh

# 安装 Docker
curl -fsSL https://get.docker.com | bash

# 安装 Docker Compose
sudo apt-get update
sudo apt-get install -y docker-compose-plugin

# 配置 Docker
sudo usermod -aG docker $USER
sudo systemctl start docker
sudo systemctl enable docker

# 安装工具
sudo apt-get install -y git curl wget net-tools

echo "依赖安装完成"
```

### 离线环境

参考 [离线部署指南](../llm-chat-v1/offline-deployment/OFFLINE_DEPLOYMENT_GUIDE.md)

## 🔄 依赖更新

### 更新 Python 包

```bash
# 查看过期包
pip list --outdated

# 更新单个包
pip install --upgrade fastapi

# 更新所有包
pip install --upgrade -r requirements.txt
```

### 更新 Node.js 包

```bash
# 查看过期包
npm outdated

# 更新单个包
npm update next

# 更新所有包
npm update
```

### 更新 Docker 镜像

```bash
# 拉取最新基础镜像
docker pull python:3.9-slim
docker pull node:18-alpine
docker pull nginx:alpine

# 重新构建项目镜像
docker compose build --no-cache
```

## 🔒 安全更新

### 检查安全漏洞

```bash
# Python 包安全检查
pip install safety
safety check -r requirements.txt

# Node.js 包安全检查
npm audit

# 修复已知漏洞
npm audit fix
```

### 最佳实践

1. **定期更新依赖**
   - 每月检查一次依赖更新
   - 及时修复安全漏洞

2. **版本锁定**
   - 生产环境使用固定版本
   - 测试新版本后再升级

3. **最小化依赖**
   - 只安装必需的包
   - 定期清理未使用的依赖

## 📊 依赖关系图

```
LLM Chat System
├── Backend (Python 3.9)
│   ├── FastAPI 0.115.5
│   │   ├── Uvicorn 0.32.1
│   │   └── Pydantic 2.10.3
│   ├── SQLAlchemy 2.0.36
│   ├── Authentication
│   │   ├── python-jose 3.3.0
│   │   ├── passlib 1.7.4
│   │   └── bcrypt 4.0.1
│   └── HTTP Client
│       └── httpx 0.28.1
│
├── Frontend (Node.js 18)
│   ├── Next.js 15.0.0
│   │   ├── React 18.3.1
│   │   └── React-DOM 18.3.1
│   ├── Styling
│   │   ├── Tailwind CSS 3.4.0
│   │   ├── PostCSS 8.4.0
│   │   └── Autoprefixer 10.4.0
│   └── Markdown
│       ├── react-markdown 10.1.0
│       ├── remark-gfm 4.0.1
│       ├── rehype-highlight 7.0.2
│       └── highlight.js 11.9.0
│
└── Infrastructure
    ├── Docker 20.10+
    ├── Docker Compose 2.0+
    └── Nginx Alpine
```

## 📝 版本兼容性

### Python 版本兼容性

| Python | FastAPI | SQLAlchemy | 状态 |
|--------|---------|------------|------|
| 3.9 | 0.115.5 | 2.0.36 | ✅ 推荐 |
| 3.10 | 0.115.5 | 2.0.36 | ✅ 支持 |
| 3.11 | 0.115.5 | 2.0.36 | ✅ 支持 |
| 3.8 | 0.115.5 | 2.0.36 | ⚠️ 部分支持 |

### Node.js 版本兼容性

| Node.js | Next.js | React | 状态 |
|---------|---------|-------|------|
| 18.x | 15.0.0 | 18.3.1 | ✅ 推荐 |
| 20.x | 15.0.0 | 18.3.1 | ✅ 支持 |
| 16.x | 15.0.0 | 18.3.1 | ❌ 不支持 |

## 🆘 常见问题

### Q: 如何离线安装依赖？

**A**: 参考 [离线部署指南](../llm-chat-v1/offline-deployment/OFFLINE_DEPLOYMENT_GUIDE.md)

### Q: 依赖冲突怎么办？

**A**:
```bash
# Python
pip install --force-reinstall -r requirements.txt

# Node.js
rm -rf node_modules package-lock.json
npm install
```

### Q: 如何降级依赖版本？

**A**:
```bash
# Python
pip install fastapi==0.115.0

# Node.js
npm install next@14.0.0
```

## 📚 相关文档

- [在线部署指南](./ONLINE_DEPLOYMENT_GUIDE.md)
- [离线部署指南](../llm-chat-v1/offline-deployment/OFFLINE_DEPLOYMENT_GUIDE.md)
- [项目主文档](../llm-chat-v1/README.md)

---

**文档版本**: v1.0
**更新时间**: 2025-10-05
**维护**: LLM Chat Team
