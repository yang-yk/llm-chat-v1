# Docker离线重新构建指南

## 概述

当你需要在离线环境中修改代码并重新构建Docker镜像时，可以使用本方案。

## 方案说明

由于离线环境无法访问Docker Hub下载基础镜像，我们采用**利用已导入镜像层作为构建基础**的方案。

### 工作原理

1. 已导入的项目镜像包含了所有构建层
2. Docker的层缓存机制会自动复用未改变的层
3. 只重新构建修改过的代码层

### 适用场景

- ✅ 修改少量业务代码
- ✅ 修改配置文件
- ✅ 调整Dockerfile配置
- ❌ 不适合：需要安装新的依赖包（需要网络）

## 快速重新构建

### 方法1: 使用rebuild脚本（推荐）

```bash
# 在 deployment/docker/offline-packages/build-cache 目录
bash rebuild.sh
```

该脚本会：
1. 检测代码变化
2. 重新构建镜像
3. 自动利用已有层缓存
4. 验证构建结果

### 方法2: 手动重新构建

#### 重新构建后端

```bash
cd /path/to/llm-chat-v1

# 构建后端镜像
docker build -t docker-backend:latest backend/

# 或指定名称
docker build -t llm-chat-backend:latest backend/
```

**注意事项**：
- 如果修改了 `requirements.txt`，需要联网安装新依赖
- 如果只修改了业务代码（`.py`文件），会快速构建

#### 重新构建前端

```bash
cd /path/to/llm-chat-v1

# 构建前端镜像（需要设置API地址）
docker build \
  --build-arg NEXT_PUBLIC_API_URL=http://your-server-ip \
  -t docker-frontend:latest \
  frontend/

# 或指定名称
docker build \
  --build-arg NEXT_PUBLIC_API_URL=http://your-server-ip \
  -t llm-chat-frontend:latest \
  frontend/
```

**注意事项**：
- 如果修改了 `package.json`，需要联网安装新依赖
- 如果只修改了页面代码，会快速构建

### 方法3: 使用docker-compose重新构建

```bash
cd /path/to/llm-chat-v1/deployment/docker

# 重新构建所有服务
docker compose build

# 重新构建指定服务
docker compose build backend
docker compose build frontend

# 重新构建并启动
docker compose up -d --build
```

## 构建加速技巧

### 1. 利用层缓存

Docker会自动缓存未改变的层。Dockerfile中的指令顺序很重要：

**好的做法**（先复制依赖文件）：
```dockerfile
COPY requirements.txt .
RUN pip install -r requirements.txt
COPY . .  # 业务代码最后复制
```

**不好的做法**（一次性复制所有文件）：
```dockerfile
COPY . .  # 任何文件改变都会导致后续层全部重建
RUN pip install -r requirements.txt
```

### 2. 使用.dockerignore

项目中的 `.dockerignore` 文件可以排除不必要的文件，减少构建上下文：

```
node_modules
.next
__pycache__
*.pyc
.git
.env
logs
db
```

### 3. 分阶段构建优化

前端Dockerfile使用了多阶段构建：
- `builder` 阶段：安装依赖和构建
- `runner` 阶段：只包含运行所需文件

修改业务代码时，只有 `builder` 阶段的最后一步需要重新执行。

## 构建时间估算

### 首次构建（无缓存）
- 后端：5-10分钟
- 前端：10-20分钟
- 总计：15-30分钟

### 重新构建（有缓存）
- 只修改后端代码：10-30秒
- 只修改前端代码：1-3分钟
- 修改依赖文件：5-15分钟

## 常见问题

### Q1: 构建时提示网络错误

**问题**:
```
failed to resolve source metadata for docker.io/library/python:3.9-slim
```

**原因**: Docker尝试拉取基础镜像但无网络连接

**解决方案**:
- 确保已导入的镜像存在：`docker images`
- 检查Dockerfile的FROM指令是否匹配已有镜像
- 如果基础镜像不存在，需要从联网机器导出并导入

### Q2: 修改依赖后如何构建

**后端添加Python包**:
```bash
# 1. 修改 backend/requirements.txt
# 2. 需要联网环境构建，或者：
#    - 手动下载wheel文件
#    - 使用pip download在联网机器下载
#    - 传输到离线环境安装
```

