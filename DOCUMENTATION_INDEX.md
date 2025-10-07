# 📚 文档索引

## 🎯 快速开始

### 新用户必读
1. **[README.md](README.md)** - 项目概述和特性介绍
2. **[QUICK_REFERENCE.md](QUICK_REFERENCE.md)** ⭐ - 快速参考手册（推荐）
3. **[deployment/local/QUICKSTART.md](deployment/local/QUICKSTART.md)** - 快速开始指南

### 最近更新
- **[CHANGELOG.md](CHANGELOG.md)** ⭐ - 详细更新日志（2025-10-05）
- **[deployment/docs/MIGRATION_GUIDE.md](deployment/docs/MIGRATION_GUIDE.md)** ⭐ - 项目迁移指南

## 📖 部署文档

### 部署目录总览
- **[deployment/README.md](deployment/README.md)** ⭐ - 部署文件目录索引（推荐从这里开始）

### Docker 部署（推荐）
- **[deployment/docker/DOCKER_DEPLOYMENT_GUIDE.md](deployment/docker/DOCKER_DEPLOYMENT_GUIDE.md)** - Docker 完整部署指南
- **[deployment/docs/QUICK_DEPLOY.md](deployment/docs/QUICK_DEPLOY.md)** - 快速部署（一键部署）
- **[deployment/docker/docker-deploy.sh](deployment/docker/docker-deploy.sh)** - 自动化部署脚本

### 生产环境部署
- **[deployment/docker/PRODUCTION_DEPLOYMENT_GUIDE.md](deployment/docker/PRODUCTION_DEPLOYMENT_GUIDE.md)** - 生产环境部署指南
- **[deployment/local/DEPLOYMENT.md](deployment/local/DEPLOYMENT.md)** - 本地部署文档
- **[deployment/docs/DEPLOYMENT_NOTES.md](deployment/docs/DEPLOYMENT_NOTES.md)** - 部署注意事项

### 在线部署
- **[deployment/docker/online/ONLINE_DEPLOYMENT_GUIDE.md](deployment/docker/online/ONLINE_DEPLOYMENT_GUIDE.md)** ⭐ - 在线部署完整指南
- **[deployment/docker/online/online-deploy.sh](deployment/docker/online/online-deploy.sh)** - 一键部署脚本（自动安装 Docker）
- **[deployment/docker/online/DEPENDENCIES.md](deployment/docker/online/DEPENDENCIES.md)** ⭐ - 依赖包和版本清单
- **[deployment/docker/online/README.md](deployment/docker/online/README.md)** - 在线部署说明

### 离线部署（新版）
- **[OFFLINE_DEPLOYMENT.md](OFFLINE_DEPLOYMENT.md)** ⭐⭐⭐ - 离线部署总指南（推荐入口）
- **[OFFLINE_QUICK_START.md](OFFLINE_QUICK_START.md)** ⭐⭐ - 5分钟快速开始
- **[deployment/local/OFFLINE_DEPLOYMENT_GUIDE.md](deployment/local/OFFLINE_DEPLOYMENT_GUIDE.md)** ⭐ - 本地离线部署详细指南
- **[deployment/docker/OFFLINE_DEPLOYMENT_GUIDE.md](deployment/docker/OFFLINE_DEPLOYMENT_GUIDE.md)** ⭐ - Docker离线部署详细指南

#### 离线部署脚本
- **本地部署**:
  - `deployment/local/export-conda-env.sh` - 导出conda环境
  - `deployment/local/import-conda-env.sh` - 导入conda环境
- **Docker部署**:
  - `deployment/docker/export-docker-images.sh` - 导出Docker镜像
  - `deployment/docker/import-docker-images.sh` - 导入Docker镜像

### 离线部署（旧版）
- **[deployment/docs/OFFLINE_DEPLOYMENT_UPDATE.md](deployment/docs/OFFLINE_DEPLOYMENT_UPDATE.md)** - 离线部署方案更新说明 (v2.0)
- **[deployment/docker/offline/OFFLINE_DEPLOYMENT_GUIDE.md](deployment/docker/offline/OFFLINE_DEPLOYMENT_GUIDE.md)** - 旧版离线部署指南
- **[deployment/docker/offline/offline-deploy.sh](deployment/docker/offline/offline-deploy.sh)** - 一键部署脚本
- **[deployment/docker/create-offline-package.sh](deployment/docker/create-offline-package.sh)** - 创建离线部署包脚本

### Docker 构建缓存
- **[deployment/docker/docker-build-cache/README.md](deployment/docker/docker-build-cache/README.md)** ⭐ - Docker 构建缓存完整指南
- **[deployment/docker/docker-build-cache/QUICK_START.md](deployment/docker/docker-build-cache/QUICK_START.md)** - 快速开始（5分钟上手）
- **[deployment/docker/docker-build-cache/INTEGRATION_GUIDE.md](deployment/docker/docker-build-cache/INTEGRATION_GUIDE.md)** - 离线部署集成指南
- **[deployment/docker/docker-build-cache/export-build-cache.sh](deployment/docker/docker-build-cache/export-build-cache.sh)** - 缓存导出脚本

