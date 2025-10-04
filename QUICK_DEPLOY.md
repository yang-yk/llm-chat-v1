# 🚀 一键部署指南

本文档提供两种快速部署方式，让您在几分钟内完成 LLM Chat System 的生产环境部署。

---

## 📋 部署前准备

### 系统要求

- **操作系统**: Linux (Ubuntu/Debian/CentOS)
- **Python**: 3.8+ (方式一需要)
- **Node.js**: 18+ (方式一需要)
- **Docker**: 20.10+ (方式二需要)
- **内存**: 至少 2GB RAM
- **磁盘**: 至少 10GB 可用空间

---

## 方式一: 服务器一键部署 🖥️

适合有 Python 和 Node.js 环境的服务器。

### 1. 上传代码到服务器

```bash
# 方法1: Git Clone
git clone https://github.com/yang-yk/llm-chat-v1.git
cd llm-chat-v1

# 方法2: SCP 上传
scp -r ./llm-chat-system user@your-server:/path/to/destination
ssh user@your-server
cd /path/to/llm-chat-system
```

### 2. 运行部署脚本

```bash
# 赋予执行权限
chmod +x deploy.sh

# 运行部署脚本
./deploy.sh
```

### 3. 按提示输入配置

脚本会交互式询问以下信息：

```
请输入部署配置信息:

服务器 IP 地址或域名: 192.168.1.100
后端服务端口 [8000]: 8000
前端服务端口 [3000]: 3000
是否需要生成新的 JWT SECRET_KEY? (推荐) [Y/n]: Y
```

### 4. 启动服务

```bash
# 启动所有服务
./start-services.sh

# 查看服务状态
./status-services.sh

# 查看日志
tail -f logs/backend.log
tail -f logs/frontend.log
```

### 5. 访问应用

- **前端**: `http://your-server-ip:3000`
- **后端 API**: `http://your-server-ip:8000/docs`

### 服务管理命令

```bash
./start-services.sh      # 启动服务
./stop-services.sh       # 停止服务
./restart-services.sh    # 重启服务
./status-services.sh     # 查看状态
```

---

## 方式二: Docker 一键部署 🐳

推荐方式，无需配置 Python 和 Node.js 环境。

### 1. 安装 Docker 和 Docker Compose

```bash
# Ubuntu/Debian
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo apt install docker-compose

# CentOS/RHEL
sudo yum install -y docker docker-compose
sudo systemctl start docker
sudo systemctl enable docker
```

### 2. 上传代码到服务器

```bash
# Git Clone
git clone https://github.com/yang-yk/llm-chat-v1.git
cd llm-chat-v1

# 或使用 SCP 上传
scp -r ./llm-chat-system user@your-server:/path/to/destination
```

### 3. 运行 Docker 部署脚本

```bash
# 赋予执行权限
chmod +x docker-deploy.sh

# 运行部署脚本
./docker-deploy.sh
```

脚本会自动：
- ✅ 生成安全的 JWT SECRET_KEY
- ✅ 构建 Docker 镜像
- ✅ 启动所有容器
- ✅ 配置网络和数据卷

### 4. 访问应用

- **前端**: `http://localhost:3000`
- **后端 API**: `http://localhost:8000/docs`

### Docker 管理命令

```bash
# 查看容器状态
docker-compose ps

# 查看日志
docker-compose logs -f
docker-compose logs -f backend   # 只看后端日志
docker-compose logs -f frontend  # 只看前端日志

# 停止服务
docker-compose down

# 重启服务
docker-compose restart

# 重新构建并启动
docker-compose up -d --build
```

---

## 🔧 高级配置

### 修改端口

**方式一 (服务器部署)**:

编辑启动脚本中的端口配置，或重新运行 `./deploy.sh`

**方式二 (Docker 部署)**:

编辑 `docker-compose.yml`:

```yaml
services:
  backend:
    ports:
      - "8080:8000"  # 改为 8080 端口
  frontend:
    ports:
      - "3001:3000"  # 改为 3001 端口
```

然后重启：
```bash
docker-compose down
docker-compose up -d
```

### 使用自定义域名

1. **配置 DNS 解析**：将域名指向服务器 IP

2. **安装 Nginx**（推荐）:

```bash
# 安装 Nginx
sudo apt install nginx

# 复制配置文件
sudo cp nginx/llm-chat.conf /etc/nginx/sites-available/
sudo ln -s /etc/nginx/sites-available/llm-chat.conf /etc/nginx/sites-enabled/

# 编辑配置，修改域名
sudo nano /etc/nginx/sites-available/llm-chat.conf
# 将 server_name 改为你的域名

# 重启 Nginx
sudo systemctl restart nginx
```

