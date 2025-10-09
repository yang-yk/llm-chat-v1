# Docker 部署重启指南

## 🚀 快速操作

### 方法1：使用部署管理脚本（推荐）

项目提供了 `deployment-manager.sh` 脚本来管理部署。

#### 查看当前状态
```bash
cd /home/data2/yangyk/llm-chat-v1
./deployment-manager.sh status
```

#### 重启 Docker 服务
```bash
cd /home/data2/yangyk/llm-chat-v1
./deployment-manager.sh restart-docker
```

这会：
1. ✓ 停止所有 Docker 容器
2. ✓ 重新构建镜像（包含最新代码）
3. ✓ 启动所有服务

#### 如果 Docker 没有运行，启动它
```bash
cd /home/data2/yangyk/llm-chat-v1
./deployment-manager.sh start-docker
```

### 方法2：直接使用 Docker Compose

#### 进入 Docker 目录
```bash
cd /home/data2/yangyk/llm-chat-v1/deployment/docker
```

#### 选项A：重启并重新构建（更新代码后使用）
```bash
docker compose down
docker compose up -d --build
```

#### 选项B：仅重启（不重新构建）
```bash
docker compose restart
```

#### 选项C：重启单个服务
```bash
# 重启前端
docker compose restart frontend

# 重启后端
docker compose restart backend

# 重启 Nginx
docker compose restart nginx
```

## 📋 常用命令

### 查看容器状态
```bash
cd /home/data2/yangyk/llm-chat-v1/deployment/docker
docker compose ps
```

### 查看日志
```bash
# 查看所有服务日志
docker compose logs

# 查看特定服务日志
docker compose logs frontend
docker compose logs backend

# 实时查看日志
docker compose logs -f
```

### 停止服务
```bash
cd /home/data2/yangyk/llm-chat-v1
./deployment-manager.sh stop-docker
```

或

```bash
cd /home/data2/yangyk/llm-chat-v1/deployment/docker
docker compose down
```

### 完全清理并重新开始
```bash
cd /home/data2/yangyk/llm-chat-v1/deployment/docker

# 停止并删除容器、网络
docker compose down

# 删除所有镜像（可选）
docker compose down --rmi all

# 重新构建并启动
docker compose up -d --build
```

## 🔄 更新代码后的完整流程

当你修改了前端或后端代码后：

```bash
cd /home/data2/yangyk/llm-chat-v1

# 1. 如果有本地服务在运行，先停止
./deployment-manager.sh stop-local

# 2. 重启 Docker 服务（会自动重新构建）
./deployment-manager.sh restart-docker

# 3. 查看服务状态
./deployment-manager.sh status

# 4. 查看日志确认启动成功
cd deployment/docker
docker compose logs -f
```

## 🔍 调试技巧

### 进入容器内部
```bash
# 进入前端容器
docker exec -it llm-chat-frontend sh

# 进入后端容器
docker exec -it llm-chat-backend bash
```

### 查看容器内部文件
```bash
# 查看前端构建文件
docker exec llm-chat-frontend ls -la /app/.next

# 查看后端文件
docker exec llm-chat-backend ls -la /app
```

### 手动重新构建特定服务
```bash
cd /home/data2/yangyk/llm-chat-v1/deployment/docker

# 仅重新构建前端
docker compose build --no-cache frontend
docker compose up -d frontend

# 仅重新构建后端
docker compose build --no-cache backend
docker compose up -d backend
```

## ⚠️ 常见问题

### 问题1：端口被占用
```bash
# 检查端口占用
netstat -tuln | grep -E "3000|8000|80"

# 停止本地服务
./deployment-manager.sh stop-local

# 然后启动 Docker
./deployment-manager.sh start-docker
```

### 问题2：容器无法启动
```bash
# 查看详细错误日志
cd /home/data2/yangyk/llm-chat-v1/deployment/docker
docker compose logs

# 检查容器状态
docker compose ps -a
```

### 问题3：代码更新后没有生效
```bash
# 完全重新构建（不使用缓存）
cd /home/data2/yangyk/llm-chat-v1/deployment/docker
docker compose down
docker compose build --no-cache
docker compose up -d
```

### 问题4：数据库文件权限问题
```bash
# 确保数据库目录有正确的权限
chmod -R 755 /home/data2/yangyk/llm-chat-v1/db
```

## 📊 服务架构

Docker 部署包含以下服务：

```
┌─────────────────────────────────────┐
│         Nginx (反向代理)            │
│         端口: 80                    │
└─────────────────────────────────────┘
              │
     ┌────────┴────────┐
     │                 │
     ▼                 ▼
┌─────────┐      ┌──────────┐
│  前端   │      │   后端   │
│  :3000  │      │   :8000  │
└─────────┘      └──────────┘
                       │
                       ▼
                 ┌──────────┐
                 │  数据库  │
                 │ (挂载)   │
                 └──────────┘
```

## 🎯 最佳实践

### 开发时
使用本地部署，可以看到实时日志，方便调试：
```bash
./deployment-manager.sh start-local
```

### 生产环境
使用 Docker 部署，更稳定，便于管理：
```bash
./deployment-manager.sh start-docker
```

### 更新代码
1. 修改代码
2. 测试（可选）
3. 重启 Docker：`./deployment-manager.sh restart-docker`
4. 验证：访问前端页面，测试功能

## 📝 快速参考

| 操作 | 命令 |
|------|------|
| 查看状态 | `./deployment-manager.sh status` |
| 启动 Docker | `./deployment-manager.sh start-docker` |
| 重启 Docker | `./deployment-manager.sh restart-docker` |
| 停止 Docker | `./deployment-manager.sh stop-docker` |
| 查看日志 | `cd deployment/docker && docker compose logs -f` |
| 进入容器 | `docker exec -it llm-chat-frontend sh` |

---

**更新日期**: 2025-10-09
**维护者**: DevOps Team
