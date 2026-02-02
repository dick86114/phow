#!/bin/sh
set -e

echo "Starting deployment script..."

# 检查 Prisma 是否可用
if ! command -v npx >/dev/null 2>&1; then
    echo "Error: npx is not installed."
    exit 1
fi

echo "Syncing database schema..."
# 使用 db push 确保数据库结构与 schema.prisma 一致
# 在开发/个人项目中，这比 migrate deploy 更容错
npx prisma db push

echo "Starting application..."
# 执行 CMD 传递的命令
exec "$@"
