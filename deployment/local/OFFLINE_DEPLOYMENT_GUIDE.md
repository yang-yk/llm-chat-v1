# 本地离线部署指南

## 概述

本文档介绍如何在没有网络连接的环境中部署LLM Chat System的本地版本。

## 准备工作

### 在有网络的机器上

#### 1. 导出conda py38环境

```bash
cd /path/to/llm-chat-v1/deployment/local
bash export-conda-env.sh
```

这将创建 `offline-packages/` 目录，包含：
- `py38-env.tar.gz` - 完整的Python环境（约300MB-1GB）
- `py38-environment.yml` - 环境配置文件
- `py38-env.tar.gz.sha256` - 校验和文件
- `README.txt` - 详细安装说明

#### 2. 准备前端依赖（可选）

如果目标机器也没有npm包，需要额外准备：

```bash
# 在前端目录
cd ../../frontend

# 安装依赖
npm install

# 构建项目
npm run build

# 打包node_modules（可选，文件较大）
tar -czf ../deployment/local/offline-packages/frontend-node-modules.tar.gz node_modules

# 或者使用npm pack打包依赖
npm pack  # 会生成.tgz文件
```

#### 3. 打包整个离线包

```bash
cd /path/to/llm-chat-v1/deployment/local

# 打包离线包目录
tar -czf llm-chat-local-offline.tar.gz offline-packages/

# 或者打包整个项目（包含代码）
cd ../..
tar -czf llm-chat-complete.tar.gz \
  --exclude=node_modules \
  --exclude=.next \
  --exclude=__pycache__ \
  --exclude=*.pyc \
  --exclude=.git \
  .
```

#### 4. 传输文件到目标机器

将以下文件传输到目标机器：
- `llm-chat-local-offline.tar.gz` - 离线包
- 或 `llm-chat-complete.tar.gz` - 完整项目（推荐）

传输方式：
- U盘/移动硬盘
- 内网文件共享
- scp（如果有内网连接）

```bash
# 使用scp传输
scp llm-chat-complete.tar.gz user@target-machine:/path/to/destination/
```

## 在离线目标机器上部署

### 1. 解压文件

```bash
# 解压完整项目
tar -xzf llm-chat-complete.tar.gz
cd llm-chat-v1

# 或者只解压离线包（如果项目代码已经存在）
cd llm-chat-v1/deployment/local
tar -xzf llm-chat-local-offline.tar.gz
```

### 2. 安装conda环境

#### 方法1: 使用自动导入脚本（推荐）

```bash
cd deployment/local
bash import-conda-env.sh
```

脚本会：
- 验证文件完整性
- 询问安装路径（默认: ~/conda-envs/py38）
- 自动解压环境
- 修复路径引用
- 创建激活脚本

#### 方法2: 手动安装

```bash
cd deployment/local/offline-packages

# 验证文件（可选）
sha256sum -c py38-env.tar.gz.sha256

# 创建安装目录
mkdir -p ~/conda-envs/py38

# 解压环境
tar -xzf py38-env.tar.gz -C ~/conda-envs/py38

# 激活环境
source ~/conda-envs/py38/bin/activate

# 修复路径（重要！）
conda-unpack

# 如果没有conda-unpack，安装它
pip install conda-pack
conda-unpack
```

### 3. 准备前端环境

#### 如果有前端node_modules备份

```bash
cd ../../frontend

# 解压node_modules
tar -xzf ../deployment/local/offline-packages/frontend-node-modules.tar.gz

# 构建项目
npm run build
```

#### 如果没有备份（需要最小化的npm）

```bash
# 确保有npm和Node.js
node --version
npm --version

# 安装依赖（需要npm缓存或离线registry）
npm install --prefer-offline

# 构建
npm run build
```

### 4. 配置环境

```bash
cd /path/to/llm-chat-v1

# 复制配置文件（如果不存在）
cp deployment-config.example.json deployment-config.local.json

# 编辑配置
vim deployment-config.local.json
```

关键配置项：
```json
{
  "deployment": {
    "type": "local"
  },
  "llm": {
    "api_url": "http://your-llm-server:11553/v1/chat/completions",
    "model": "glm4_32B_chat",
    "api_key": "your-api-key"
  },
  "backend": {
    "host": "0.0.0.0",
    "port": 8000
  },
  "frontend": {
    "port": 3000,
    "api_url": "http://your-server-ip:8000"
  }
}
```

