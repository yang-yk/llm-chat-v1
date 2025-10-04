# 解决 "Failed to Fetch" 问题

## 问题描述

在通过 `http://111.19.168.151:3000/auth` 登录或注册时，出现 "failed to fetch" 错误。

## 问题原因

前端页面在用户浏览器中运行，尝试访问配置的后端 API 地址 `http://111.19.168.151:8000`，但后端 8000 端口无法从外网访问（可能被防火墙/安全组阻止）。

## 解决方案

### 方案 1：使用 Nginx 反向代理（推荐）

通过 Nginx 将前端和后端统一到 80 端口，避免端口访问问题。

#### 1. 访问方式变更

**修改后的访问地址：**
- ~~旧地址：http://111.19.168.151:3000~~
- **新地址：http://111.19.168.151** （80 端口）

**API 访问：**
- 前端页面：`http://111.19.168.151/`
- 后端 API：`http://111.19.168.151/api/`
- API 文档：`http://111.19.168.151/api/docs`（注意：需要配置 Nginx 代理，见下文）

#### 2. 配置说明

项目已配置 Nginx 反向代理，配置文件位于：`nginx/default.conf`

```nginx
server {
    listen 80;

    # 前端页面
    location / {
        proxy_pass http://frontend:3000;
    }

    # 后端 API
    location /api/ {
        proxy_pass http://backend:8000/api/;
    }
}
```

#### 3. 服务状态检查

```bash
# 检查服务状态
docker compose ps

# 应该看到 3 个容器都在运行：
# - llm-chat-backend  (Up)
# - llm-chat-frontend (Up)
# - llm-chat-nginx    (Up)
```

#### 4. 测试访问

```bash
# 从服务器本地测试
curl http://localhost/api/health

# 预期输出
{"status":"ok","message":"大模型对话后端服务运行中","version":"1.0.0"}
```

#### 5. 浏览器访问

直接访问：`http://111.19.168.151`

---

### 方案 2：开放后端 8000 端口（临时方案）

如果不想使用 Nginx，可以开放 8000 端口：

#### 云服务器安全组配置

1. 登录云服务商控制台
2. 找到安全组规则
3. 添加入站规则：
   - 协议：TCP
   - 端口：8000
   - 来源：0.0.0.0/0

#### 系统防火墙配置

```bash
# 检查防火墙状态
sudo ufw status

# 如果启用，开放端口
sudo ufw allow 8000/tcp
sudo ufw allow 3000/tcp
sudo ufw reload
```

#### iptables 检查

```bash
# 查看 iptables 规则
sudo iptables -L -n | grep 8000

# 如果有阻止规则，添加允许规则
sudo iptables -I INPUT -p tcp --dport 8000 -j ACCEPT
```

---

### 方案 3：修改前端 API 配置（不推荐）

如果使用其他端口或域名，需要修改前端配置：

#### 修改 docker-compose.override.yml

```yaml
services:
  frontend:
    environment:
      - NEXT_PUBLIC_API_URL=http://YOUR_DOMAIN_OR_IP:YOUR_PORT
```

#### 重新构建前端

```bash
# 停止并删除前端容器
docker compose stop frontend
docker compose rm -f frontend

# 删除镜像
docker rmi llm-chat-v1-frontend

# 重新构建（需要较长时间）
docker compose up -d --build frontend
```

**注意：** Next.js 的 `NEXT_PUBLIC_` 环境变量是在构建时注入的，修改后必须重新构建才能生效。

---

## 常见问题

### Q1: 为什么使用 Nginx 反向代理？

**优势：**
1. **统一端口访问**：只需开放 80 端口，减少安全风险
2. **解决 CORS 问题**：同源访问，无需配置 CORS
3. **易于扩展**：可以添加 HTTPS、负载均衡等功能
4. **符合生产实践**：生产环境标准配置

### Q2: 如何添加 HTTPS？

```nginx
server {
    listen 443 ssl;
    server_name your-domain.com;

    ssl_certificate /etc/nginx/ssl/cert.pem;
    ssl_certificate_key /etc/nginx/ssl/key.pem;

    location / {
        proxy_pass http://frontend:3000;
    }

    location /api/ {
        proxy_pass http://backend:8000/api/;
    }
}

server {
    listen 80;
    server_name your-domain.com;
    return 301 https://$server_name$request_uri;
}
```

将证书放在 `nginx/ssl/` 目录，然后重启服务：

```bash
docker compose restart nginx
```

### Q3: 如何查看详细错误日志？

```bash
# 查看 Nginx 日志
docker compose logs nginx

# 查看前端日志
docker compose logs frontend

# 查看后端日志
docker compose logs backend

# 实时查看所有日志
docker compose logs -f
```

### Q4: 访问 API 文档怎么配置？

默认配置下，FastAPI 的 `/docs` 路径可能无法通过 Nginx 访问。需要添加配置：

修改 `nginx/default.conf`：

```nginx
# 添加 API 文档路由
location /docs {
    proxy_pass http://backend:8000/docs;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
}

location /openapi.json {
    proxy_pass http://backend:8000/openapi.json;
    proxy_set_header Host $host;
}
```

重启 Nginx：
```bash
docker compose restart nginx
```

访问：`http://111.19.168.151/docs`

---

## 验证清单

部署完成后，依次检查：

- [ ] 容器状态：`docker compose ps` 显示所有容器 Up
- [ ] 健康检查：`curl http://localhost/api/health` 返回成功
- [ ] 前端访问：浏览器打开 `http://111.19.168.151` 显示登录页
- [ ] 注册功能：填写用户名密码，点击注册，不再报 "failed to fetch"
- [ ] 登录功能：使用注册的账号登录成功
- [ ] 对话功能：登录后可以正常发送消息

---

## 快速诊断命令

```bash
# 1. 检查所有容器是否运行
docker compose ps

# 2. 测试 Nginx 代理
curl -I http://localhost/
curl http://localhost/api/health

# 3. 测试后端直连（服务器内部）
curl http://localhost:8000/api/health

# 4. 测试前端直连（服务器内部）
curl -I http://localhost:3000

# 5. 查看日志
docker compose logs --tail=50 nginx
docker compose logs --tail=50 backend
docker compose logs --tail=50 frontend

# 6. 测试外网访问（从其他机器）
curl http://111.19.168.151/api/health
```

---

## 故障恢复

如果修改配置后出现问题，可以快速恢复：

```bash
# 完全重启服务
docker compose down
docker compose up -d

# 如果仍有问题，重新构建
docker compose down
docker compose build --no-cache
docker compose up -d

# 查看启动日志
docker compose logs -f
```

---

## 总结

**推荐配置：**
- 访问地址：`http://111.19.168.151`（通过 Nginx 80 端口）
- 架构：浏览器 → Nginx (80) → Frontend (3000) / Backend (8000)
- 优势：统一端口、无 CORS 问题、易于维护

**当前状态：**
- ✅ Nginx 反向代理已配置
- ✅ 后端服务正常运行
- ✅ 前端服务正常运行
- ⏳ 前端环境变量需要重新构建（可选，使用 Nginx 后不影响功能）

**下一步：**
1. 访问 `http://111.19.168.151`
2. 测试注册/登录功能
3. 如有问题，查看日志并参考本文档排查