## 🔧 配置和管理

### 系统管理
- **[deployment/local/deploy.sh](deployment/local/deploy.sh)** - 标准部署脚本
- **[deployment/local/start.sh](deployment/local/start.sh)** - 启动服务脚本
- **[deployment/local/stop.sh](deployment/local/stop.sh)** - 停止服务脚本
- **[deployment/local/restart.sh](deployment/local/restart.sh)** - 重启服务脚本

### 服务管理（Systemd）
- **[deployment/local/systemd/llm-chat-backend.service](deployment/local/systemd/llm-chat-backend.service)** - 后端服务单元
- **[deployment/local/systemd/llm-chat-frontend.service](deployment/local/systemd/llm-chat-frontend.service)** - 前端服务单元
- **[deployment/local/start-services.sh](deployment/local/start-services.sh)** - 启动 systemd 服务
- **[deployment/local/stop-services.sh](deployment/local/stop-services.sh)** - 停止 systemd 服务
- **[deployment/local/restart-services.sh](deployment/local/restart-services.sh)** - 重启 systemd 服务
- **[deployment/local/status-services.sh](deployment/local/status-services.sh)** - 查看服务状态

## 🐛 故障排查

### 常见问题
- **[TROUBLESHOOTING_FAILED_TO_FETCH.md](TROUBLESHOOTING_FAILED_TO_FETCH.md)** - 网络请求失败排查
- **[QUICK_FIX_MODEL_ACCESS.md](QUICK_FIX_MODEL_ACCESS.md)** - 模型访问问题快速修复

### 配置修复
- **[deployment/docker/update-docker-mirror.sh](deployment/docker/update-docker-mirror.sh)** - 更新 Docker 镜像源

## 📋 项目管理

### 开发文档
- **[PROJECT_SUMMARY.md](PROJECT_SUMMARY.md)** - 项目总结
- **[STRUCTURE.md](STRUCTURE.md)** - 项目结构说明
- **[TODO.md](TODO.md)** - 待办事项
- **[UPDATES.md](UPDATES.md)** - 功能更新记录
- **[FINAL_CHECKLIST.md](FINAL_CHECKLIST.md)** - 最终检查清单

### 前端文档
- **[frontend/README.md](frontend/README.md)** - 前端项目说明

## 📊 按用途分类

### 🚀 我想部署项目
1. 部署总览：[deployment/README.md](deployment/README.md) ⭐
2. 新手：[deployment/docs/QUICK_DEPLOY.md](deployment/docs/QUICK_DEPLOY.md)
3. **在线部署**：[deployment/docker/online/ONLINE_DEPLOYMENT_GUIDE.md](deployment/docker/online/ONLINE_DEPLOYMENT_GUIDE.md)
4. **离线部署**：
   - 快速开始：[OFFLINE_QUICK_START.md](OFFLINE_QUICK_START.md) ⭐
   - 完整指南：[OFFLINE_DEPLOYMENT.md](OFFLINE_DEPLOYMENT.md) ⭐⭐⭐
   - 本地详细：[deployment/local/OFFLINE_DEPLOYMENT_GUIDE.md](deployment/local/OFFLINE_DEPLOYMENT_GUIDE.md)
   - Docker详细：[deployment/docker/OFFLINE_DEPLOYMENT_GUIDE.md](deployment/docker/OFFLINE_DEPLOYMENT_GUIDE.md)
5. Docker：[deployment/docker/DOCKER_DEPLOYMENT_GUIDE.md](deployment/docker/DOCKER_DEPLOYMENT_GUIDE.md)
6. 生产环境：[deployment/docker/PRODUCTION_DEPLOYMENT_GUIDE.md](deployment/docker/PRODUCTION_DEPLOYMENT_GUIDE.md)

### 🔍 我遇到了问题
1. 网络问题：[TROUBLESHOOTING_FAILED_TO_FETCH.md](TROUBLESHOOTING_FAILED_TO_FETCH.md)
2. 模型访问：[QUICK_FIX_MODEL_ACCESS.md](QUICK_FIX_MODEL_ACCESS.md)
3. 快速参考：[QUICK_REFERENCE.md](QUICK_REFERENCE.md)

### 📝 我想了解项目
1. 项目介绍：[README.md](README.md)
2. 项目结构：[STRUCTURE.md](STRUCTURE.md)
3. 项目总结：[PROJECT_SUMMARY.md](PROJECT_SUMMARY.md)

### 🔄 我想更新/迁移
1. 更新日志：[CHANGELOG.md](CHANGELOG.md)
2. 迁移指南：[deployment/docs/MIGRATION_GUIDE.md](deployment/docs/MIGRATION_GUIDE.md)
3. 更新记录：[UPDATES.md](UPDATES.md)

