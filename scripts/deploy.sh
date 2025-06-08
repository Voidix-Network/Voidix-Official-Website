#!/bin/bash

# Voidix 网站部署脚本 (Bash版本)
# 这是 deploy-unified.js 的 bash 包装器

set -e  # 遇到错误立即退出

echo "🚀 开始 Voidix 网站部署"
echo "=================================================="

# 检查 Node.js 环境
if ! command -v node &> /dev/null; then
    echo "❌ Node.js 未安装"
    exit 1
fi

# 检查部署脚本是否存在
if [ ! -f "scripts/deploy-unified.js" ]; then
    echo "❌ deploy-unified.js 脚本不存在"
    exit 1
fi

echo "✅ 环境检查通过"

# 执行 Node.js 部署脚本
echo "🔄 执行 Node.js 部署脚本..."
node scripts/deploy-unified.js full

echo "✅ 部署完成！"
