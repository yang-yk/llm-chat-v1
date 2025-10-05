# 离线部署包文件清单

## 必需文件

### 1. 项目源码
- `project-source.tar.gz` (164K)
  - 包含完整的前端和后端源代码
  - 包含 docker-compose.yml 配置文件
  - 包含 Nginx 配置文件

### 2. Docker 镜像
- `llm-chat-images.tar` (1.8G)
  - llm-chat-v1-backend:latest
  - llm-chat-v1-frontend:latest
  - nginx:alpine

### 3. 部署脚本
- `offline-deploy.sh` - 主部署脚本
- `install-docker-offline.sh` - Docker 离线安装脚本

### 4. 文档
- `OFFLINE_DEPLOYMENT_GUIDE.md` - 详细部署文档
- `README.txt` - 说明文件
- `QUICK_START.txt` - 快速开始指南
- `file-checklist.md` - 本文件

## 文件完整性检查

生成时间: 2025-10-05 01:01:56

文件列表:
```
total 1.8G
-rw-rw-rw-+ 1 yangyk docker    0 Oct  5 01:01 file-checklist.md
-rwxrwxr-x+ 1 yangyk docker 4.8K Oct  5 01:01 install-docker-offline.sh
-rw-------+ 1 yangyk docker 1.8G Oct  5 01:01 llm-chat-images.tar
-rw-rw-rw-+ 1 yangyk docker 4.9K Oct  5 01:01 OFFLINE_DEPLOYMENT_GUIDE.md
-rwxrwxr-x+ 1 yangyk docker  16K Oct  5 01:01 offline-deploy.sh
-rw-rw-rw-+ 1 yangyk docker 164K Oct  5 01:01 project-source.tar.gz
-rw-rw-rw-+ 1 yangyk docker 1.8K Oct  5 01:01 QUICK_START.txt
-rw-rw-rw-+ 1 yangyk docker  740 Oct  5 01:01 README.txt
```

总大小: 1.8G

## 使用前检查

1. 确认所有文件完整
   - [ ] project-source.tar.gz
   - [ ] llm-chat-images.tar
   - [ ] offline-deploy.sh
   - [ ] install-docker-offline.sh
   - [ ] OFFLINE_DEPLOYMENT_GUIDE.md
   - [ ] README.txt
   - [ ] QUICK_START.txt

2. 检查文件大小是否正常
   - project-source.tar.gz 应该在几MB
   - llm-chat-images.tar 应该在 1-2GB

3. 验证脚本可执行权限
   ```bash
   chmod +x offline-deploy.sh
   chmod +x install-docker-offline.sh
   ```

## 部署流程

1. 将整个 `offline-deployment-package` 目录复制到目标服务器
2. 进入目录: `cd offline-deployment-package`
3. 运行部署脚本: `bash offline-deploy.sh`
4. 按照提示配置参数
5. 等待部署完成

## 注意事项

- 确保目标服务器有足够的磁盘空间（至少 4GB）
- 确保目标服务器已安装 Docker
- 如未安装 Docker，先运行 `install-docker-offline.sh`
- 部署过程中不需要网络连接
