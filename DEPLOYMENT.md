# LLM Chat System 生产环境部署指南

本文档详细介绍如何将 LLM Chat System 部署到生产服务器。

## 📋 目录

- [前置要求](#前置要求)
- [快速部署](#快速部署)
- [手动部署](#手动部署)
- [使用 systemd 管理服务](#使用-systemd-管理服务)
- [使用 Nginx 反向代理](#使用-nginx-反向代理)
- [安全加固](#安全加固)
- [常见问题](#常见问题)

---

## 前置要求

### 系统要求

- **操作系统**: Ubuntu 20.04+ / CentOS 7+ / Debian 10+
- **Python**: 3.8 或更高版本
- **Node.js**: 18.0 或更高版本
- **内存**: 至少 2GB RAM
- **磁盘**: 至少 10GB 可用空间

### 安装依赖

```bash
# Ubuntu/Debian
sudo apt update
sudo apt install -y python3 python3-pip nodejs npm git

# CentOS/RHEL
sudo yum install -y python3 python3-pip nodejs npm git

# 安装 PM2 (可选，用于进程管理)
sudo npm install -g pm2
```

---

## 快速部署

### 方式一: 使用自动化脚本（推荐）

1. **上传代码到服务器**

```bash
# 使用 git clone
git clone https://github.com/your-username/llm-chat-system.git
cd llm-chat-system

# 或使用 scp 上传
scp -r ./llm-chat-system user@your-server:/path/to/destination
```

2. **运行部署脚本**

```bash
chmod +x deploy.sh
./deploy.sh
```

按照提示输入配置信息：
- 服务器 IP 地址或域名
- 后端服务端口 (默认: 8000)
- 前端服务端口 (默认: 3000)
- 是否生成新的 JWT SECRET_KEY (推荐: Y)

3. **启动服务**

```bash
./start-services.sh
```

4. **访问应用**

- 前端: `http://your-server-ip:3000`
- 后端 API: `http://your-server-ip:8000/docs`

---

## 手动部署

如果您希望手动控制部署过程，请按以下步骤操作。

### 1. 准备项目文件

```bash
# 克隆或上传项目
git clone https://github.com/your-username/llm-chat-system.git
cd llm-chat-system

# 创建日志目录
mkdir -p logs backend/logs frontend/logs
```

### 2. 配置后端

```bash
cd backend

# 创建环境变量文件
cat > .env <<EOF
# 大模型API配置（默认使用 GLM-4）
LLM_API_URL=http://111.19.168.151:11553/v1/chat/completions
LLM_MODEL=glm4_32B_chat
LLM_API_KEY=glm432b

# 数据库配置
DATABASE_URL=sqlite:///./conversation.db

# JWT 安全配置 - 请修改此密钥！
SECRET_KEY=$(openssl rand -hex 32)
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=10080

# 服务器配置
HOST=0.0.0.0
PORT=8000
EOF

# 安装依赖
pip3 install -r requirements.txt

# 测试运行
python3 main.py
```

### 3. 配置前端

```bash
cd ../frontend

# 创建环境变量文件
cat > .env.local <<EOF
NEXT_PUBLIC_API_URL=http://your-server-ip:8000
EOF

# 安装依赖
npm install

# 构建生产版本
npm run build

# 测试运行
npm start
```

### 4. 后台运行服务

使用 `nohup` 后台运行：

```bash
# 后端
cd backend
nohup python3 -m uvicorn main:app --host 0.0.0.0 --port 8000 > ../logs/backend.log 2>&1 &
echo $! > ../logs/backend.pid

# 前端
cd frontend
nohup npm start > ../logs/frontend.log 2>&1 &
echo $! > ../logs/frontend.pid
```

---

## 使用 systemd 管理服务

systemd 是 Linux 系统的服务管理器，可以实现服务的自动启动和重启。

### 1. 创建后端服务

编辑 `systemd/llm-chat-backend.service` 文件，修改以下内容：

```ini
User=YOUR_USERNAME                                    # 替换为你的用户名
WorkingDirectory=/path/to/llm-chat-system/backend    # 替换为实际路径
StandardOutput=append:/path/to/logs/backend.log      # 替换为实际路径
StandardError=append:/path/to/logs/backend-error.log # 替换为实际路径
```

### 2. 创建前端服务

编辑 `systemd/llm-chat-frontend.service` 文件，修改以下内容：

```ini
User=YOUR_USERNAME                                     # 替换为你的用户名
WorkingDirectory=/path/to/llm-chat-system/frontend    # 替换为实际路径
StandardOutput=append:/path/to/logs/frontend.log      # 替换为实际路径
StandardError=append:/path/to/logs/frontend-error.log # 替换为实际路径
```

### 3. 安装和启动服务

```bash
# 复制服务文件
sudo cp systemd/llm-chat-backend.service /etc/systemd/system/
sudo cp systemd/llm-chat-frontend.service /etc/systemd/system/

# 重新加载 systemd
sudo systemctl daemon-reload

# 启动服务
sudo systemctl start llm-chat-backend
sudo systemctl start llm-chat-frontend

# 设置开机自启
sudo systemctl enable llm-chat-backend
sudo systemctl enable llm-chat-frontend

# 查看服务状态
sudo systemctl status llm-chat-backend
sudo systemctl status llm-chat-frontend
```

### 4. 常用管理命令

```bash
# 启动服务
sudo systemctl start llm-chat-backend
sudo systemctl start llm-chat-frontend

# 停止服务
sudo systemctl stop llm-chat-backend
sudo systemctl stop llm-chat-frontend

# 重启服务
sudo systemctl restart llm-chat-backend
sudo systemctl restart llm-chat-frontend

# 查看日志
sudo journalctl -u llm-chat-backend -f
sudo journalctl -u llm-chat-frontend -f
```

---

## 使用 Nginx 反向代理

使用 Nginx 作为反向代理可以提供更好的性能、安全性和灵活性。

### 1. 安装 Nginx

```bash
# Ubuntu/Debian
sudo apt install nginx

# CentOS/RHEL
sudo yum install nginx
```

### 2. 配置 Nginx

编辑 `nginx/llm-chat.conf` 文件，修改：

```nginx
server_name your-domain.com;  # 替换为你的域名或 IP
```

### 3. 部署配置文件

```bash
# 复制配置文件
sudo cp nginx/llm-chat.conf /etc/nginx/sites-available/

# 创建软链接（Ubuntu/Debian）
sudo ln -s /etc/nginx/sites-available/llm-chat.conf /etc/nginx/sites-enabled/

# CentOS/RHEL 直接复制到 conf.d
sudo cp nginx/llm-chat.conf /etc/nginx/conf.d/

# 测试配置
sudo nginx -t

# 重新加载 Nginx
sudo systemctl reload nginx
```

### 4. 配置 HTTPS (可选但推荐)

使用 Let's Encrypt 免费 SSL 证书：

```bash
# 安装 certbot
sudo apt install certbot python3-certbot-nginx

# 获取证书并自动配置 Nginx
sudo certbot --nginx -d your-domain.com

# 测试自动续期
sudo certbot renew --dry-run
```

### 5. 更新前端环境变量

如果使用 Nginx 反向代理，更新前端配置：

```bash
# frontend/.env.local
NEXT_PUBLIC_API_URL=https://your-domain.com
```

重新构建前端：

```bash
cd frontend
npm run build
sudo systemctl restart llm-chat-frontend
```

---

## 安全加固

### 1. 防火墙配置

```bash
# Ubuntu/Debian (ufw)
sudo ufw allow 22/tcp      # SSH
sudo ufw allow 80/tcp      # HTTP
sudo ufw allow 443/tcp     # HTTPS
sudo ufw enable

# CentOS/RHEL (firewalld)
sudo firewall-cmd --permanent --add-service=ssh
sudo firewall-cmd --permanent --add-service=http
sudo firewall-cmd --permanent --add-service=https
sudo firewall-cmd --reload
```

**注意**: 如果不使用 Nginx，还需要开放后端和前端端口：

```bash
# Ubuntu
sudo ufw allow 8000/tcp
sudo ufw allow 3000/tcp

# CentOS
sudo firewall-cmd --permanent --add-port=8000/tcp
sudo firewall-cmd --permanent --add-port=3000/tcp
sudo firewall-cmd --reload
```

### 2. 修改默认配置

**后端 `.env` 文件**:
- ✅ 生成新的 `SECRET_KEY`
- ✅ 修改 `ACCESS_TOKEN_EXPIRE_MINUTES` (根据需求)
- ✅ 配置 CORS（如果需要）

```bash
# 生成新的 SECRET_KEY
openssl rand -hex 32
```

### 3. 数据库安全

```bash
# 定期备份数据库
cd backend
cp conversation.db conversation.db.backup.$(date +%Y%m%d_%H%M%S)

# 设置数据库文件权限
chmod 600 conversation.db
```

### 4. 日志管理

设置日志轮转以防止日志文件过大：

```bash
# /etc/logrotate.d/llm-chat
/path/to/llm-chat-system/logs/*.log {
    daily
    missingok
    rotate 14
    compress
    delaycompress
    notifempty
    create 0640 YOUR_USERNAME YOUR_USERNAME
}
```

---

## 常见问题

### 1. 服务无法启动

**检查端口占用**:
```bash
sudo lsof -i :8000
sudo lsof -i :3000
```

**查看日志**:
```bash
tail -f logs/backend.log
tail -f logs/frontend.log
```

### 2. 无法访问服务

**检查防火墙**:
```bash
sudo ufw status
sudo firewall-cmd --list-all
```

**检查服务状态**:
```bash
./status-services.sh
# 或
sudo systemctl status llm-chat-backend
sudo systemctl status llm-chat-frontend
```

### 3. 前端无法连接后端

**检查环境变量**:
```bash
cat frontend/.env.local
```

确保 `NEXT_PUBLIC_API_URL` 指向正确的后端地址。

**检查 CORS 配置**:

在 `backend/main.py` 中，确认 CORS 配置允许前端域名：

```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://your-frontend-domain:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

### 4. 数据库错误

**检查权限**:
```bash
ls -la backend/conversation.db
```

**重置数据库** (谨慎操作):
```bash
cd backend
rm conversation.db
python3 main.py  # 会自动创建新数据库
```

### 5. 性能优化

**使用生产级 WSGI 服务器**:

```bash
# 安装 gunicorn
pip install gunicorn

# 使用 gunicorn 运行 (4个工作进程)
cd backend
gunicorn main:app -w 4 -k uvicorn.workers.UvicornWorker --bind 0.0.0.0:8000
```

**启用 gzip 压缩** (在 Nginx 配置中):

```nginx
gzip on;
gzip_types text/plain text/css application/json application/javascript;
gzip_min_length 1000;
```

---

## 监控和维护

### 1. 查看服务状态

```bash
# 使用脚本
./status-services.sh

# 使用 systemd
sudo systemctl status llm-chat-backend llm-chat-frontend

# 查看进程
ps aux | grep uvicorn
ps aux | grep node
```

### 2. 查看日志

```bash
# 实时日志
tail -f logs/backend.log
tail -f logs/frontend.log

# systemd 日志
sudo journalctl -u llm-chat-backend -f
sudo journalctl -u llm-chat-frontend -f
```

### 3. 数据库备份

创建自动备份脚本：

```bash
#!/bin/bash
# backup-db.sh

BACKUP_DIR="/path/to/backups"
DB_PATH="/path/to/llm-chat-system/backend/conversation.db"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR
cp $DB_PATH $BACKUP_DIR/conversation_backup_$TIMESTAMP.db

# 保留最近30天的备份
find $BACKUP_DIR -name "conversation_backup_*.db" -mtime +30 -delete

echo "Backup completed: $BACKUP_DIR/conversation_backup_$TIMESTAMP.db"
```

添加到 crontab (每天凌晨2点备份):

```bash
crontab -e
# 添加: 0 2 * * * /path/to/backup-db.sh
```

---

## 升级部署

当有新版本发布时：

```bash
# 1. 停止服务
./stop-services.sh

# 2. 备份数据库
cp backend/conversation.db backend/conversation.db.backup

# 3. 拉取最新代码
git pull origin main

# 4. 更新依赖
cd backend && pip install -r requirements.txt
cd ../frontend && npm install && npm run build

# 5. 重启服务
cd ..
./start-services.sh
```

---

## 联系支持

如遇到问题：

1. 查看本文档的常见问题章节
2. 查看项目主 README.md
3. 检查 GitHub Issues
4. 查看日志文件寻找错误信息

---

**部署愉快！** 🚀
