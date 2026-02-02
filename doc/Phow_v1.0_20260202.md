# Phow (个人摄影分享与习惯养成平台) 产品需求文档 (PRD)

**版本:** v1.0 (MVP) & v1.1
**日期:** 2026-02-02
**状态:** 草案
**负责人:** 产品规划师

---

## 1. 项目背景 (Background)
在碎片化社交时代，摄影师需要一个纯净的、私有的空间来沉淀作品。Phow 旨在结合“每日摄影习惯”与“专业作品展示”，通过技术手段自动解析 EXIF 数据，降低记录成本，同时为家人提供私密的分享通道。

## 2. 核心目标 (Goals)
- **习惯养成:** 通过每日上传提醒和日历视图，激励用户保持摄影习惯。
- **极致展示:** 瀑布流布局、高性能懒加载及流畅的详情页动画。
- **权限隔离:** 严格区分管理员（博主）、家庭成员（私密查看）和游客（公开作品）。
- **自动化管理:** 自动提取 EXIF、图片压缩、多尺寸分发。

---

## 3. 用户角色 (User Roles)
| 角色 | 权限描述 |
| :--- | :--- |
| **管理员 (Admin)** | 拥有全部权限：上传、编辑故事、删除评论、管理用户、查看系统日志。 |
| **家庭成员 (Family)** | 需登录：可查看“私密”相册、发表评论、下载原图、查看拍摄地点。 |
| **游客 (Visitor)** | 无需登录：仅可查看“公开”相册、点赞（限流）、分享。 |

---

## 4. 功能拆解 (Features)

### 阶段一：MVP (v1.0) - 核心闭环
**核心目标:** 实现从上传到展示的完整链路。

1. **用户权限管理 (Auth):**
   - JWT 认证机制。
   - 管理员初始账户创建。
   - bcrypt 密码加密存储。
2. **照片管理:**
   - 支持拖拽批量上传。
   - **EXIF 解析:** 自动提取焦距、光圈、快门、ISO、相机型号。
   - **基础压缩:** 上传时自动生成缩略图（减少首屏带宽）。
3. **前端展示:**
   - 响应式瀑布流布局 (Masonry Layout)。
   - 基础懒加载 (Intersection Observer)。
   - 详情页：显示照片、EXIF 信息及富文本描述。
4. **技术底座:**
   - 后端: Node.js (NestJS/Express) 或 Python (FastAPI)。
   - 数据库: PostgreSQL (推荐，支持地理空间扩展)。
   - 存储: 本地存储或基础 S3 兼容存储。

### 阶段二：迭代 (v1.1) - 体验优化与社交
**核心目标:** 增强互动性、安全性与习惯养成逻辑。

1. **社交互动:**
   - **IP 限流点赞:** 防止恶意刷票。
   - **嵌套评论:** 支持回复特定评论，邮件通知管理员。
   - **高级搜索:** 按器材、拍摄时间、地点、颜色标签搜索。
2. **习惯养成模块:**
   - **日历视图:** 展示每日上传轨迹，未上传日期显示留白。
   - **成就系统:** 连续上传 7/30/100 天获得勋章。
3. **前端高级特效:**
   - 详情页动画 (Hero Transitions)。
   - 图片查看器：支持双击放大、手势旋转。
4. **安全与防护:**
   - 图片水印自动添加。
   - 数据库自动备份脚本 (Cron Job)。
   - CDN 接入 (阿里云/Cloudflare)。

---

## 5. 技术架构 (Technical Requirements)

- **前端:** Vue3 (Composition API) + Vite + TailwindCSS + Pinia。
- **后端:** Node.js (NestJS) + Prisma ORM。
- **数据库:** PostgreSQL。
- **缓存/限流:** Redis (用于点赞计数和 IP 限流)。
- **安全:** 
  - Helmet.js 防护。
  - Rate Limit 中间件。
  - 敏感 EXIF 信息脱敏（如 GPS 可选隐藏）。

---

## 6. 数据模型概览 (Data Schema)

- **Users:** id, username, password_hash, role (admin/family).
- **Photos:** id, url, thumbnail_url, title, content (Rich Text), exif_json, visibility (public/private), upload_date.
- **Comments:** id, photo_id, user_id, content, parent_id, ip_address.
- **Likes:** photo_id, ip_address, created_at.

---

## 7. 待办事项 (Open Issues)
- 是否需要支持视频短片的展示？
- 家庭成员的邀请机制是邮件还是验证码？
- 移动端 App 计划（PWA 是否足够？）。

---