### ⚙️ 我想管理服务
1. 快速参考：[QUICK_REFERENCE.md](QUICK_REFERENCE.md)
2. Systemd 服务：[deployment/local/systemd/](deployment/local/systemd/)
3. 管理脚本：[deployment/local/start.sh](deployment/local/start.sh), [deployment/local/stop.sh](deployment/local/stop.sh), [deployment/local/restart.sh](deployment/local/restart.sh)

## 🎓 学习路径

### 新手入门
```
README.md → deployment/local/QUICKSTART.md → deployment/docs/QUICK_DEPLOY.md → QUICK_REFERENCE.md
```

### 运维人员
```
README.md → deployment/README.md → deployment/docker/DOCKER_DEPLOYMENT_GUIDE.md
→ deployment/docker/PRODUCTION_DEPLOYMENT_GUIDE.md → QUICK_REFERENCE.md → TROUBLESHOOTING_FAILED_TO_FETCH.md
```

### 开发人员
```
README.md → STRUCTURE.md → PROJECT_SUMMARY.md → frontend/README.md
→ CHANGELOG.md
```

## 📌 重要提示

### ⚠️ 项目路径已更新
项目已从 `/home/yangyk/llm-chat/llm-chat-v1` 迁移到 `/home/data2/yangyk/llm-chat-v1`

**必读文档**:
- [deployment/docs/MIGRATION_GUIDE.md](deployment/docs/MIGRATION_GUIDE.md)
- [CHANGELOG.md](CHANGELOG.md)

### 🔑 关键信息
- **项目路径**: `/home/data2/yangyk/llm-chat-v1`
- **访问地址**: http://111.19.168.151
- **前端端口**: 3000
- **后端端口**: 8000
- **Nginx 端口**: 80

### 📅 最后更新
2025-10-05

## 💡 文档建议

### 文档优先级
1. ⭐⭐⭐ **必读**: QUICK_REFERENCE.md, CHANGELOG.md, deployment/docs/MIGRATION_GUIDE.md
2. ⭐⭐ **推荐**: README.md, deployment/README.md, deployment/docker/DOCKER_DEPLOYMENT_GUIDE.md
3. ⭐ **参考**: 其他专题文档

### 获取帮助
1. 查看对应文档
2. 检查 [TROUBLESHOOTING_FAILED_TO_FETCH.md](TROUBLESHOOTING_FAILED_TO_FETCH.md)
3. 查看日志: `docker compose logs -f`
4. 查看 [QUICK_REFERENCE.md](QUICK_REFERENCE.md) 的故障排查部分

## 📂 文档组织

```
/home/data2/yangyk/llm-chat-v1/
├── README.md                           # 项目主文档 ⭐
├── QUICK_REFERENCE.md                  # 快速参考 ⭐
├── CHANGELOG.md                        # 更新日志 ⭐
├── DOCUMENTATION_INDEX.md              # 本文件
│
├── deployment/                         # 部署相关 ⭐⭐⭐
│   ├── README.md                       # 部署目录索引
│   │
│   ├── docker/                         # Docker 部署
│   │   ├── docker-compose.yml
│   │   ├── docker-deploy.sh
│   │   ├── DOCKER_DEPLOYMENT_GUIDE.md
│   │   ├── PRODUCTION_DEPLOYMENT_GUIDE.md
│   │   ├── online/                     # 在线部署
│   │   │   ├── ONLINE_DEPLOYMENT_GUIDE.md
│   │   │   ├── online-deploy.sh
│   │   │   ├── DEPENDENCIES.md
│   │   │   └── README.md
│   │   ├── offline/                    # 离线部署
│   │   │   ├── OFFLINE_DEPLOYMENT_GUIDE.md
│   │   │   ├── offline-deploy.sh
│   │   │   └── file-checklist.md
│   │   └── docker-build-cache/         # Docker 构建缓存
│   │
│   ├── local/                          # 本地部署
│   │   ├── deploy.sh
│   │   ├── start.sh, stop.sh, restart.sh
│   │   ├── DEPLOYMENT.md
│   │   ├── QUICKSTART.md
│   │   └── systemd/                    # Systemd 服务
│   │
│   └── docs/                           # 通用部署文档
│       ├── QUICK_DEPLOY.md
│       ├── DEPLOYMENT_NOTES.md
│       ├── MIGRATION_GUIDE.md
│       └── OFFLINE_DEPLOYMENT_UPDATE.md
│
├── 故障排查/
│   ├── TROUBLESHOOTING_FAILED_TO_FETCH.md
│   └── QUICK_FIX_MODEL_ACCESS.md
│
└── 项目管理/
    ├── PROJECT_SUMMARY.md
    ├── STRUCTURE.md
    ├── TODO.md
    ├── UPDATES.md
    └── FINAL_CHECKLIST.md
```

---

**提示**: 使用 `Ctrl+F` 搜索关键词快速定位所需文档。
