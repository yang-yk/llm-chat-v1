# 离线部署包文件清单

## 核心文件

| 文件名 | 大小 | 说明 | 必需 |
|--------|------|------|------|
| `llm-chat-images.tar` | 1.8GB | Docker 镜像文件 | ✅ 必需 |
| `project-source.tar.gz` | 130KB | 项目源代码 | ✅ 必需 |
| `offline-deploy.sh` | 6.6KB | 自动部署脚本 | ✅ 推荐 |

## 文档文件

| 文件名 | 大小 | 说明 | 必需 |
|--------|------|------|------|
| `OFFLINE_DEPLOYMENT_GUIDE.md` | 16KB | 完整部署文档 | ⭐ 推荐阅读 |
| `QUICK_START.txt` | 3.4KB | 快速开始指南 | ⭐ 推荐阅读 |
| `README.txt` | 1.5KB | 简要说明 | ⭐ 推荐阅读 |
| `file-checklist.md` | - | 本文件清单 | 可选 |

## 工具脚本

| 文件名 | 大小 | 说明 | 必需 |
|--------|------|------|------|
| `install-docker-offline.sh` | 4.8KB | Docker 离线安装脚本 | 视情况而定 |

## Docker 离线安装包（需额外下载）

如果目标服务器未安装 Docker，需要额外下载：

| 文件名 | 大小 | 下载地址 | 架构 |
|--------|------|---------|------|
| `docker-24.0.7.tgz` | 约 60MB | https://download.docker.com/linux/static/stable/x86_64/docker-24.0.7.tgz | x86_64 |
| `docker-24.0.7.tgz` | 约 55MB | https://download.docker.com/linux/static/stable/aarch64/docker-24.0.7.tgz | ARM64 |

## 文件完整性检查

在传输文件到目标服务器后，建议验证文件完整性：

```bash
# 检查文件是否存在
ls -lh offline-deployment/

# 验证核心文件
test -f llm-chat-images.tar && echo "✓ Docker 镜像文件存在" || echo "✗ 缺少 Docker 镜像文件"
test -f project-source.tar.gz && echo "✓ 项目源码存在" || echo "✗ 缺少项目源码"
test -f offline-deploy.sh && echo "✓ 部署脚本存在" || echo "✗ 缺少部署脚本"

# 检查文件大小（镜像文件应该在 1.5GB 以上）
size=$(stat -f%z llm-chat-images.tar 2>/dev/null || stat -c%s llm-chat-images.tar 2>/dev/null)
if [ $size -gt 1500000000 ]; then
    echo "✓ Docker 镜像文件大小正常"
else
    echo "✗ Docker 镜像文件可能损坏（大小: $size bytes）"
fi
```

## 磁盘空间需求

| 阶段 | 所需空间 | 说明 |
|------|---------|------|
| 部署包传输 | 2GB | 存储离线部署包 |
| Docker 镜像加载 | 3GB | 解压和加载镜像时的临时空间 |
| 运行时数据 | 2-5GB | 数据库、日志等 |
| **总计** | **至少 10GB** | 推荐 15GB 以上 |

## 传输方式建议

根据部署包大小（约 1.8GB），推荐传输方式：

1. **U 盘/移动硬盘**（推荐）
   - 优点：可靠、快速、适合完全离线环境
   - 缺点：需要物理接触

2. **局域网传输**
   - 使用 SCP: `scp -r offline-deployment/ user@target:/opt/`
   - 使用 rsync: `rsync -avz offline-deployment/ user@target:/opt/offline-deployment/`
   - 优点：方便快捷
   - 缺点：需要网络连接

3. **CD/DVD**
   - 需要多张 DVD（每张 4.7GB）或一张双层 DVD（8.5GB）
   - 不推荐（速度慢、容易损坏）

## 使用流程

```
1. 准备 offline-deployment 目录
   ├── 在有网络的机器上已打包完成
   └── 包含所有必需文件

2. 传输到目标服务器
   └── 使用 U 盘、SCP 等方式

3. (可选) 安装 Docker
   ├── 如果已安装，跳过此步
   └── 使用 install-docker-offline.sh

4. 运行部署脚本
   └── sudo ./offline-deploy.sh

5. 验证部署
   └── 访问 http://SERVER_IP:3000
```

## 注意事项

⚠️ **传输前**
- 确保源文件完整（特别是 1.8GB 的镜像文件）
- 检查目标服务器磁盘空间

⚠️ **传输后**
- 验证文件完整性（检查文件大小）
- 确保文件权限正确（脚本需要可执行权限）

⚠️ **部署时**
- 确保 Docker 已正确安装
- 预留足够的磁盘空间
- 记录配置信息（IP、密钥等）
