# LLM Chat 离线部署指南 v2.0

本指南详细说明如何在无网络环境下部署 LLM Chat 系统，支持灵活配置 IP 地址和端口。

## 📋 目录

- [环境要求](#环境要求)
- [准备工作](#准备工作)
- [部署步骤](#部署步骤)
- [配置说明](#配置说明)
- [常用命令](#常用命令)
- [故障排查](#故障排查)
- [常见问题](#常见问题)

## 🔧 环境要求

### 硬件要求
- **CPU**: 2核或以上
- **内存**: 4GB 或以上
- **磁盘**: 至少 5GB 可用空间

### 软件要求
- **操作系统**: Linux (推荐 Ubuntu 20.04+, CentOS 7+)
- **Docker**: 20.10+ 版本
- **Docker Compose**: 2.0+ 版本

## 📦 准备工作

### 1. 生成离线部署包（在有网络的环境）

在源服务器上运行打包脚本：

```bash
cd /home/data2/yangyk/llm-chat-v1
bash create-offline-package.sh
```

这将生成一个包含以下文件的压缩包：
- `project-source.tar.gz` - 项目源码
- `llm-chat-images.tar` - Docker 镜像
- `offline-deploy.sh` - 部署脚本
- `OFFLINE_DEPLOYMENT_GUIDE.md` - 本文档
- `README.txt`, `QUICK_START.txt` - 说明文档

### 2. 传输文件到目标服务器

使用 U 盘、网络传输等方式将压缩包传输到目标服务器。

### 3. 解压文件

```bash
tar xzf llm-chat-offline-XXXXXX.tar.gz
cd offline-deployment-package
```

## 🚀 部署步骤

### 步骤 1: 安装 Docker（如已安装可跳过）

#### 在线安装（如有网络）

```bash
# Ubuntu/Debian
curl -fsSL https://get.docker.com | bash
sudo usermod -aG docker $USER

# 启动 Docker
sudo systemctl start docker
sudo systemctl enable docker
```

### 步骤 2: 运行部署脚本

```bash
bash offline-deploy.sh
```

### 步骤 3: 配置部署参数

脚本会交互式地询问配置信息：

| 配置项 | 说明 | 示例 | 默认值 |
|--------|------|------|--------|
| 服务器地址 | 用户访问的IP/域名 | 192.168.1.100 | 必填 |
| Nginx 端口 | 主入口端口 | 80 | 80 |
| 前端端口 | Next.js 端口 | 3000 | 3000 |
| 后端端口 | FastAPI 端口 | 8000 | 8000 |
| 部署目录 | 项目安装位置 | /opt/llm-chat | /opt/llm-chat |
| 模型 API 地址 | LLM 服务地址 | http://127.0.0.1:11553/... | (见脚本) |
| 模型名称 | 模型标识 | glm4_32B_chat | glm4_32B_chat |
| API Key | 模型密钥 | glm432b | glm432b |
| 管理员用户名 | 初始管理员账号 | admin | admin |
| 管理员密码 | 初始密码 | - | Admin@2025 |

### 步骤 4: 等待部署完成

部署过程自动完成：
1. ✓ 解压项目源码
2. ✓ 加载 Docker 镜像
3. ✓ 生成配置文件
4. ✓ 启动 Docker 容器
5. ✓ 创建管理员账号

### 步骤 5: 访问服务

```
主页: http://您的IP:80
管理后台: http://您的IP:80/admin
```

## ⚙️ 配置说明

### 配置文件位置

| 文件 | 路径 | 说明 |
|------|------|------|
| Docker Compose | `/opt/llm-chat/docker-compose.yml` | 服务配置 |
| Nginx 配置 | `/opt/llm-chat/nginx/default.conf` | 反向代理 |
| 前端环境变量 | `/opt/llm-chat/frontend/.env.local` | 前端配置 |
| 部署信息 | `/opt/llm-chat/deployment-info.txt` | 部署记录 |

### 修改配置后重启

```bash
cd /opt/llm-chat
docker compose restart
```

## 📝 常用命令

```bash
# 进入部署目录
cd /opt/llm-chat

# 查看服务状态
docker compose ps

# 查看日志
docker compose logs -f

# 重启服务
docker compose restart

# 停止服务
docker compose down

# 启动服务
docker compose up -d

# 备份数据库
docker compose exec backend cp /app/db/conversation.db /tmp/backup.db
docker compose cp backend:/tmp/backup.db ./backup-$(date +%Y%m%d).db
```

## 🐛 故障排查

### 容器无法启动

```bash
# 查看日志
docker compose logs backend
docker compose logs frontend

# 检查端口占用
netstat -tulpn | grep -E '80|3000|8000'
```

### 无法访问服务

```bash
# 检查防火墙
sudo ufw status
sudo ufw allow 80/tcp

# 测试端口
curl http://localhost:80
```

### 前端无法连接后端

```bash
# 检查配置
cat docker-compose.yml | grep -A 5 frontend
cat nginx/default.conf
```

## ❓ 常见问题

**Q: 可以修改端口吗？**
A: 可以，在部署时输入自定义端口，或修改配置文件后重启。

**Q: 数据存储在哪里？**
A: Docker volume 中，使用备份命令导出。

**Q: 如何升级？**
A: 备份数据 → 加载新镜像 → 重启服务。

**Q: 支持 HTTPS 吗？**
A: 需要配置 SSL 证书到 Nginx。

## 🏗️ 网络架构

```
用户 → Nginx:80 → 前端:3000 ┐
                 ↓           ↓
              后端:8000 → LLM模型
```

## 🔒 安全建议

1. 修改默认管理员密码
2. 配置防火墙规则
3. 定期备份数据库
4. 生产环境使用 HTTPS
5. 定期检查日志

## 📚 更多信息

- 完整文档: `README.md`
- 快速参考: `QUICK_REFERENCE.md`
- 故障排查: `TROUBLESHOOTING_FAILED_TO_FETCH.md`

---

**文档版本**: v2.0
**更新时间**: 2025-10-05
**项目地址**: /home/data2/yangyk/llm-chat-v1
