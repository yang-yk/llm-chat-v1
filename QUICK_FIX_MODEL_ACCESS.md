# 模型访问问题快速修复方案

## 当前问题
Docker 容器无法访问宿主机的模型服务（端口 11551, 11553）

## 临时解决方案

暂时不使用 Nginx，直接访问后端和前端服务：

### 访问地址更新

**前端**: http://111.19.168.151:3000
**后端 API**: http://111.19.168.151:8000/docs

### 前端配置需要更新

前端需要配置为直接访问后端 8000 端口：

```bash
# 更新前端环境变量
cd /home/data2/yangyk/llm-chat-v1/frontend
echo "NEXT_PUBLIC_API_URL=http://111.19.168.151:8000" > .env.local

# 重新构建前端
cd ..
docker compose stop frontend
docker compose rm -f frontend
docker rmi llm-chat-v1-frontend
docker compose up -d --build frontend
```

### 当前配置状态

后端已配置为使用 host 网络模式，可以直接访问宿主机的模型服务。

模型配置：
- CodeGeex: http://127.0.0.1:11551
- GLM-4: http://127.0.0.1:11553

## 长期解决方案

使用以下任一方案：

### 方案 1：配置反向代理（推荐）
在宿主机安装 Nginx，配置反向代理

### 方案 2：使用 Docker 网桥
保持默认桥接网络，配置模型服务监听 0.0.0.0 而不是 127.0.0.1

### 方案 3：使用 Docker 的 extra_hosts
需要 Docker 20.10+ 支持 host-gateway 功能