应用配置：
```bash
bash apply-config.sh deployment-config.local.json
```

### 5. 启动服务

#### 使用离线conda环境

如果使用自动导入脚本安装的环境：

```bash
# 设置环境变量指向离线Python
export OFFLINE_CONDA_PATH=~/conda-envs/py38

# 启动服务
cd deployment/local
bash start.sh
```

或者直接使用激活脚本：

```bash
# 激活环境
source deployment/local/activate-py38.sh

# 启动（start.sh会自动检测conda环境）
cd deployment/local
bash start.sh
```

#### 验证启动

```bash
# 查看日志
tail -f logs/backend.log
tail -f logs/frontend.log

# 检查进程
ps aux | grep -E "uvicorn|next-server"

# 检查端口
netstat -tulnp | grep -E "8000|3000"
```

### 6. 访问服务

- 前端：http://your-server-ip:3000
- 后端API：http://your-server-ip:8000
- 管理后台：http://your-server-ip:3000/admin

默认管理员：
- 用户名：admin
- 密码：Admin@2025

### 7. 停止服务

```bash
cd deployment/local
bash stop.sh
```

## 故障排除

### Python环境问题

**问题：找不到Python模块**
```bash
# 确保已运行conda-unpack
source ~/conda-envs/py38/bin/activate
conda-unpack

# 验证Python路径
which python
python -c "import sys; print(sys.path)"

# 测试导入关键模块
python -c "import fastapi, uvicorn, sqlalchemy"
```

**问题：conda-unpack命令不存在**
```bash
# 激活环境后安装
source ~/conda-envs/py38/bin/activate
pip install conda-pack
conda-unpack
```

### 前端构建问题

**问题：npm install失败（离线环境）**

解决方案1：使用预构建的node_modules
```bash
# 在有网络的机器上
cd frontend
tar -czf node_modules.tar.gz node_modules

# 在离线机器上
tar -xzf node_modules.tar.gz
```

解决方案2：配置npm离线registry
```bash
# 在有网络的机器上创建本地registry
npm install -g verdaccio
verdaccio

# 发布所需包到本地registry
# 在离线机器上配置npm指向内网registry
npm config set registry http://internal-registry:4873
```

### 端口占用

```bash
# 检查端口占用
netstat -tulnp | grep -E "8000|3000"

# 清理端口
lsof -ti:8000 | xargs kill -9
lsof -ti:3000 | xargs kill -9

# 或使用stop.sh
bash stop.sh
```

### 数据库权限问题

```bash
# 检查数据库目录
ls -la db/

# 修复权限
chmod 755 db/
chmod 664 db/conversation.db  # 如果已存在
```

### 日志查看

```bash
# 实时查看日志
tail -f logs/backend.log
tail -f logs/frontend.log

# 查看错误
grep -i error logs/backend.log
grep -i error logs/frontend.log
```

## 系统要求

### 最小配置
- CPU: 2核
- 内存: 4GB
- 磁盘: 10GB（含环境和依赖）
- 操作系统: Linux (x86_64)

### 推荐配置
- CPU: 4核+
- 内存: 8GB+
- 磁盘: 20GB+
- 操作系统: Ubuntu 20.04+ / CentOS 7+

### 依赖要求
- Python: 3.8+ (通过conda环境提供)
- Node.js: 18.0+ (需要预装或离线安装)
- npm: 9.0+ (随Node.js)

## 离线包大小估算

| 组件 | 大小（估算） |
|-----|------------|
| conda py38环境 | 500MB - 1GB |
| 前端node_modules | 400MB - 800MB |
| 前端构建产物 | 50MB - 150MB |
| 项目代码 | 10MB - 50MB |
| **总计** | **1GB - 2.5GB** |

## 更新和维护

### 更新代码

```bash
# 如果有内网git服务器
git pull

# 或者手动传输更新的文件
# 重新启动服务
cd deployment/local
bash stop.sh
bash start.sh
```

### 更新依赖

如需更新Python或Node.js依赖，需要在有网络的环境重新导出：

```bash
# 在联网机器上
cd deployment/local
bash export-conda-env.sh

# 传输到离线机器
# 重新导入
bash import-conda-env.sh
```

## 备份和恢复

### 备份数据

