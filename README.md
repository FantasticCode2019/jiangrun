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
- Docker（开发数据库与生产部署）

### 本地开发环境

开发脚本会自动创建独立 PostgreSQL 容器、安装缺失依赖并启动三个应用。数据库仅监听本机 `127.0.0.1`，不会使用生产数据卷。

```bash
./dev.sh up
```

启动后访问：

- 前台：`http://localhost:3000`
- 后台：`http://localhost:3001/admin/`
- API：`http://localhost:8080/api/v1`

常用开发命令：

```bash
./dev.sh status
./dev.sh logs server
./dev.sh restart
./dev.sh test
./dev.sh stop       # 停止服务并保留开发数据
./dev.sh down       # 移除开发容器并保留数据卷
./dev.sh clean      # 删除开发数据库，需输入 yes 确认
```

首次运行会生成权限为 `600` 的 `.env.development.local`，其中包含独立的开发数据库密码、JWT 密钥和管理员初始密码。该文件已被 Git 忽略。

Windows 10/11 可直接双击：

- `dev-start.bat`：一键安装依赖、启动数据库/API/前台/后台并打开浏览器。
- `dev-stop.bat`：一键停止全部开发服务并保留开发数据库数据。

Windows 版本需要先安装并启动 Docker Desktop，同时安装 Node.js 22+ 和 Go 1.26+。

### 生产环境

生产环境必须通过生产脚本执行，启动前会校验强密码、域名、CORS 和 TLS 证书：

```bash
# 1) 生成随机密钥与初始密码
./production.sh init
# 2) 将正式证书复制为 deploy/certs/fullchain.pem 与 privkey.pem
# 3) 运行上线检查并启动
./production.sh check
./production.sh up

# 其他常用命令
./production.sh start
./production.sh build
./production.sh status
./production.sh logs server
./production.sh stats
./production.sh restart
./production.sh down
```

`deploy/deploy.sh` 仍可直接使用；根目录的 `production.sh` 是更明确的生产统一入口。Windows 用户继续使用 `deploy/deploy.bat`。

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