3. **配置 HTTPS**（可选）:

```bash
# 安装 Certbot
sudo apt install certbot python3-certbot-nginx

# 获取免费 SSL 证书
sudo certbot --nginx -d your-domain.com

# 自动续期
sudo certbot renew --dry-run
```

### 配置防火墙

```bash
# Ubuntu (ufw)
sudo ufw allow 22/tcp      # SSH
sudo ufw allow 80/tcp      # HTTP
sudo ufw allow 443/tcp     # HTTPS
sudo ufw allow 3000/tcp    # 前端 (如不用 Nginx)
sudo ufw allow 8000/tcp    # 后端 (如不用 Nginx)
sudo ufw enable

# CentOS (firewalld)
sudo firewall-cmd --permanent --add-service=ssh
sudo firewall-cmd --permanent --add-service=http
sudo firewall-cmd --permanent --add-service=https
sudo firewall-cmd --permanent --add-port=3000/tcp
sudo firewall-cmd --permanent --add-port=8000/tcp
sudo firewall-cmd --reload
```

---

## 🔍 故障排查

### 问题 1: 端口被占用

```bash
# 查看端口占用
sudo lsof -i :8000
sudo lsof -i :3000

# 杀死占用进程
sudo kill -9 <PID>
```

### 问题 2: Docker 容器无法启动

```bash
# 查看详细日志
docker-compose logs

# 重新构建
docker-compose down
docker-compose build --no-cache
docker-compose up -d
```

### 问题 3: 前端无法连接后端

**方式一**：检查 `frontend/.env.local`:
```bash
NEXT_PUBLIC_API_URL=http://your-server-ip:8000
```

**方式二**：Docker 内部使用容器名通信，无需修改

### 问题 4: 服务意外停止

**方式一**：查看日志
```bash
tail -f logs/backend.log
tail -f logs/frontend.log
```

**方式二**：查看 Docker 日志
```bash
docker-compose logs -f
```

---

## 📊 性能优化

### 1. 使用生产级 WSGI 服务器

编辑 `backend/Dockerfile`，使用 Gunicorn:

```dockerfile
CMD ["gunicorn", "main:app", "-w", "4", "-k", "uvicorn.workers.UvicornWorker", "--bind", "0.0.0.0:8000"]
```

### 2. 配置 Nginx 缓存

在 `nginx/llm-chat.conf` 中添加：

```nginx
# 静态文件缓存
location ~* \.(jpg|jpeg|png|gif|ico|css|js)$ {
    expires 1y;
    add_header Cache-Control "public, immutable";
}
```

### 3. 启用 Gzip 压缩

```nginx
gzip on;
gzip_types text/plain text/css application/json application/javascript;
gzip_min_length 1000;
```

---

## 🔒 安全建议

1. **修改默认密钥**：生产环境务必修改 `SECRET_KEY`
2. **使用 HTTPS**：配置 SSL 证书保护数据传输
3. **定期备份**：备份 `backend/conversation.db` 数据库
4. **限制访问**：配置防火墙规则
5. **更新依赖**：定期更新软件包

---

## 📚 更多文档

- 📖 [完整部署文档](DEPLOYMENT.md) - 详细的部署步骤和配置
- 📘 [项目主文档](README.md) - 项目介绍和使用说明
- ⚡ [快速开始](QUICKSTART.md) - 本地开发环境搭建
- 🏗️ [项目结构](STRUCTURE.md) - 代码结构说明

---

## ✅ 部署检查清单

部署完成后，请检查以下项目：

- [ ] 前端页面可以正常访问
- [ ] 可以成功注册和登录
- [ ] 可以创建新对话
- [ ] 可以发送消息并收到回复
- [ ] 流式响应正常工作
- [ ] 代码块语法高亮正常
- [ ] 点赞/点踩功能正常
- [ ] 对话历史可以正常加载
- [ ] 设置面板可以保存配置
- [ ] 日志文件正常记录
- [ ] 防火墙规则已配置
- [ ] （可选）HTTPS 证书已配置

---

## 🆘 需要帮助？

遇到问题请：

1. 查看本文档的故障排查章节
2. 查看 [DEPLOYMENT.md](DEPLOYMENT.md) 详细文档
3. 检查日志文件查找错误信息
4. 提交 GitHub Issue

---

**祝您部署顺利！** 🎉