```bash
# 备份数据库
cp db/conversation.db db/conversation.db.backup

# 备份配置
tar -czf config-backup.tar.gz \
  backend/.env \
  frontend/.env.local \
  deployment-config.local.json

# 完整备份
tar -czf llm-chat-backup-$(date +%Y%m%d).tar.gz \
  db/ \
  logs/ \
  backend/.env \
  frontend/.env.local
```

### 恢复数据

```bash
# 恢复数据库
cp db/conversation.db.backup db/conversation.db

# 恢复配置
tar -xzf config-backup.tar.gz
```

## 性能优化

### Python环境优化

```bash
# 使用环境变量优化
export PYTHONOPTIMIZE=1
export PYTHONDONTWRITEBYTECODE=1

# 在start.sh中启动
cd deployment/local
PYTHONOPTIMIZE=1 bash start.sh
```

### 前端优化

```bash
# 使用生产构建（start.sh已默认使用）
npm run build
npm start

# 禁用开发指示器
# 在frontend/next.config.js中已配置
```

## 安全建议

1. **修改默认密码**
   ```bash
   cd backend
   python set_admin.py --username admin --password "YourNewPassword"
   ```

2. **配置防火墙**
   ```bash
   # 只允许必要端口
   sudo firewall-cmd --permanent --add-port=3000/tcp
   sudo firewall-cmd --permanent --add-port=8000/tcp
   sudo firewall-cmd --reload
   ```

3. **定期备份**
   ```bash
   # 添加到crontab
   0 2 * * * cd /path/to/llm-chat-v1 && tar -czf backup-$(date +\%Y\%m\%d).tar.gz db/
   ```

## 常见问题

**Q: 离线环境conda-unpack失败怎么办？**

A: 手动修复路径引用：
```bash
# 编辑环境中的路径
cd ~/conda-envs/py38
grep -rl "/old/path" . | xargs sed -i 's|/old/path|/new/path|g'
```

**Q: 前端构建太慢？**

A: 在有网络的机器上预先构建，直接传输.next目录：
```bash
# 联网机器
npm run build
tar -czf frontend-build.tar.gz .next

# 离线机器
tar -xzf frontend-build.tar.gz
npm start
```

**Q: 如何完全离线安装Node.js？**

A: 下载Node.js二进制包：
```bash
# 在联网机器下载
wget https://nodejs.org/dist/v18.x.x/node-v18.x.x-linux-x64.tar.xz

# 传输到离线机器解压
tar -xf node-v18.x.x-linux-x64.tar.xz
sudo mv node-v18.x.x-linux-x64 /opt/nodejs
echo 'export PATH=/opt/nodejs/bin:$PATH' >> ~/.bashrc
source ~/.bashrc
```

## 附录

### 完整部署检查清单

- [ ] conda环境已导出并传输
- [ ] 前端依赖已准备（node_modules或npm缓存）
- [ ] 项目代码已传输
- [ ] 配置文件已准备
- [ ] conda环境已导入并修复
- [ ] 前端已构建
- [ ] 配置已应用
- [ ] 服务已启动
- [ ] 端口可访问
- [ ] 管理员账户可登录
- [ ] 对话功能正常

### 脚本文件清单

```
deployment/local/
├── export-conda-env.sh          # 导出conda环境
├── import-conda-env.sh          # 导入conda环境
├── start.sh                     # 启动服务
├── stop.sh                      # 停止服务
├── activate-py38.sh             # 激活环境（自动生成）
├── offline-packages/            # 离线包目录（自动生成）
│   ├── py38-env.tar.gz         # Python环境
│   ├── py38-env.tar.gz.sha256  # 校验和
│   ├── py38-environment.yml    # 环境配置
│   └── README.txt              # 说明文档
└── OFFLINE_DEPLOYMENT_GUIDE.md  # 本文档
```

## 技术支持

如遇到问题，请检查：
1. 日志文件：`logs/backend.log`, `logs/frontend.log`
2. 环境变量：`env | grep -E "PYTHON|PATH"`
3. 进程状态：`ps aux | grep -E "uvicorn|next"`
4. 端口状态：`netstat -tulnp | grep -E "8000|3000"`

更多帮助请参考：
- [README.md](../../README.md) - 项目总览
- [SCRIPTS_REFERENCE.md](../../SCRIPTS_REFERENCE.md) - 脚本参考
- [QUICK_START.md](../../QUICK_START.md) - 快速开始
