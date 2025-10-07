==========================================
  LLM Chat 离线部署包
==========================================

本目录包含在无网络环境下部署 LLM Chat 系统所需的所有文件。

文件列表：
---------
1. llm-chat-images.tar (约 1.8GB)
   - Docker 镜像文件
   - 包含: backend, frontend, nginx

2. project-source.tar.gz (约 5MB)
   - 项目源代码
   - 包含: 后端、前端、配置文件

3. offline-deploy.sh
   - 自动化部署脚本
   - 执行: sudo ./offline-deploy.sh

4. OFFLINE_DEPLOYMENT_GUIDE.md
   - 详细部署文档
   - 包含: 手动部署步骤、问题排查

5. README.txt
   - 本文件

快速开始：
---------
1. 确保目标服务器已安装 Docker
   验证: docker --version

2. 将本目录复制到目标服务器

3. 运行部署脚本:
   cd /path/to/offline-deployment
   sudo ./offline-deploy.sh

4. 按照提示输入配置信息

5. 访问应用:
   前端: http://YOUR_IP:3000
   后端: http://YOUR_IP:8000/docs

注意事项：
---------
- 目标服务器必须已安装 Docker
- 至少需要 10GB 可用磁盘空间
- 需要 4GB 以上内存
- 部署前请阅读 OFFLINE_DEPLOYMENT_GUIDE.md

如何安装 Docker（如果未安装）：
------------------------------
请参考 OFFLINE_DEPLOYMENT_GUIDE.md 中的
"Docker 离线安装" 章节

技术支持：
---------
详细文档: OFFLINE_DEPLOYMENT_GUIDE.md
问题排查: 查看文档中的"常见问题"章节

==========================================
