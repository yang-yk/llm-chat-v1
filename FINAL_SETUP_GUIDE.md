# LLM Chat 最终配置指南

## ✅ 已完成的配置

### 1. 数据库共享
- **位置**: `/home/data2/yangyk/llm-chat-v1/db/conversation.db`
- **本地部署**: 直接读写该文件
- **Docker部署**: 通过卷挂载 `../../db:/app/db` 访问同一文件

### 2. 自动管理员初始化
每次启动后端时自动检查：
- 如果 `admin` 用户不存在 → 自动创建
- 如果已存在 → 跳过

**默认管理员账户：**
```
用户名: admin
密码: Admin@2025
邮箱: admin@example.com
```

### 3. Conda环境支持
`deployment/local/start.sh` 自动检测并使用 `py38` conda 环境，无需手动激活。

### 4. 配置文件说明

#### backend/.env
```bash
# 使用宿主机绝对路径（本地部署直接使用）
DATABASE_URL=sqlite:////home/data2/yangyk/llm-chat-v1/db/conversation.db
```

#### docker-compose.yml
```yaml
environment:
  # Docker容器内使用 /app/db（通过卷挂载到宿主机）
  - DATABASE_URL=sqlite:////app/db/conversation.db
volumes:
  # 挂载宿主机数据库目录
  - ../../db:/app/db
```

## 🚀 快速开始

### 本地部署
```bash
cd /home/data2/yangyk/llm-chat-v1/deployment/local
bash start.sh
```

**访问地址:**
- 前端: http://111.19.168.151:3000
- 后端: http://111.19.168.151:8000
- 管理后台: http://111.19.168.151:3000/admin

### Docker部署
```bash
cd /home/data2/yangyk/llm-chat-v1
./deployment-manager.sh start-docker
```

**访问地址:**
- 前端: http://111.19.168.151 (通过Nginx)
- 后端: http://111.19.168.151:8000
- 管理后台: http://111.19.168.151/admin

### 切换部署方式
```bash
# 自动停止其他部署并启动Docker
./deployment-manager.sh start-docker

# 自动停止其他部署并启动本地
./deployment-manager.sh start-local

# 查看当前状态
./deployment-manager.sh status

# 停止所有
./deployment-manager.sh stop-all
```

## 📋 验证清单

### ✓ 检查管理员是否创建成功

**方法1: 查看启动日志**
```bash
tail -f /home/data2/yangyk/llm-chat-v1/logs/backend.log
```

应该看到以下之一：
- `✓ 管理员账户已存在: admin` （已有管理员）
- `✅ 默认管理员创建成功 (用户名: admin, 密码: Admin@2025)` （首次创建）

**方法2: 尝试登录**
访问 http://111.19.168.151:3000/admin (或 :80/admin)，使用：
- 用户名: `admin`
- 密码: `Admin@2025`

### ✓ 检查数据库是否共享

```bash
# 1. 启动本地部署，创建一个用户
cd /home/data2/yangyk/llm-chat-v1/deployment/local
bash start.sh
# 然后在网页上注册一个测试用户

# 2. 切换到Docker部署
cd /home/data2/yangyk/llm-chat-v1
./deployment-manager.sh start-docker

# 3. 访问 http://111.19.168.151，用刚才创建的用户登录
# 如果能登录，说明数据库确实共享了
```

### ✓ 检查Conda环境

```bash
cd /home/data2/yangyk/llm-chat-v1/deployment/local
bash start.sh 2>&1 | grep "conda"
```

应该看到：`📦 使用conda环境: py38`

## 🔧 常见问题

### Q1: 数据库路径错误 (unable to open database file)

**原因**: `backend/.env` 中的路径可能被 `apply-config.sh` 改为了 Docker 路径

**解决**:
```bash
# 手动修复 backend/.env
echo "DATABASE_URL=sqlite:////home/data2/yangyk/llm-chat-v1/db/conversation.db" >> /home/data2/yangyk/llm-chat-v1/backend/.env

# 或重新应用配置
./apply-config.sh deployment-config.local.json
```

### Q2: 本地部署找不到Python依赖

**原因**: 没有激活 conda 环境

**解决**: `start.sh` 已自动处理，如果还有问题：
```bash
conda activate py38
cd /home/data2/yangyk/llm-chat-v1/deployment/local
bash start.sh
```

### Q3: 如何重置管理员密码？

**方法1: 删除数据库重新创建**
```bash
./deployment-manager.sh stop-all
rm /home/data2/yangyk/llm-chat-v1/db/conversation.db
./deployment-manager.sh start-local  # 会自动创建新的admin
```

**方法2: 使用脚本修改**
```bash
cd /home/data2/yangyk/llm-chat-v1/backend
python set_admin.py --username admin --password "NewPassword@123"
```

### Q4: Docker和本地可以同时运行吗？

**不建议**，原因：
1. 共享数据库可能导致锁定冲突
2. 端口冲突 (8000, 3000, 80)

使用 `deployment-manager.sh` 自动切换即可。

## 📁 重要文件位置

```
llm-chat-v1/
├── db/
│   └── conversation.db              # 共享数据库
├── logs/
│   ├── backend.log                  # 后端日志
│   └── frontend.log                 # 前端日志
├── backend/
│   ├── .env                         # 后端配置（宿主机路径）
│   ├── main.py                      # 包含自动创建管理员逻辑
│   └── set_admin.py                 # 管理员管理脚本
├── deployment/
│   ├── local/
│   │   ├── start.sh                 # 本地启动（支持conda）
│   │   └── stop.sh                  # 本地停止
│   └── docker/
│       ├── docker-compose.yml       # Docker配置
│       └── .env                     # Docker环境变量
├── deployment-manager.sh            # 部署管理脚本
├── apply-config.sh                  # 配置应用脚本
├── deployment-config.local.json     # 本地配置
└── FINAL_SETUP_GUIDE.md            # 本文档
```

## 🔐 安全建议

1. **首次登录后修改密码**
   - 登录管理后台
   - 访问用户设置
   - 修改 `Admin@2025` 为更安全的密码

2. **限制访问**
   ```bash
   # 配置防火墙只允许特定IP
   sudo ufw allow from YOUR_IP to any port 8000
   sudo ufw allow from YOUR_IP to any port 3000
   ```

3. **定期备份数据库**
   ```bash
   cp /home/data2/yangyk/llm-chat-v1/db/conversation.db \
      /home/data2/yangyk/backups/conversation-$(date +%Y%m%d).db
   ```

4. **监控日志**
   ```bash
   # 实时查看后端日志
   tail -f /home/data2/yangyk/llm-chat-v1/logs/backend.log
   ```

## 🎯 下一步

1. 访问管理后台，修改默认密码
2. 配置其他用户账户
3. 根据需要调整LLM模型配置
4. 设置定期数据库备份计划

## 📞 故障排查

如遇到问题，按以下顺序检查：

1. **查看后端日志**
   ```bash
   tail -50 /home/data2/yangyk/llm-chat-v1/logs/backend.log
   ```

2. **检查数据库文件权限**
   ```bash
   ls -lh /home/data2/yangyk/llm-chat-v1/db/conversation.db
   # 应该显示 yangyk:docker 有读写权限
   ```

3. **验证配置文件**
   ```bash
   cat /home/data2/yangyk/llm-chat-v1/backend/.env | grep DATABASE_URL
   # 应该是宿主机绝对路径
   ```

4. **重启服务**
   ```bash
   ./deployment-manager.sh stop-all
   ./deployment-manager.sh start-local  # 或 start-docker
   ```
