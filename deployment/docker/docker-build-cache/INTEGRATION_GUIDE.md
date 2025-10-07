# Docker 构建缓存集成指南

本文档说明如何将 Docker 构建缓存集成到离线部署流程中。

## 🎯 使用场景

### 场景 1: 离线环境需要重新构建
在离线环境中，如果需要重新构建 Docker 镜像（例如代码更新），使用缓存可以大幅加速构建过程。

### 场景 2: 多服务器部署
在多个离线服务器上部署时，使用缓存可以避免每次都下载依赖。

### 场景 3: 开发测试
在开发环境中频繁构建时，使用缓存可以节省大量时间。

## 📦 与离线部署包集成

### 方式 1: 独立使用（推荐）

#### 步骤 1: 导出缓存
```bash
cd /home/data2/yangyk/llm-chat-v1
bash docker-build-cache/export-build-cache.sh
```

#### 步骤 2: 打包缓存目录
```bash
tar czf docker-build-cache.tar.gz docker-build-cache/
```

#### 步骤 3: 传输到目标服务器
```bash
# 与离线部署包一起传输
scp docker-build-cache.tar.gz user@target:/path/
scp llm-chat-offline-*.tar.gz user@target:/path/
```

#### 步骤 4: 在目标服务器使用
```bash
# 先导入缓存
tar xzf docker-build-cache.tar.gz
cd docker-build-cache
bash import-build-cache.sh
cd ..

# 再部署项目（如需重新构建）
tar xzf llm-chat-offline-*.tar.gz
cd offline-deployment-package
bash offline-deploy.sh
```

### 方式 2: 包含在离线部署包中

修改 `create-offline-package.sh`，在打包时包含缓存：

```bash
# 在 create-offline-package.sh 中添加

echo -e "${GREEN}[额外步骤]${NC} 导出 Docker 构建缓存..."

# 导出缓存
bash docker-build-cache/export-build-cache.sh

# 复制缓存到部署包
cp -r docker-build-cache offline-deployment-package/

echo -e "${GREEN}✓${NC} 构建缓存已包含在部署包中"
```

## 🔄 重新构建流程

### 场景：代码更新后重新构建

#### 不使用缓存（慢）
```bash
# 耗时：30-50 分钟
cd /opt/llm-chat
docker compose build --no-cache
docker compose up -d
```

#### 使用缓存（快）
```bash
# 耗时：5-8 分钟

# 1. 导入缓存（一次性操作）
cd docker-build-cache
bash import-build-cache.sh

# 2. 重新构建（使用缓存）
cd /opt/llm-chat
docker compose build
docker compose up -d
```

## 🛠️ 离线部署脚本集成

### 添加缓存检测

在 `offline-deploy.sh` 中添加：

```bash
# 在步骤 4 加载镜像之前添加

echo -e "${GREEN}[可选]${NC} 检查构建缓存..."

# 检查是否存在构建缓存
if [ -d "docker-build-cache" ]; then
    echo -e "${BLUE}发现构建缓存目录${NC}"
    read -p "是否导入构建缓存以加速后续重新构建? [Y/n]: " import_cache

    if [[ ! $import_cache =~ ^[Nn]$ ]]; then
        echo "正在导入构建缓存..."
        cd docker-build-cache
        bash import-build-cache.sh
        cd ..
        echo -e "${GREEN}✓${NC} 构建缓存已导入"
    fi
fi

echo ""
```

### 使用缓存重新构建

在部署完成后，如果需要重新构建：

```bash
# 修改代码后
cd /opt/llm-chat

# 重新构建（使用缓存）
docker compose build

# 重启服务
docker compose up -d
```

## 📋 完整工作流程

### 流程 1: 首次离线部署（包含缓存）

**在源服务器（有网络）：**
```bash
# 1. 生成离线部署包
cd /home/data2/yangyk/llm-chat-v1
bash create-offline-package.sh

# 2. 导出构建缓存
bash docker-build-cache/export-build-cache.sh

# 3. 打包所有文件
tar czf llm-chat-complete-$(date +%Y%m%d).tar.gz \
    llm-chat-offline-*.tar.gz \
    docker-build-cache/

# 4. 传输到目标服务器
scp llm-chat-complete-*.tar.gz user@target:/path/
```

**在目标服务器（无网络）：**
```bash
# 1. 解压
tar xzf llm-chat-complete-*.tar.gz

# 2. 导入构建缓存（可选，为后续重新构建准备）
cd docker-build-cache
bash import-build-cache.sh
cd ..

# 3. 部署应用
tar xzf llm-chat-offline-*.tar.gz
cd offline-deployment-package
bash offline-deploy.sh
```

