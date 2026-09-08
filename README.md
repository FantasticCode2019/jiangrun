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

### 本地开发环境

开发脚本会自动创建独立 PostgreSQL 容器、安装缺失依赖并启动三个应用。数据库仅监听本机 `127.0.0.1`，不会使用生产数据卷。

开发模式下，前台、后台和 API 直接运行在宿主机中，只有 PostgreSQL 运行在 Docker 中。因此宿主机必须安装 Node.js、Go 和 Docker。

启动脚本会先自动检查 Docker/Compose、Node.js、npm、Go 及其版本。条件不满足时会打印缺失项和手动安装命令；macOS 检测到 Homebrew、Windows 检测到 winget 时，会询问是否自动安装。默认回答为 `N`，不会未经确认修改系统。

macOS 也可以单独执行环境检查或明确要求自动安装：

```bash
./dev.sh doctor
./dev.sh install-tools
```

#### Windows 开发环境前提

- Windows 10/11 64 位，已启用硬件虚拟化和 WSL 2。
- Docker Desktop 已安装并启动，使用 Linux containers，且 `docker compose` 可用。
- Node.js 22+（需同时提供 `node`、`npm` 命令）。
- Go 1.26+（需提供 `go` 命令）。
- 能访问 Docker Hub、npm registry 和 `.env.development.local` 中配置的 `DEV_GOPROXY`。
- 本机端口 `3000`、`3001`、`8080`、`5432` 未被占用；如有冲突，可在 `.env.development.local` 中修改。

安装完成后，在 PowerShell 或 CMD 中检查：

```powershell
docker info
docker compose version
node --version
npm --version
go version
```

确认 Docker Desktop 已完全启动后，可直接双击：

- `dev-start.bat`：一键安装依赖、启动数据库/API/前台/后台并打开浏览器。
- `dev-stop.bat`：一键停止全部开发服务并保留开发数据库数据。

双击启动时如果环境不满足，窗口会保持打开并显示 winget 手动命令；选择 `y` 后脚本才会尝试自动安装。安装 Docker Desktop、Node.js 或 Go 后通常需要重新打开终端，再次双击启动脚本。

#### macOS 开发环境前提

- Intel 或 Apple 芯片的 macOS，具备系统自带的 Bash。
- Docker Desktop 已安装并启动（也可使用能提供 Docker CLI 与 Compose v2 的兼容运行时）。
- Node.js 22+ 和 npm。
- Go 1.26+。
- 能访问 Docker Hub、npm registry 和 `.env.development.local` 中配置的 `DEV_GOPROXY`。
- 本机端口 `3000`、`3001`、`8080`、`5432` 未被占用。

在终端中检查：

```bash
docker info
docker compose version
node --version
npm --version
go version
```

首次运行如果脚本没有执行权限，先执行：

```bash
chmod +x dev.sh production.sh deploy/deploy.sh
```

然后启动开发环境：

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

### 生产环境

生产模式下，Node.js、Go、PostgreSQL 和 Nginx 都在 Docker 镜像/容器内运行，因此宿主机不需要单独安装 Node.js、Go 或 PostgreSQL。启动前会校验强密码、域名、CORS 和 TLS 证书文件；macOS/Linux 脚本还会检查证书有效期与域名匹配。

生产启动脚本也会先执行环境预检：Windows 检查 PowerShell、Docker Desktop、Compose 和 `curl.exe`；macOS 检查 Docker、Compose、`curl`、OpenSSL 以及 `x509 -checkhost` 能力。检查失败会先给出手动安装方式，再询问是否通过 winget/Homebrew 自动安装。

macOS 可单独运行：

```bash
./scripts/check-environment.sh production
./scripts/check-environment.sh production --install
```

#### 生产环境共同前提

- 域名 `jiangrun.net`（以及需要使用时的 `www.jiangrun.net`）已经解析到部署机器的公网 IP。
- TCP `80`、`443` 未被其他程序占用，并已在系统防火墙、云安全组和路由器/NAT 中放行。
- 已取得覆盖正式域名且未过期的 TLS 证书，文件格式为 PEM：
  - `deploy/certs/fullchain.pem`
  - `deploy/certs/privkey.pem`
- 部署机器能够访问 Docker Hub，以便拉取基础镜像。
- 建议至少为 Docker 分配 2 核 CPU、4 GB 内存和 10 GB 可用磁盘；公网正式使用建议 4 核、8 GB 以上，并为数据库和上传目录规划备份空间。
- 首次生成的 `deploy/.env` 必须妥善保存且不能提交 Git。已有数据库时不能随意修改其中的 `POSTGRES_PASSWORD`。

#### Windows 生产环境前提

- Windows 10/11 64 位，已启用 WSL 2 与硬件虚拟化。
- Docker Desktop 已启动并切换到 Linux containers，Docker Compose v2 可用。
- Windows PowerShell 5.1+ 和 `curl.exe` 可用；不需要在 Windows 中安装 Node.js、Go 或 PostgreSQL。
- 需要具备修改 Windows Defender 防火墙和开放 `80/443` 端口的管理员权限。

检查命令：

```powershell
docker info
docker compose version
curl.exe --version
```

准备好证书后，进入 `deploy` 目录：

- 双击 `start.bat`：构建、启动并打开正式网站。
- 双击 `stop.bat`：停止并移除容器，保留数据库与上传数据卷。
- 也可以在命令行执行 `deploy.bat check`、`deploy.bat status` 或 `deploy.bat logs server`。

> Docker Desktop 更适合 Windows 本地验收或临时部署。要求长期公网运行和故障自恢复时，建议使用安装 Docker Engine 的 Linux 云服务器。

#### macOS 生产环境前提

- Docker Desktop 已安装并启动，`docker compose` 可用。
- Bash、`curl` 和 OpenSSL 可用；OpenSSL 需支持 `x509 -checkhost`。不需要单独安装 Node.js、Go 或 PostgreSQL。
- 当前用户有权让 Docker 映射 `80/443` 端口，且端口没有被系统自带 Web 服务或其他容器占用。

检查命令：

```bash
docker info
docker compose version
curl --version
openssl version
openssl x509 -help 2>&1 | grep -- -checkhost
```

macOS 更适合本地生产配置验收或预发布。若要长期对公网提供服务，仍建议在 Linux 云服务器上部署。

#### 生产脚本启动顺序

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
