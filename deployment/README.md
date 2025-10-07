# 📦 部署文件目录

本目录包含LLM Chat System的所有部署相关文件和文档，已按部署方式分类整理。

## 📁 目录结构

```
deployment/
├── docker/                    # Docker部署相关
│   ├── docker-compose.yml     # Docker编排文件
│   ├── docker-compose.override.yml  # Docker配置覆盖
│   ├── docker-deploy.sh       # Docker部署脚本
│   ├── update-docker-mirror.sh # Docker镜像源更新脚本
│   ├── create-offline-package.sh # 离线包创建脚本
│   ├── .dockerignore          # Docker忽略文件
│   ├── docker-build-cache/    # Docker构建缓存
│   ├── DOCKER_DEPLOYMENT_GUIDE.md  # Docker部署指南
│   ├── PRODUCTION_DEPLOYMENT_GUIDE.md  # 生产环境部署指南
│   ├── online/                # 在线部署
│   │   ├── ONLINE_DEPLOYMENT_GUIDE.md  # 在线部署指南
│   │   ├── DEPENDENCIES.md    # 依赖清单
│   │   ├── online-deploy.sh   # 在线部署脚本
│   │   └── README.md          # 在线部署说明
│   ├── offline/               # 离线部署
│   │   ├── OFFLINE_DEPLOYMENT_GUIDE.md  # 离线部署指南
│   │   ├── offline-deploy.sh  # 离线部署脚本
│   │   ├── install-docker-offline.sh  # 离线Docker安装
│   │   ├── llm-chat-images.tar  # Docker镜像包
│   │   ├── project-source.tar.gz  # 项目源码
│   │   ├── QUICK_START.txt    # 快速开始
│   │   └── README.txt         # 离线部署说明
│   └── offline-package/       # 离线部署包（备份）
│
├── local/                     # 本地部署相关
│   ├── deploy.sh              # 本地部署脚本
│   ├── start.sh               # 启动脚本
│   ├── stop.sh                # 停止脚本
│   ├── restart.sh             # 重启脚本
│   ├── start-services.sh      # 启动服务脚本
│   ├── stop-services.sh       # 停止服务脚本
│   ├── restart-services.sh    # 重启服务脚本
│   ├── status-services.sh     # 服务状态查看
│   ├── DEPLOYMENT.md          # 本地部署指南
│   ├── QUICKSTART.md          # 快速开始指南
│   └── systemd/               # Systemd服务配置
│       ├── llm-chat-backend.service
│       └── llm-chat-frontend.service
│
└── docs/                      # 通用部署文档
    ├── QUICK_DEPLOY.md        # 快速部署指南（包含多种方式）
    ├── DEPLOYMENT_NOTES.md    # 部署说明
    ├── DEPLOYMENT_PACKAGES_SUMMARY.md  # 部署包总结
    ├── MIGRATION_GUIDE.md     # 迁移指南
    └── OFFLINE_DEPLOYMENT_UPDATE.md  # 离线部署更新说明
```

## 🚀 快速部署

### Docker部署（推荐）

#### 在线环境
```bash
cd deployment/docker/online
./online-deploy.sh
```

#### 离线环境
```bash
cd deployment/docker/offline
./offline-deploy.sh
```

详细说明：
- [在线部署指南](docker/online/ONLINE_DEPLOYMENT_GUIDE.md)
- [离线部署指南](docker/offline/OFFLINE_DEPLOYMENT_GUIDE.md)
- [Docker部署指南](docker/DOCKER_DEPLOYMENT_GUIDE.md)

### 本地部署

#### 快速启动
```bash
cd deployment/local
./start.sh
```

#### 完整部署
```bash
cd deployment/local
./deploy.sh
```

详细说明：
- [本地部署指南](local/DEPLOYMENT.md)
- [快速开始指南](local/QUICKSTART.md)

## 📚 文档说明

### Docker部署文档
- **DOCKER_DEPLOYMENT_GUIDE.md**: Docker完整部署方案，包含配置和优化建议
- **PRODUCTION_DEPLOYMENT_GUIDE.md**: 生产环境部署指南，包含安全配置
- **online/ONLINE_DEPLOYMENT_GUIDE.md**: 有网络环境的快速部署方案
- **offline/OFFLINE_DEPLOYMENT_GUIDE.md**: 无网络环境的离线部署方案

### 本地部署文档
- **DEPLOYMENT.md**: 本地环境部署完整指南
- **QUICKSTART.md**: 快速启动说明

### 通用文档
- **QUICK_DEPLOY.md**: 快速部署指南，包含多种部署方式对比
- **DEPLOYMENT_NOTES.md**: 部署注意事项
- **MIGRATION_GUIDE.md**: 项目迁移指南

## 🔧 脚本说明

### Docker脚本
- `docker-deploy.sh`: Docker一键部署脚本
- `online-deploy.sh`: 在线环境部署脚本
- `offline-deploy.sh`: 离线环境部署脚本
- `create-offline-package.sh`: 创建离线部署包
- `update-docker-mirror.sh`: 更新Docker镜像源

### 本地脚本
- `deploy.sh`: 完整部署脚本（安装依赖+启动服务）
- `start.sh`: 启动前后端服务
- `stop.sh`: 停止前后端服务
- `restart.sh`: 重启前后端服务
- `status-services.sh`: 查看服务状态

## 💡 部署方式选择

| 部署方式 | 适用场景 | 优点 | 缺点 |
|---------|---------|------|------|
| **Docker在线部署** | 有网络的生产环境 | 简单快速、环境一致 | 需要网络连接 |
| **Docker离线部署** | 无网络的生产环境 | 完全离线、安全可控 | 需要提前准备离线包 |
| **本地部署** | 开发测试环境 | 灵活调试、快速迭代 | 需要配置环境 |

## 📝 注意事项

1. **Docker部署**：
   - 确保Docker和Docker Compose已安装
   - 离线部署需要提前准备离线包
   - 注意配置文件中的IP和端口

2. **本地部署**：
   - 需要Python 3.8+和Node.js 18+
   - 首次部署会自动安装依赖
   - systemd服务需要root权限

3. **生产环境**：
   - 修改默认的SECRET_KEY
   - 配置防火墙和安全组
   - 定期备份数据库

## 🔗 相关链接

- [项目主页](../README.md)
- [更新日志](../CHANGELOG.md)
- [文档索引](../DOCUMENTATION_INDEX.md)
- [API文档](http://localhost:8000/docs)
