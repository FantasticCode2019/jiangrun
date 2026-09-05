# 江润园林网站 - 全面现代化重构

北京江润风景园林景观设计有限公司官网，使用现代化技术栈重构。

## 技术栈

| 层级 | 技术 |
|------|------|
| **前台官网** | Next.js 16 + React 19 + Tailwind CSS |
| **后台管理** | React 18 + Vite + Ant Design 5 |
| **后端 API** | Go + Gin + GORM |
| **数据库** | PostgreSQL 15 |
| **部署** | Docker Compose + Nginx |

## 项目结构

```
jiangrun-web/
├── frontend/          # 前台官网 (Next.js, port 3000)
├── admin/             # 后台管理 (React + Vite, port 3001)
├── server/            # Go 后端 API (port 8080)
└── deploy/            # 部署配置
```

## 功能特性

### 前台官网
- 🏠 首页: 全屏 Hero 轮播、案例展示、视频预览、服务介绍、新闻动态
- 📋 案例展示: 瀑布流网格、风格筛选、详情页图片灯箱
- 🎬 **视频专区** ★: 视频卡片网格、在线播放、播放量统计
- 📰 新闻动态: 新闻列表、详情页
- 🛠️ 服务项目: 服务卡片展示
- 📞 联系我们: 在线留言表单
- 📱 响应式设计: 完美适配手机/平板/桌面

### 后台管理
- 📊 仪表盘: 数据统计概览
- 📋 案例管理: CRUD、图片上传、分类筛选
- 🎬 **视频管理** ★: 视频上传(带进度条)、封面管理、关联案例
- 📰 新闻管理: 富文本编辑
- 🛠️ 服务管理: 服务项目配置
- 📂 分类管理: 多级分类树
- 🖼️ 轮播图管理: 首页轮播标题、副标题、图片、链接、显隐和排序
- 💬 留言管理: 查看/标记已读/删除
- ⚙️ 网站设置: 基本信息/联系方式/SEO

### 设计风格
- 🎨 高端大气: 深绿 + 金色 + 米白配色
- ✨ 毛玻璃导航栏
- 🎭 视差滚动效果
- 📐 大图留白布局

## 快速开始

### 前置要求
- Go 1.26+
- Node.js 22+
- PostgreSQL 15+

### 1. 启动数据库
```bash
# 使用 Docker
docker run -d --name jiangrun-db \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=jiangrun \
  -p 5432:5432 \
  postgres:15-alpine
```

### 2. 启动后端 API
```bash
cd server
# 修改 config/config.yaml 中的数据库配置
go mod tidy
go run main.go
# API 运行在 http://localhost:8080
```

### 3. 启动后台管理
```bash
cd admin
npm install
npm run dev
# 后台运行在 http://localhost:3001/admin/
# 开发模式首次启动默认账号为 admin / admin123；生产模式禁止默认密码
```

### 4. 启动前台官网
```bash
cd frontend
npm install
npm run dev
# 官网运行在 http://localhost:3000
```

### Docker Compose 一键部署

`deploy/` 提供 Linux/macOS 的 `deploy.sh` 与 Windows 的 `deploy.bat`（底层调用 `deploy.ps1`），跨平台一键启动。

```bash
cd deploy

# 1) 生成随机密钥与初始密码
./deploy.sh init
# 2) 将正式证书复制为 deploy/certs/fullchain.pem 与 privkey.pem
# 3) 构建并启动
./deploy.sh up

# 其他常用命令
./deploy.sh start        # 快速启动（不重新构建，更快）
./deploy.sh build        # 拉取安全更新并无缓存重建镜像
./deploy.sh check        # 安全检查：校验 .env 密钥是否仍为默认/弱值
./deploy.sh init         # 仅生成 .env 配置文件
./deploy.sh status       # 查看各服务运行状态
./deploy.sh logs server  # 查看后端日志（可指定服务: postgres / frontend / admin / nginx）
./deploy.sh stats        # 查看资源占用
./deploy.sh restart      # 重启（不重新构建）
./deploy.sh down         # 停止并移除容器（保留数据卷）
./deploy.sh stop         # 停止容器（保留容器与数据）
./deploy.sh clean        # ⚠️ 彻底清理容器、镜像与数据卷（会删数据库，需输入 yes 确认）
```

> **Windows 用户**：进入 `deploy` 目录后**双击 `deploy.bat`** 即可启动；停止/关闭可双击 `stop.bat`；命令行用法与上面等价（用 `deploy.bat status` 等）。

**访问地址**：部署完成后
- 前台官网：`https://jiangrun.net/`
- 后台管理：`https://jiangrun.net/admin/`
- 管理员初始账号 `admin`，初始密码与 JWT 密钥在首次运行时自动生成并打印在终端，请妥善保存，登录后立即在后台修改密码。

**部署说明**
- `.env` 为首次运行脚本自动生成的随机凭据（数据库密码、JWT 密钥、管理员初始密码），请勿提交到版本库。
- 后端 API、前台和后台均不直接暴露端口；公网只有 Nginx 的 80/443，80 强制跳转 HTTPS。
- 所有服务已配置健康检查，容器间基于就绪状态依次启动。
- 一键启动脚本会自动执行安全自检（`../deploy.sh check`），若 .env 中仍使用默认/弱密钥会给出警告并终止。

## API 文档

### 公开接口
| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /api/v1/banners | 轮播图 |
| GET | /api/v1/cases | 案例列表 |
| GET | /api/v1/cases/:id | 案例详情 |
| GET | /api/v1/videos | 视频列表 |
| GET | /api/v1/videos/:id | 视频详情 |
| POST | /api/v1/videos/:id/view | 增加播放量 |
| GET | /api/v1/news | 新闻列表 |
| GET | /api/v1/services | 服务列表 |
| GET | /api/v1/settings | 网站设置 |
| POST | /api/v1/contact | 提交留言 |

### 管理接口 (需 JWT Token)
| 方法 | 路径 | 说明 |
|------|------|------|
| POST | /api/v1/login | 管理员登录 |
| GET | /api/v1/admin/dashboard | 仪表盘数据 |
| CRUD | /api/v1/admin/cases | 案例管理 |
| CRUD | /api/v1/admin/videos | 视频管理 |
| CRUD | /api/v1/admin/news | 新闻管理 |
| CRUD | /api/v1/admin/services | 服务管理 |
| CRUD | /api/v1/admin/categories | 分类管理 |
| CRUD | /api/v1/admin/banners | 轮播图管理 |
| POST | /api/v1/admin/upload/image | 图片上传 |
| POST | /api/v1/admin/upload/chunk/init | 初始化图片/视频分片上传 |
| POST | /api/v1/admin/upload/chunk | 上传单个分片 |
| POST | /api/v1/admin/upload/chunk/complete | 校验并完成分片上传 |

生产上线、证书、云防火墙、WAF/CDN、备份与恢复步骤见 [生产上线清单](deploy/PRODUCTION.md)。
