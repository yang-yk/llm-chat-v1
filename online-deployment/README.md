# LLM Chat 在线部署包

本目录包含 LLM Chat 系统在线部署的所有文件和文档。

## 📦 包含文件

| 文件 | 说明 |
|------|------|
| `online-deploy.sh` | 自动化部署脚本 |
| `ONLINE_DEPLOYMENT_GUIDE.md` | 详细部署教程 |
| `DEPENDENCIES.md` | 依赖包和版本清单 |
| `README.md` | 本文件 |

## 🚀 快速开始

### 前置要求
- Linux 系统（Ubuntu 20.04+ / CentOS 7+）
- 有网络连接
- sudo 权限
- 至少 5GB 可用磁盘空间

### 一键部署

```bash
# 1. 下载部署包
cd /home/data2/yangyk/online-deployment

# 2. 运行部署脚本
bash online-deploy.sh
```

### 配置参数

脚本会交互式询问以下信息：

| 参数 | 说明 | 默认值 |
|------|------|--------|
| 服务器 IP | 用户访问地址 | 必填 |
| Nginx 端口 | 主入口端口 | 80 |
| 前端端口 | Next.js 端口 | 3000 |
| 后端端口 | FastAPI 端口 | 8000 |
| 部署目录 | 安装位置 | /opt/llm-chat |
| Git 仓库 | 源码地址 | 本地路径 |
| LLM API | 模型服务地址 | http://127.0.0.1:11553/... |
| 管理员账号 | 初始管理员 | admin |

## 📋 部署步骤

### 步骤 1: 环境检查
- 检查操作系统
- 检查磁盘空间
- 检查权限

### 步骤 2: 安装 Docker
- 自动安装 Docker（如未安装）
- 安装 Docker Compose
- 配置 Docker 服务

### 步骤 3: 获取源码
- 从 Git 克隆（如提供仓库地址）
- 或从本地复制

### 步骤 4: 生成配置
- docker-compose.yml
- nginx/default.conf
- frontend/.env.local

### 步骤 5: 构建镜像
- 构建后端镜像
- 构建前端镜像
- 拉取 Nginx 镜像

### 步骤 6: 启动服务
- 启动所有容器
- 等待服务就绪

### 步骤 7: 创建管理员
- 自动创建管理员账号
- 保存部署信息

### 步骤 8: 部署完成
- 显示访问地址
- 显示管理员凭证
- 保存部署记录

## 📚 文档说明

### 1. ONLINE_DEPLOYMENT_GUIDE.md
**完整的在线部署指南**，包含：
- 环境要求
- 详细步骤
- 配置说明
- 常用命令
- 故障排查
- 升级维护
- 安全建议

### 2. DEPENDENCIES.md
**依赖包和版本清单**，包含：
- 系统要求
- Python 依赖（后端）
- Node.js 依赖（前端）
- Docker 镜像
- 系统软件
- 版本兼容性
- 更新指南

## 🛠️ 部署脚本功能

### online-deploy.sh 特性

✅ **自动化安装**
- 自动检测并安装 Docker
- 自动安装 Docker Compose
- 自动配置用户权限

✅ **智能配置**
- 交互式参数配置
- 默认值支持
- 配置确认机制

✅ **灵活部署**
- 支持从 Git 克隆
- 支持本地源码复制
- 支持自定义部署目录

✅ **完整记录**
- 生成 deployment-info.txt
- 保存所有配置信息
- 包含常用命令参考

✅ **安全特性**
- 自动生成 SECRET_KEY
- 创建管理员账号
- 权限管理

## 🔧 配置文件

### Docker Compose
```yaml
services:
  backend:
    network_mode: host
    environment:
      - LLM_API_URL=...
      - PORT=8000
  frontend:
    ports:
      - "3000:3000"
    environment:
      - NEXT_PUBLIC_API_URL=...
  nginx:
    network_mode: host
```

### Nginx
```nginx
server {
    listen 80;
    location /api/ {
        proxy_pass http://127.0.0.1:8000/api/;
    }
    location / {
        proxy_pass http://127.0.0.1:3000;
    }
}
```

