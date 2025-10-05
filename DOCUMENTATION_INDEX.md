# 📚 文档索引

## 🎯 快速开始

### 新用户必读
1. **[README.md](README.md)** - 项目概述和特性介绍
2. **[QUICK_REFERENCE.md](QUICK_REFERENCE.md)** ⭐ - 快速参考手册（推荐）
3. **[QUICKSTART.md](QUICKSTART.md)** - 快速开始指南

### 最近更新
- **[CHANGELOG.md](CHANGELOG.md)** ⭐ - 详细更新日志（2025-10-05）
- **[MIGRATION_GUIDE.md](MIGRATION_GUIDE.md)** ⭐ - 项目迁移指南

## 📖 部署文档

### Docker 部署（推荐）
- **[DOCKER_DEPLOYMENT_GUIDE.md](DOCKER_DEPLOYMENT_GUIDE.md)** - Docker 完整部署指南
- **[QUICK_DEPLOY.md](QUICK_DEPLOY.md)** - 快速部署（一键部署）
- **[docker-deploy.sh](docker-deploy.sh)** - 自动化部署脚本

### 生产环境部署
- **[PRODUCTION_DEPLOYMENT_GUIDE.md](PRODUCTION_DEPLOYMENT_GUIDE.md)** - 生产环境部署指南
- **[DEPLOYMENT.md](DEPLOYMENT.md)** - 通用部署文档
- **[DEPLOYMENT_NOTES.md](DEPLOYMENT_NOTES.md)** - 部署注意事项

### 在线部署
- **[online-deployment/ONLINE_DEPLOYMENT_GUIDE.md](online-deployment/ONLINE_DEPLOYMENT_GUIDE.md)** ⭐ - 在线部署完整指南
- **[online-deployment/online-deploy.sh](online-deployment/online-deploy.sh)** - 一键部署脚本（自动安装 Docker）
- **[online-deployment/DEPENDENCIES.md](online-deployment/DEPENDENCIES.md)** ⭐ - 依赖包和版本清单
- **[online-deployment/README.md](online-deployment/README.md)** - 在线部署说明

### 离线部署
- **[OFFLINE_DEPLOYMENT_UPDATE.md](OFFLINE_DEPLOYMENT_UPDATE.md)** ⭐ - 离线部署方案更新说明 (v2.0)
- **[offline-deployment/OFFLINE_DEPLOYMENT_GUIDE.md](offline-deployment/OFFLINE_DEPLOYMENT_GUIDE.md)** ⭐ - 离线部署完整指南
- **[offline-deployment/offline-deploy.sh](offline-deployment/offline-deploy.sh)** - 一键部署脚本 (支持灵活配置)
- **[create-offline-package.sh](create-offline-package.sh)** - 创建离线部署包脚本

## 🔧 配置和管理

### 系统管理
- **[deploy.sh](deploy.sh)** - 标准部署脚本
- **[start.sh](start.sh)** - 启动服务脚本
- **[stop.sh](stop.sh)** - 停止服务脚本
- **[restart.sh](restart.sh)** - 重启服务脚本

### 服务管理（Systemd）
- **[systemd/llm-chat-backend.service](systemd/llm-chat-backend.service)** - 后端服务单元
- **[systemd/llm-chat-frontend.service](systemd/llm-chat-frontend.service)** - 前端服务单元
- **[start-services.sh](start-services.sh)** - 启动 systemd 服务
- **[stop-services.sh](stop-services.sh)** - 停止 systemd 服务
- **[restart-services.sh](restart-services.sh)** - 重启 systemd 服务
- **[status-services.sh](status-services.sh)** - 查看服务状态

## 🐛 故障排查

### 常见问题
- **[TROUBLESHOOTING_FAILED_TO_FETCH.md](TROUBLESHOOTING_FAILED_TO_FETCH.md)** - 网络请求失败排查
- **[QUICK_FIX_MODEL_ACCESS.md](QUICK_FIX_MODEL_ACCESS.md)** - 模型访问问题快速修复

