#!/bin/bash

# Docker镜像离线导入脚本
# 用于在离线环境中导入Docker镜像并启动服务

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# 获取脚本所在目录
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
OFFLINE_DIR="$SCRIPT_DIR/offline-packages"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  Docker镜像离线导入工具${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""

# 检查Docker是否可用
if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ 错误: 未找到docker命令${NC}"
    echo -e "${YELLOW}请先安装Docker：https://docs.docker.com/engine/install/${NC}"
    exit 1
fi

# 检查docker compose是否可用
if ! docker compose version &> /dev/null; then
    echo -e "${RED}❌ 错误: 未找到docker compose命令${NC}"
    echo -e "${YELLOW}请安装Docker Compose v2+${NC}"
    exit 1
fi

# 检查离线包目录是否存在
if [ ! -d "$OFFLINE_DIR" ]; then
    echo -e "${RED}❌ 错误: 离线包目录不存在: $OFFLINE_DIR${NC}"
    echo -e "${YELLOW}请先运行 export-docker-images.sh 导出镜像${NC}"
    exit 1
fi

# 检查必要的镜像文件
REQUIRED_FILES=("backend-image.tar" "frontend-image.tar" "nginx-image.tar")
MISSING_FILES=()

for file in "${REQUIRED_FILES[@]}"; do
    if [ ! -f "$OFFLINE_DIR/$file" ]; then
        MISSING_FILES+=("$file")
    fi
done

if [ ${#MISSING_FILES[@]} -gt 0 ]; then
    echo -e "${RED}❌ 错误: 缺少必要的镜像文件：${NC}"
    for file in "${MISSING_FILES[@]}"; do
        echo -e "${RED}   - $file${NC}"
    done
    exit 1
fi

echo -e "${GREEN}✅ 所有必要文件已就绪${NC}"
echo ""

# 1. 验证文件完整性
if [ -f "$OFFLINE_DIR/checksums.sha256" ]; then
    echo -e "${YELLOW}🔍 步骤1: 验证文件完整性...${NC}"
    cd "$OFFLINE_DIR"

    # 只验证存在的文件
    VERIFY_FAILED=0
    while IFS= read -r line; do
        CHECKSUM=$(echo "$line" | awk '{print $1}')
        FILENAME=$(echo "$line" | awk '{print $2}')

        if [ -f "$FILENAME" ]; then
            ACTUAL_CHECKSUM=$(sha256sum "$FILENAME" | awk '{print $1}')
            if [ "$CHECKSUM" = "$ACTUAL_CHECKSUM" ]; then
                echo -e "${GREEN}   ✓ $FILENAME${NC}"
            else
                echo -e "${RED}   ✗ $FILENAME 校验失败！${NC}"
                VERIFY_FAILED=1
            fi
        fi
    done < checksums.sha256

    cd - > /dev/null

    if [ $VERIFY_FAILED -eq 1 ]; then
        echo -e "${RED}❌ 文件完整性验证失败！${NC}"
        echo -e "${YELLOW}是否继续？(y/N)${NC}"
        read -r CONTINUE
        if [[ ! "$CONTINUE" =~ ^[Yy]$ ]]; then
            exit 1
        fi
    else
        echo -e "${GREEN}   ✅ 所有文件完整性验证通过${NC}"
    fi
else
    echo -e "${YELLOW}⚠️  未找到校验和文件，跳过完整性验证${NC}"
fi

# 2. 导入Docker镜像
echo ""
echo -e "${YELLOW}========================================${NC}"
echo -e "${YELLOW}📦 步骤2: 导入Docker镜像${NC}"
echo -e "${YELLOW}========================================${NC}"
echo ""

echo -e "${YELLOW}导入后端镜像...${NC}"
docker load -i "$OFFLINE_DIR/backend-image.tar"
echo -e "${GREEN}   ✓ 后端镜像导入完成${NC}"

echo -e "${YELLOW}导入前端镜像...${NC}"
docker load -i "$OFFLINE_DIR/frontend-image.tar"
echo -e "${GREEN}   ✓ 前端镜像导入完成${NC}"

echo -e "${YELLOW}导入Nginx镜像...${NC}"
docker load -i "$OFFLINE_DIR/nginx-image.tar"
echo -e "${GREEN}   ✓ Nginx镜像导入完成${NC}"

# 3. 验证镜像
echo ""
echo -e "${YELLOW}========================================${NC}"
echo -e "${YELLOW}✅ 步骤3: 验证已导入的镜像${NC}"
echo -e "${YELLOW}========================================${NC}"
echo ""

echo -e "${GREEN}已导入的镜像：${NC}"
docker images | grep -E "llm-chat|nginx.*alpine|docker-" || echo -e "${YELLOW}未找到相关镜像${NC}"

# 4. 准备配置文件
echo ""
echo -e "${YELLOW}========================================${NC}"
echo -e "${YELLOW}📋 步骤4: 准备配置文件${NC}"
echo -e "${YELLOW}========================================${NC}"
echo ""

# 复制nginx配置
if [ -f "$OFFLINE_DIR/nginx/default.conf" ]; then
    mkdir -p "$PROJECT_ROOT/nginx"
    if [ -f "$PROJECT_ROOT/nginx/default.conf" ]; then
        echo -e "${YELLOW}   ⚠️  nginx配置已存在，是否覆盖？(y/N)${NC}"
        read -r OVERWRITE_NGINX
        if [[ "$OVERWRITE_NGINX" =~ ^[Yy]$ ]]; then
            cp "$OFFLINE_DIR/nginx/default.conf" "$PROJECT_ROOT/nginx/default.conf"
            echo -e "${GREEN}   ✓ Nginx配置已更新${NC}"
        else
            echo -e "${YELLOW}   ⊘ 保留现有Nginx配置${NC}"
        fi
    else
        cp "$OFFLINE_DIR/nginx/default.conf" "$PROJECT_ROOT/nginx/default.conf"
        echo -e "${GREEN}   ✓ Nginx配置已复制${NC}"
    fi
else
    echo -e "${YELLOW}   ⚠️  离线包中未找到Nginx配置${NC}"
fi

# 检查.env文件
if [ ! -f "$SCRIPT_DIR/.env" ]; then
    if [ -f "$OFFLINE_DIR/env.example" ]; then
        echo -e "${YELLOW}   ℹ️  未找到.env文件，是否使用示例配置？(y/N)${NC}"
        read -r USE_EXAMPLE
        if [[ "$USE_EXAMPLE" =~ ^[Yy]$ ]]; then
            cp "$OFFLINE_DIR/env.example" "$SCRIPT_DIR/.env"
            echo -e "${GREEN}   ✓ 已创建.env文件（请根据实际情况修改）${NC}"
        fi
    else
        echo -e "${YELLOW}   ⚠️  未找到.env文件，将使用docker-compose.yml中的默认值${NC}"
    fi
else
    echo -e "${GREEN}   ✓ .env文件已存在${NC}"
fi

# 创建必要的目录
echo -e "${YELLOW}   📁 创建必要的目录...${NC}"
mkdir -p "$PROJECT_ROOT/db"
mkdir -p "$PROJECT_ROOT/logs"
echo -e "${GREEN}   ✓ 目录已创建${NC}"

# 5. 询问是否启动服务
echo ""
echo -e "${YELLOW}========================================${NC}"
echo -e "${YELLOW}🚀 步骤5: 启动服务${NC}"
echo -e "${YELLOW}========================================${NC}"
echo ""

echo -e "${YELLOW}是否现在启动服务？(Y/n)${NC}"
read -r START_SERVICE

if [[ ! "$START_SERVICE" =~ ^[Nn]$ ]]; then
    cd "$SCRIPT_DIR"

    echo -e "${YELLOW}停止现有服务（如果有）...${NC}"
    docker compose down 2>/dev/null || true

    echo -e "${YELLOW}启动服务...${NC}"
    docker compose up -d

    if [ $? -eq 0 ]; then
        echo -e "${GREEN}   ✓ 服务启动成功${NC}"

        # 等待服务就绪
        echo -e "${YELLOW}   等待服务就绪...${NC}"
        sleep 5

        # 显示服务状态
        echo ""
        echo -e "${GREEN}========================================${NC}"
        echo -e "${GREEN}📊 服务状态${NC}"
        echo -e "${GREEN}========================================${NC}"
        docker compose ps

        echo ""
        echo -e "${GREEN}========================================${NC}"
        echo -e "${GREEN}✅ 部署完成！${NC}"
        echo -e "${GREEN}========================================${NC}"
        echo ""
        echo -e "🌐 访问地址: ${YELLOW}http://$(hostname -I | awk '{print $1}')${NC}"
        echo -e "🔧 管理后台: ${YELLOW}http://$(hostname -I | awk '{print $1}')/admin${NC}"
        echo ""
        echo -e "📝 默认管理员账户："
        echo -e "   用户名: ${YELLOW}admin${NC}"
        echo -e "   密码: ${YELLOW}Admin@2025${NC}"
        echo ""
        echo -e "${YELLOW}💡 常用命令：${NC}"
        echo -e "   查看日志: ${GREEN}docker compose -f $SCRIPT_DIR/docker-compose.yml logs -f${NC}"
        echo -e "   查看状态: ${GREEN}docker compose -f $SCRIPT_DIR/docker-compose.yml ps${NC}"
        echo -e "   停止服务: ${GREEN}docker compose -f $SCRIPT_DIR/docker-compose.yml down${NC}"
        echo -e "   重启服务: ${GREEN}docker compose -f $SCRIPT_DIR/docker-compose.yml restart${NC}"
        echo ""
    else
        echo -e "${RED}   ❌ 服务启动失败${NC}"
        echo -e "${YELLOW}   查看日志: docker compose -f $SCRIPT_DIR/docker-compose.yml logs${NC}"
        exit 1
    fi
else
    echo -e "${YELLOW}⊘ 跳过服务启动${NC}"
    echo ""
    echo -e "${YELLOW}💡 手动启动服务：${NC}"
    echo -e "   ${GREEN}cd $SCRIPT_DIR${NC}"
    echo -e "   ${GREEN}docker compose up -d${NC}"
fi

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}✅ 镜像导入完成！${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
