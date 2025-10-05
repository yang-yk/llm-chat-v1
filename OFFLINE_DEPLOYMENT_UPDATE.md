# 离线部署方案更新说明

## 📅 更新时间
2025-10-05

## 🎯 更新目标

提供一个完整的离线部署解决方案，确保可以在任何新服务器上快速搭建服务，支持：
- ✅ 无网络环境部署
- ✅ 灵活配置 IP 地址
- ✅ 灵活配置端口
- ✅ 一键部署脚本
- ✅ 完整的镜像打包

## 📦 更新内容

### 1. 新增打包脚本

**文件**: `create-offline-package.sh`

**功能**:
- 自动打包项目源码
- 导出所有 Docker 镜像
- 复制部署脚本和文档
- 生成文件清单
- 创建压缩包

**使用方法**:
```bash
cd /home/data2/yangyk/llm-chat-v1
bash create-offline-package.sh
```

**输出**:
- `offline-deployment-package/` 目录
- `llm-chat-offline-YYYYMMDD-HHMMSS.tar.gz` 压缩包

### 2. 更新部署脚本

**文件**: `offline-deployment/offline-deploy.sh`

**改进**:
- ✨ 支持自定义服务器 IP/域名
- ✨ 支持自定义所有端口（Nginx, 前端, 后端）
- ✨ 支持自定义部署目录
- ✨ 支持自定义模型配置
- ✨ 支持自定义管理员账号
- ✨ 自动生成配置文件
- ✨ 配置确认机制
- ✨ 详细的部署信息记录
- ✨ 彩色输出和进度提示

**配置参数**:
1. 服务器地址 (必填)
2. Nginx 端口 (默认 80)
3. 前端端口 (默认 3000)
4. 后端端口 (默认 8000)
5. 部署目录 (默认 /opt/llm-chat)
6. 模型 API 地址
7. 模型名称
8. 模型 API Key
9. 管理员用户名
10. 管理员密码

### 3. 更新文档

**文件**: `offline-deployment/OFFLINE_DEPLOYMENT_GUIDE.md`

**改进**:
- 📚 简化内容，更易理解
- 📊 添加配置参数表格
- 🎨 使用图标和表格美化
- 📋 添加常用命令快速参考
- 🐛 扩展故障排查章节
- ❓ 添加常见问题解答

## 🗂️ 文件结构

```
/home/data2/yangyk/llm-chat-v1/
├── create-offline-package.sh          # 新增：打包脚本
├── offline-deployment/
│   ├── offline-deploy.sh             # 更新：v2.0 部署脚本
│   ├── OFFLINE_DEPLOYMENT_GUIDE.md   # 更新：简化文档
│   ├── install-docker-offline.sh     # 保留
│   ├── llm-chat-images.tar          # 镜像文件（需生成）
│   └── project-source.tar.gz        # 源码文件（需生成）
└── OFFLINE_DEPLOYMENT_UPDATE.md       # 本文件
```

## 📝 部署包内容

运行 `create-offline-package.sh` 后生成的部署包包含：

```
offline-deployment-package/
├── project-source.tar.gz              # 项目源码
├── llm-chat-images.tar               # Docker 镜像 (3个)
│   ├── llm-chat-v1-backend:latest
│   ├── llm-chat-v1-frontend:latest
│   └── nginx:alpine
├── offline-deploy.sh                 # 部署脚本
├── install-docker-offline.sh         # Docker 安装脚本
├── OFFLINE_DEPLOYMENT_GUIDE.md       # 部署文档
├── README.txt                        # 说明文件
├── QUICK_START.txt                   # 快速开始
└── file-checklist.md                 # 文件清单
```

## 🚀 使用流程

### 步骤 1: 生成部署包（有网络环境）

```bash
cd /home/data2/yangyk/llm-chat-v1
bash create-offline-package.sh
```

生成文件：`llm-chat-offline-YYYYMMDD-HHMMSS.tar.gz`

### 步骤 2: 传输到目标服务器

使用 U 盘、SCP、FTP 等方式传输压缩包。

### 步骤 3: 解压并部署（无网络环境）

```bash
# 解压
tar xzf llm-chat-offline-YYYYMMDD-HHMMSS.tar.gz
cd offline-deployment-package

# 部署
bash offline-deploy.sh
```

### 步骤 4: 配置参数

按照提示输入：
- 服务器 IP
- 端口（或使用默认值）
- 部署目录
- 模型配置
- 管理员账号

### 步骤 5: 访问服务

```
http://您的IP:端口
```

## 🔑 关键特性

### 1. 完全离线

- ✅ 所有依赖已打包
- ✅ 不需要网络连接
- ✅ 包含完整 Docker 镜像
- ✅ 包含所有源代码

### 2. 灵活配置

- ✅ 任意 IP 地址
- ✅ 任意端口
- ✅ 任意部署目录
- ✅ 任意模型配置

### 3. 一键部署

- ✅ 自动解压
- ✅ 自动加载镜像
- ✅ 自动生成配置
- ✅ 自动启动服务
- ✅ 自动创建管理员

### 4. 完整记录

