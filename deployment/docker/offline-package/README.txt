LLM Chat 离线部署包
====================

本包包含完整的 LLM Chat 系统离线部署所需文件。

包含文件：
- project-source.tar.gz      项目源码
- llm-chat-images.tar        Docker 镜像
- offline-deploy.sh          部署脚本
- install-docker-offline.sh  Docker 离线安装脚本
- OFFLINE_DEPLOYMENT_GUIDE.md 详细部署文档
- README.txt                 本文件
- QUICK_START.txt            快速开始指南

快速开始：
1. 确保 Docker 已安装
   如未安装，运行: bash install-docker-offline.sh

2. 运行部署脚本
   bash offline-deploy.sh

3. 按照提示配置服务器 IP 和端口

4. 等待部署完成，使用浏览器访问

详细说明请查看 OFFLINE_DEPLOYMENT_GUIDE.md