## 📊 系统架构

```
用户
  ↓
Nginx:80 (反向代理)
  ↓
  ├─→ Frontend:3000 (Next.js)
  └─→ Backend:8000 (FastAPI)
       ↓
     LLM API (本地/远程)
```

## 🔍 部署后验证

### 检查服务状态
```bash
cd /opt/llm-chat
docker compose ps
```

### 查看日志
```bash
docker compose logs -f
```

### 测试访问
```bash
# 测试主页
curl http://localhost:80

# 测试 API
curl http://localhost:8000/api/health
```

## 🐛 常见问题

### Q1: Docker 安装失败
```bash
# 手动安装
curl -fsSL https://get.docker.com | bash
sudo systemctl start docker
```

### Q2: 端口被占用
```bash
# 检查端口
netstat -tulpn | grep -E '80|3000|8000'

# 修改端口后重新部署
```

### Q3: 构建超时
```bash
# 清理缓存
docker builder prune -f

# 重新构建
docker compose build --no-cache
```

### Q4: 前端无法访问后端
```bash
# 检查环境变量
docker compose exec frontend env | grep API

# 检查网络
docker compose exec frontend ping 172.17.0.1
```

## 📝 常用命令

### 服务管理
```bash
# 启动
docker compose up -d

# 停止
docker compose down

# 重启
docker compose restart

# 状态
docker compose ps
```

### 日志查看
```bash
# 所有服务
docker compose logs -f

# 特定服务
docker compose logs -f backend
docker compose logs -f frontend
```

### 数据备份
```bash
# 备份数据库
docker compose exec backend cp /app/db/conversation.db /tmp/backup.db
docker compose cp backend:/tmp/backup.db ./backup-$(date +%Y%m%d).db
```

## 🔒 安全建议

1. **修改默认密码**
   - 首次登录后立即修改管理员密码

2. **配置 HTTPS**
   ```bash
   sudo apt-get install certbot python3-certbot-nginx
   sudo certbot --nginx -d your-domain.com
   ```

3. **设置防火墙**
   ```bash
   sudo ufw enable
   sudo ufw allow 22/tcp
   sudo ufw allow 80/tcp
   sudo ufw allow 443/tcp
   ```

4. **定期备份**
   - 自动备份脚本
   - 远程存储

## 📖 更多文档

### 项目文档
- [项目主文档](../README.md)
- [快速参考](../QUICK_REFERENCE.md)
- [更新日志](../CHANGELOG.md)

### 部署文档
- [在线部署指南](./ONLINE_DEPLOYMENT_GUIDE.md) ⭐
- [离线部署指南](../offline-deployment/OFFLINE_DEPLOYMENT_GUIDE.md)
- [Docker 部署](../DOCKER_DEPLOYMENT_GUIDE.md)

### 技术文档
- [依赖清单](./DEPENDENCIES.md) ⭐
- [故障排查](../TROUBLESHOOTING_FAILED_TO_FETCH.md)
- [项目结构](../STRUCTURE.md)

## 🆘 获取帮助

1. **查看文档**
   - ONLINE_DEPLOYMENT_GUIDE.md
   - DEPENDENCIES.md

2. **检查日志**
   ```bash
   docker compose logs -f
   ```

3. **验证配置**
   ```bash
   cat deployment-info.txt
   ```

4. **参考故障排查**
   - 查看 ONLINE_DEPLOYMENT_GUIDE.md 的故障排查章节

## 🎯 下一步

部署完成后：

1. ✅ 访问主页: http://your-ip:80
2. ✅ 登录管理后台: http://your-ip:80/admin
3. ✅ 修改管理员密码
4. ✅ 配置模型参数
5. ✅ 测试对话功能
6. ✅ 设置定期备份
7. ✅ 配置 HTTPS（生产环境）

## 📞 支持

如需帮助，请：
- 查看详细文档
- 检查日志输出
- 参考故障排查指南

---

**版本**: v1.0
**更新时间**: 2025-10-05
**项目**: LLM Chat
**作者**: LLM Chat Team