### 配置修复
- **[update-docker-mirror.sh](update-docker-mirror.sh)** - 更新 Docker 镜像源

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
1. 新手：[QUICK_DEPLOY.md](QUICK_DEPLOY.md)
2. 在线部署：[online-deployment/ONLINE_DEPLOYMENT_GUIDE.md](online-deployment/ONLINE_DEPLOYMENT_GUIDE.md)
3. 离线部署：[offline-deployment/OFFLINE_DEPLOYMENT_GUIDE.md](offline-deployment/OFFLINE_DEPLOYMENT_GUIDE.md)
4. Docker：[DOCKER_DEPLOYMENT_GUIDE.md](DOCKER_DEPLOYMENT_GUIDE.md)
5. 生产环境：[PRODUCTION_DEPLOYMENT_GUIDE.md](PRODUCTION_DEPLOYMENT_GUIDE.md)

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
2. 迁移指南：[MIGRATION_GUIDE.md](MIGRATION_GUIDE.md)
3. 更新记录：[UPDATES.md](UPDATES.md)

### ⚙️ 我想管理服务
1. 快速参考：[QUICK_REFERENCE.md](QUICK_REFERENCE.md)
2. Systemd 服务：[systemd/](systemd/)
3. 管理脚本：[start.sh](start.sh), [stop.sh](stop.sh), [restart.sh](restart.sh)

## 🎓 学习路径

### 新手入门
```
README.md → QUICKSTART.md → QUICK_DEPLOY.md → QUICK_REFERENCE.md
```

### 运维人员
```
README.md → DOCKER_DEPLOYMENT_GUIDE.md → PRODUCTION_DEPLOYMENT_GUIDE.md
→ QUICK_REFERENCE.md → TROUBLESHOOTING_FAILED_TO_FETCH.md
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
- [MIGRATION_GUIDE.md](MIGRATION_GUIDE.md)
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
1. ⭐⭐⭐ **必读**: QUICK_REFERENCE.md, CHANGELOG.md, MIGRATION_GUIDE.md
2. ⭐⭐ **推荐**: README.md, DOCKER_DEPLOYMENT_GUIDE.md
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
├── MIGRATION_GUIDE.md                  # 迁移指南 ⭐
├── DOCUMENTATION_INDEX.md              # 本文件
│
├── 部署文档/
│   ├── QUICKSTART.md
│   ├── QUICK_DEPLOY.md
│   ├── DOCKER_DEPLOYMENT_GUIDE.md
│   ├── PRODUCTION_DEPLOYMENT_GUIDE.md
│   ├── DEPLOYMENT.md
│   └── DEPLOYMENT_NOTES.md
│
├── 在线部署/
│   └── online-deployment/
│       ├── ONLINE_DEPLOYMENT_GUIDE.md
│       ├── online-deploy.sh
│       ├── DEPENDENCIES.md
│       └── README.md
│
├── 离线部署/
│   └── offline-deployment/
│       ├── OFFLINE_DEPLOYMENT_GUIDE.md
│       ├── offline-deploy.sh
│       └── file-checklist.md
│
├── 故障排查/
│   ├── TROUBLESHOOTING_FAILED_TO_FETCH.md
│   └── QUICK_FIX_MODEL_ACCESS.md
│
├── 项目管理/
│   ├── PROJECT_SUMMARY.md
│   ├── STRUCTURE.md
│   ├── TODO.md
│   ├── UPDATES.md
│   └── FINAL_CHECKLIST.md
│
└── 脚本/
    ├── deploy.sh
    ├── docker-deploy.sh
    ├── start.sh
    ├── stop.sh
    ├── restart.sh
    └── ...
```

---

**提示**: 使用 `Ctrl+F` 搜索关键词快速定位所需文档。
