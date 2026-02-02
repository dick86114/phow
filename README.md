# Phow - 今天拍什么

Phow 是一个现代化的个人摄影作品分享与习惯养成平台。它不仅仅是一个相册，更是你记录生活、通过镜头观察世界的每日伴侣。

![License](https://img.shields.io/badge/license-MIT-blue.svg)

## ✨ 特性

- 📸 **极简展示**: 沉浸式的瀑布流布局，专注于照片本身。
- 🤖 **AI 驱动**: 
  - 自动识别照片水印中的参数（弥补部分机型 EXIF 缺失问题）。
  - 智能生成 30 字以内的情感共鸣故事。
- 📅 **习惯养成**: 可视化日历热力图，记录你的每一次快门。
- 🎨 **个性化**: 支持浅色/深色主题切换。
- 🔒 **私有部署**: 数据完全掌握在自己手中。

## 📚 文档

- [产品需求文档 (PRD)](doc/Phow_PRD_v1.1.md)
- [用户手册](doc/user-manual.md)
- [部署手册](doc/deployment.md)

## 🚀 快速开始

1. **配置环境**:
   ```bash
   cp .env.example .env
   # 编辑 .env 填入 API Key 和数据库配置
   ```

2. **启动服务**:
   ```bash
   docker-compose up -d --build
   ```

3. **访问**:
   打开浏览器访问 `http://localhost:3000` (或配置的端口)。

## 🛠 技术栈

- **Frontend**: Vue 3, Vite, TailwindCSS, Pinia
- **Backend**: NestJS, Prisma, PostgreSQL
- **Infrastructure**: Docker, Nginx

## 📄 License

MIT