**前端添加npm包**:
```bash
# 1. 修改 frontend/package.json
# 2. 需要联网环境构建，或者：
#    - 配置npm离线registry
#    - 使用npm pack打包依赖
```

### Q3: 如何查看构建层缓存

```bash
# 查看镜像层
docker history docker-backend:latest
docker history docker-frontend:latest

# 查看详细信息
docker inspect docker-backend:latest
```

### Q4: 构建失败如何调试

```bash
# 查看构建日志
docker build --progress=plain -t docker-backend:latest backend/

# 进入失败的层进行调试
docker run -it <layer-id> sh

# 清理失败的构建缓存
docker builder prune
```

## 高级用法

### 使用BuildKit加速

```bash
# 启用BuildKit（默认已启用）
export DOCKER_BUILDKIT=1

# 使用BuildKit构建
docker build --progress=plain -t docker-backend:latest backend/
```

### 构建特定平台镜像

```bash
# 构建AMD64平台（默认）
docker build --platform linux/amd64 -t docker-backend:latest backend/

# 如果需要ARM64（需要QEMU支持）
docker build --platform linux/arm64 -t docker-backend:latest backend/
```

### 保存中间镜像用于调试

```bash
# 在Dockerfile中添加调试点
FROM python:3.9-slim AS debug-stage
WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt
# 后续步骤...

# 构建并保存调试阶段
docker build --target debug-stage -t debug-backend:latest backend/

# 进入调试镜像
docker run -it debug-backend:latest bash
```

## 完整重新构建流程示例

### 场景：修改后端业务逻辑

```bash
# 1. 修改代码
vim backend/main.py

# 2. 停止当前服务
cd /path/to/llm-chat-v1/deployment/docker
docker compose down

# 3. 重新构建后端
docker compose build backend

# 4. 启动服务
docker compose up -d

# 5. 查看日志
docker compose logs -f backend

# 6. 验证功能
curl http://127.0.0.1:8000/api/health
```

### 场景：修改前端页面

```bash
# 1. 修改代码
vim frontend/src/app/page.tsx

# 2. 停止服务
cd /path/to/llm-chat-v1/deployment/docker
docker compose down

# 3. 重新构建前端
docker compose build frontend

# 4. 启动服务
docker compose up -d

# 5. 查看日志
docker compose logs -f frontend

# 6. 浏览器访问验证
# http://your-server-ip
```

### 场景：同时修改前后端

```bash
# 1. 修改代码
vim backend/main.py
vim frontend/src/app/page.tsx

# 2. 使用rebuild脚本
cd offline-packages/build-cache
bash rebuild.sh

# 脚本会自动完成：
# - 停止服务
# - 重新构建
# - 启动服务
# - 验证部署
```

## 构建优化建议

### 1. 减少构建上下文

只复制必要的文件：
```dockerfile
# 不要
COPY . .

# 建议
COPY requirements.txt .
RUN pip install -r requirements.txt
COPY src/ src/
COPY main.py .
```

### 2. 合并RUN命令

减少镜像层数：
```dockerfile
# 不要
RUN apt-get update
RUN apt-get install -y gcc
RUN apt-get clean

# 建议
RUN apt-get update && \
    apt-get install -y gcc && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*
```

### 3. 使用特定版本

避免因版本变化导致的不一致：
```dockerfile
# 不要
FROM python:3.9

# 建议
FROM python:3.9.18-slim
```

## 参考资源

- Dockerfile最佳实践：https://docs.docker.com/develop/develop-images/dockerfile_best-practices/
- Docker构建缓存：https://docs.docker.com/build/cache/
- 多阶段构建：https://docs.docker.com/build/building/multi-stage/

## 需要帮助？

查看其他文档：
- `../README.txt` - 离线部署包说明
- `../../OFFLINE_DEPLOYMENT_GUIDE.md` - Docker离线部署详细指南
- `../../../OFFLINE_DEPLOYMENT.md` - 离线部署总指南

---

**提示**: 离线重新构建的关键是利用已有的镜像层缓存。只要不修改依赖文件，构建速度会非常快。
