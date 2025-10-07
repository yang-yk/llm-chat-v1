# LLM Chat - 智能对话系统

基于大语言模型的多轮对话系统，支持用户管理、对话历史、模型配置等功能。

## 🚀 快速开始

### 前提条件

- Python 3.8+ (推荐使用 conda py38 环境)
- Node.js 18+
- Docker & Docker Compose (可选，用于 Docker 部署)

### 一键部署

#### 本地部署

```bash
cd deployment/local
bash start.sh
```

访问地址：
- 前端界面：http://111.19.168.151:3000
- 后端API：http://111.19.168.151:8000
- 管理后台：http://111.19.168.151:3000/admin

#### Docker部署

```bash
./deployment-manager.sh start-docker
```

访问地址：
- 前端界面：http://111.19.168.151 (通过Nginx)
- 后端API：http://111.19.168.151:8000
- 管理后台：http://111.19.168.151/admin

### 默认管理员账户

首次启动时会自动创建管理员：

- 用户名：`admin`
- 密码：`Admin@2025`

**⚠️ 重要**：首次登录后请立即修改密码！

## 📋 功能特性

- ✅ 用户注册/登录系统
- ✅ 多轮对话支持
- ✅ 对话历史管理
- ✅ 多模型切换 (CodeGeex, GLM-4, 自定义)
- ✅ 管理员后台
- ✅ 用户权限管理
- ✅ 模型调用统计
- ✅ 自动初始化管理员
- ✅ 本地/Docker 双部署支持

## 🔧 部署管理

### 使用部署管理脚本

```bash
# 查看当前部署状态
./deployment-manager.sh status

# 启动 Docker 部署（自动停止本地部署）
./deployment-manager.sh start-docker

# 启动本地部署（自动停止 Docker 部署）
./deployment-manager.sh start-local

# 停止所有部署
./deployment-manager.sh stop-all

# 重启 Docker 部署
./deployment-manager.sh restart-docker

# 重启本地部署
./deployment-manager.sh restart-local
```

### 手动管理

#### 本地部署

```bash
# 启动
cd deployment/local
bash start.sh

# 停止
bash stop.sh

# 查看日志
tail -f ../../logs/backend.log
tail -f ../../logs/frontend.log
```

#### Docker 部署

```bash
cd deployment/docker

# 启动
docker compose up -d

# 停止
docker compose down

# 查看日志
docker compose logs -f backend
docker compose logs -f frontend

# 查看状态
docker compose ps
```

## ⚙️ 配置管理

### 修改配置

1. 编辑配置文件：

```bash
vim deployment-config.local.json
```

2. 应用配置：

```bash
./apply-config.sh deployment-config.local.json
```

3. 重启服务生效。

### 主要配置项

```json
{
  "server": {
    "host": "111.19.168.151",
    "project_path": "/home/data2/yangyk/llm-chat-v1"
  },
  "backend": {
    "port": 8000,
    "llm": {
      "api_url": "http://111.19.168.151:11553/v1/chat/completions",
      "model": "glm4_32B_chat",
      "api_key": "glm432b"
    }
  },
  "frontend": {
    "port": 3000,
    "api_url": "http://111.19.168.151:8000"
  },
  "nginx": {
    "enabled": true,
    "port": 80
  },
  "deployment": {
    "type": "docker"
  }
}
```

## 📂 项目结构

```
llm-chat-v1/
├── backend/              # 后端服务 (FastAPI)
│   ├── main.py          # 主应用（包含自动创建管理员逻辑）
│   ├── database.py      # 数据库模型
│   ├── auth.py          # 认证模块
│   ├── .env             # 环境配置
│   └── requirements.txt
│
├── frontend/            # 前端服务 (Next.js)
│   ├── app/            # Next.js 应用
│   ├── .env.local      # 本地环境配置
│   └── package.json
│
├── db/                  # 数据库文件（本地和Docker共享）
│   └── conversation.db
│
├── logs/               # 日志文件
│   ├── backend.log
│   └── frontend.log
│
├── deployment/
│   ├── local/          # 本地部署脚本
│   │   ├── start.sh   # 启动脚本（支持conda自动检测）
│   │   └── stop.sh    # 停止脚本
│   └── docker/        # Docker部署配置
│       └── docker-compose.yml
│
├── nginx/              # Nginx配置
│   └── default.conf
│
├── deployment-manager.sh      # 部署管理脚本
├── apply-config.sh           # 配置应用脚本
└── deployment-config.local.json  # 本地配置文件
```

## 🗄️ 数据库说明

### 共享数据库

本地部署和 Docker 部署**共享同一个数据库文件**：

```
/home/data2/yangyk/llm-chat-v1/db/conversation.db
```

**优点**：
- 切换部署方式时数据保持一致
- 无需数据迁移

**注意**：
- 不建议同时运行本地和 Docker 部署（会导致数据库锁定冲突）
- 使用 `deployment-manager.sh` 自动管理切换

### 数据库备份

```bash
# 备份数据库
cp db/conversation.db backups/conversation-$(date +%Y%m%d).db

# 恢复数据库
cp backups/conversation-20241007.db db/conversation.db
```

## 👤 用户管理

### 查看所有管理员

```bash
cd backend
python << 'EOF'
from database import SessionLocal, User, init_db
init_db()
db = SessionLocal()
admins = db.query(User).filter(User.is_admin == True).all()
for admin in admins:
    print(f"- {admin.username} (ID: {admin.id})")
db.close()