部署信息自动保存到 `deployment-info.txt`：
- 部署时间
- 服务器配置
- 访问地址
- 安全凭证
- 模型配置
- 常用命令
- 备份方法

## 📋 配置文件自动生成

部署脚本会自动生成以下配置文件：

### 1. docker-compose.yml

```yaml
services:
  backend:
    environment:
      - LLM_API_URL=${用户输入}
      - PORT=${用户输入的后端端口}
      - SECRET_KEY=${自动生成}

  frontend:
    ports:
      - "${用户输入的前端端口}:3000"
    environment:
      - NEXT_PUBLIC_API_URL=http://${服务器IP}:${后端端口}

  nginx:
    # 使用 host 网络模式
```

### 2. nginx/default.conf

```nginx
server {
    listen ${用户输入的Nginx端口};

    location /api/ {
        proxy_pass http://127.0.0.1:${后端端口}/api/;
    }

    location / {
        proxy_pass http://127.0.0.1:${前端端口};
    }
}
```

### 3. frontend/.env.local

```bash
NEXT_PUBLIC_API_URL=http://${服务器IP}:${后端端口}
BACKEND_URL=http://172.17.0.1:${后端端口}
```

## ⚠️ 重要提示

### 打包前确认

1. ✅ 确保在项目根目录
2. ✅ 确保 Docker 镜像是最新的
3. ✅ 确保有足够的磁盘空间（约 2-3GB）
4. ✅ 确保已测试所有功能正常

### 部署前确认

1. ✅ 目标服务器已安装 Docker
2. ✅ 目标服务器有足够磁盘空间（至少 5GB）
3. ✅ 确认服务器 IP 地址正确
4. ✅ 确认端口未被占用
5. ✅ 确认有管理员权限

### 安全建议

1. 🔒 首次登录后立即修改管理员密码
2. 🔒 妥善保管 `deployment-info.txt`
3. 🔒 定期备份数据库
4. 🔒 配置防火墙规则
5. 🔒 生产环境使用 HTTPS

## 🔄 版本对比

| 功能 | v1.0 | v2.0 (本次更新) |
|------|------|-----------------|
| IP 配置 | 固定/手动修改 | 部署时配置 ✨ |
| 端口配置 | 固定 | 完全可配置 ✨ |
| 部署目录 | 固定 | 可自定义 ✨ |
| 配置文件 | 手动编辑 | 自动生成 ✨ |
| 部署确认 | 无 | 有 ✨ |
| 部署记录 | 简单 | 详细 ✨ |
| 打包工具 | 手动 | 自动化脚本 ✨ |
| 文档 | 复杂 | 简化清晰 ✨ |

## 📚 相关文档

- [README.md](README.md) - 项目主文档
- [QUICK_REFERENCE.md](QUICK_REFERENCE.md) - 快速参考
- [MIGRATION_GUIDE.md](MIGRATION_GUIDE.md) - 迁移指南
- [CHANGELOG.md](CHANGELOG.md) - 更新日志
- [offline-deployment/OFFLINE_DEPLOYMENT_GUIDE.md](offline-deployment/OFFLINE_DEPLOYMENT_GUIDE.md) - 离线部署指南

## 🎓 使用示例

### 示例 1: 默认配置部署

```bash
bash offline-deploy.sh

# 输入配置：
服务器地址: 192.168.1.100
Nginx 端口: [回车使用默认 80]
前端端口: [回车使用默认 3000]
后端端口: [回车使用默认 8000]
部署目录: [回车使用默认 /opt/llm-chat]
...其他配置使用默认值

# 访问: http://192.168.1.100
```

### 示例 2: 自定义端口部署

```bash
bash offline-deploy.sh

# 输入配置：
服务器地址: 10.0.0.50
Nginx 端口: 8080
前端端口: 3001
后端端口: 8001
...

# 访问: http://10.0.0.50:8080
```

### 示例 3: 内网部署

```bash
bash offline-deploy.sh

# 输入配置：
服务器地址: 172.16.10.100
Nginx 端口: 80
...

# 访问: http://172.16.10.100
```

## 🛠️ 故障排查快速参考

| 问题 | 可能原因 | 解决方法 |
|------|----------|----------|
| 容器无法启动 | 端口被占用 | 检查端口，修改配置 |
| 无法访问 | 防火墙 | 开放端口 |
| 前端报错 | 配置错误 | 检查环境变量 |
| 镜像加载失败 | 磁盘空间不足 | 清理空间 |

## ✅ 测试清单

部署完成后的测试：

- [ ] 访问主页正常显示
- [ ] 注册新用户成功
- [ ] 登录功能正常
- [ ] 创建对话成功
- [ ] AI 回复正常
- [ ] 管理后台可访问
- [ ] 管理员登录成功
- [ ] 用户列表显示正常
- [ ] 统计数据显示正常

## 📞 获取帮助

1. 查看文档: `OFFLINE_DEPLOYMENT_GUIDE.md`
2. 查看日志: `docker compose logs -f`
3. 检查配置: `cat deployment-info.txt`
4. 参考故障排查章节

---

**更新版本**: v2.0
**更新时间**: 2025-10-05
**维护人员**: LLM Chat Team