### 流程 2: 代码更新重新构建

**在源服务器：**
```bash
# 1. 更新代码
git pull

# 2. 重新构建镜像
docker compose build

# 3. 导出新镜像
bash create-offline-package.sh

# 4. 传输到目标服务器
scp llm-chat-offline-*.tar.gz user@target:/path/
```

**在目标服务器（已有缓存）：**
```bash
# 1. 解压新部署包
tar xzf llm-chat-offline-*.tar.gz

# 2. 解压源码到项目目录
tar xzf offline-deployment-package/project-source.tar.gz -C /opt/llm-chat/

# 3. 重新构建（使用缓存）
cd /opt/llm-chat
docker compose build

# 4. 重启服务
docker compose restart
```

## 🔧 自定义构建

### 使用 Dockerfile 构建参数

在 Dockerfile 中使用缓存：

**后端 Dockerfile：**
```dockerfile
FROM python:3.9-slim

# 使用缓存加速 pip 安装
ARG PIP_CACHE_DIR=/root/.cache/pip
ENV PIP_CACHE_DIR=${PIP_CACHE_DIR}

WORKDIR /app
COPY requirements.txt .

# 使用缓存安装依赖
RUN --mount=type=cache,target=/root/.cache/pip \
    pip install --no-cache-dir -r requirements.txt

COPY . .
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

**前端 Dockerfile：**
```dockerfile
FROM node:18-alpine AS builder

# 使用缓存加速 npm 安装
ARG NPM_CONFIG_CACHE=/root/.npm
ENV NPM_CONFIG_CACHE=${NPM_CONFIG_CACHE}

WORKDIR /app
COPY package*.json ./

# 使用缓存安装依赖
RUN --mount=type=cache,target=/root/.npm \
    npm ci

COPY . .
RUN npm run build

FROM node:18-alpine AS runner
WORKDIR /app
# ... 后续步骤
```

### 构建命令

```bash
# 使用 BuildKit 缓存
DOCKER_BUILDKIT=1 docker compose build

# 指定缓存源
docker compose build \
    --build-arg BUILDKIT_INLINE_CACHE=1 \
    --cache-from llm-chat-backend-cache:latest \
    --cache-from llm-chat-frontend-cache:latest
```

## 📊 性能对比

### 首次部署
```
方式 1: 仅镜像（无缓存）
  - 部署时间: 5-10 分钟
  - 重新构建: 30-50 分钟

方式 2: 镜像 + 缓存
  - 部署时间: 8-15 分钟（包含导入缓存）
  - 重新构建: 5-8 分钟
```

### 后续更新
```
方式 1: 每次传输新镜像
  - 传输大小: ~800MB
  - 部署时间: 5-10 分钟

方式 2: 传输源码 + 缓存构建
  - 传输大小: ~5MB（仅源码）
  - 构建时间: 5-8 分钟
  - 总时间: 10-15 分钟
```

## ⚠️ 注意事项

1. **缓存大小**
   - 完整缓存约 1.5-2GB
   - 建议在首次部署时导入
   - 后续更新可不传输缓存

2. **缓存有效性**
   - 依赖版本不变时缓存有效
   - requirements.txt 或 package.json 变更需更新缓存

3. **磁盘空间**
   - 确保有足够空间存储缓存（建议 5GB+）
   - 定期清理旧缓存

4. **Docker 版本**
   - 推荐 Docker 20.10+
   - 需要 BuildKit 支持

## 🔍 验证缓存使用

### 检查缓存是否加载
```bash
# 查看镜像
docker images | grep cache

# 查看 pip 缓存
ls -lh ~/.cache/pip/

# 查看 npm 缓存
ls -lh ~/.npm/
```

### 构建时查看缓存使用
```bash
# 详细构建日志
docker compose build --progress=plain

# 查找 "CACHED" 标记
docker compose build 2>&1 | grep -i "cache"
```

## 📚 相关文档

- [Docker 构建缓存 README](README.md)
- [离线部署指南](../offline-deployment/OFFLINE_DEPLOYMENT_GUIDE.md)
- [在线部署指南](../online-deployment/ONLINE_DEPLOYMENT_GUIDE.md)

---

**版本**: v1.0
**更新时间**: 2025-10-05
**维护**: LLM Chat Team
