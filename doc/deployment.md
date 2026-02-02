# Phow 部署手册

## 1. 环境要求
- Docker Engine 20.10+
- Docker Compose v2.0+

## 2. 部署步骤

### 步骤 1: 获取代码
```bash
git clone <repository_url>
cd phow
```

### 步骤 2: 配置环境变量
复制样例配置文件并按需修改：
```bash
cp .env.example .env
```

编辑 `.env` 文件，填入必要的配置信息：
- `DATABASE_URL`: 数据库连接串
- `JWT_SECRET`: JWT 签名密钥（请修改为随机字符串）
- `AI_API_KEY`: 大模型服务商提供的 API Key

### 步骤 3: 启动服务
使用 Docker Compose 一键启动：
```bash
docker-compose up -d --build
```

### 步骤 4: 初始化数据
如果是首次部署，可能需要重置管理员账号或应用数据库迁移（通常 Docker 启动脚本会自动处理迁移）。
如需手动重置管理员密码，可进入 backend 容器执行相关脚本（如果保留了脚本的话）或直接操作数据库。

## 3. 维护与更新

### 更新代码
```bash
git pull
docker-compose up -d --build
```

### 查看日志
```bash
docker-compose logs -f
```

### 备份数据
建议定期备份 `backend/uploads` 目录和 PostgreSQL 数据库。
