# 生产上线清单

这套 Compose 已把数据库、API、前台和后台放入内部网络；公网只开放 Nginx 的 80/443，后台入口为 `/admin/`。应用层包含请求大小限制、双层限流、服务超时、富文本清洗、文件签名校验、分片元数据绑定、容器资源上限和日志轮转。

但单台云主机无法独自抵御大流量 DDoS。正式域名上线时，必须同时使用云厂商安全组和具备 DDoS 清洗/WAF 能力的 CDN；不要把源站 IP 暴露在其他 DNS 记录或历史记录中。

## 1. 云侧前置条件

- 安全组入站只开放 `22`（限制为运维固定 IP）、`80`、`443`；不要开放 3000、3001、5432、8080。
- 域名接入 CDN/WAF，开启 DDoS 防护、Bot 管理、托管规则、登录路径限速；源站防火墙的 80/443 最好只允许 CDN 回源 IP。
- 按所选 CDN 官方文档配置真实客户端 IP；未校验 CDN 回源地址前，不要直接信任任意访客提交的 `X-Forwarded-For`。
- 为数据库卷和上传卷配置磁盘监控：使用率 70% 告警、85% 紧急告警。配置主机 CPU、内存、5xx、容器重启次数告警。
- 生产至少 2 vCPU / 4 GB RAM；有大量视频时应把上传切换到 OSS/CDN，不让视频占满系统盘或挤占源站带宽。

## 2. TLS 与密钥

运行 `./deploy.sh init` 后编辑 `.env` 中的 `DOMAIN` 与 `CORS_ALLOWED_ORIGINS`。从受信任 CA 获取证书，把文件放到：

```text
deploy/certs/fullchain.pem
deploy/certs/privkey.pem
```

私钥权限建议为 `600`。`./deploy.sh check` 会在密钥过弱或证书缺失时拒绝上线。证书续期后执行 `docker compose exec nginx nginx -s reload`；建议用云证书服务或 certbot 定时续期，并提前 30 天告警。

## 3. 首次上线

```bash
cd deploy
./deploy.sh check
./deploy.sh up
curl -I https://jiangrun.net/
curl -I https://jiangrun.net/admin/
```

首次登录 `/admin/` 后立即修改管理员密码；改密会让所有旧 JWT 立即失效。不要在共享电脑保存会话，也不要通过聊天工具发送 `.env` 或证书私钥。

## 4. 备份与恢复演练

每天至少执行一次 `pg_dump`，并把数据库备份和上传文件备份复制到不同地域、不可变或版本化对象存储。保留建议：7 份日备、4 份周备、12 份月备。每月至少在隔离环境恢复一次；“有备份”但没有恢复演练不算可用备份。

升级前先备份，再运行构建、测试和漏洞扫描。不要对数据库卷执行 `docker compose down -v`。

每月至少执行一次无缓存重建与镜像复扫（出现严重/高危项时先修复再发布）：

```bash
./deploy.sh build
docker scout cves --only-severity critical,high jiangrun-server:latest
docker scout cves --only-severity critical,high jiangrun-frontend:latest
docker scout cves --only-severity critical,high jiangrun-admin:latest
docker scout cves --only-severity critical,high jiangrun-nginx:latest
docker scout cves --only-severity critical,high jiangrun-postgres:latest
docker scout cves --only-severity critical,high jiangrun-storage-init:latest
```

## 5. 上线验收

- `docker compose ps` 全部健康，公网扫描只能看到 80/443。
- HTTP 自动 301 到 HTTPS；TLS 仅允许 1.2/1.3；HSTS、CSP、X-Frame-Options、nosniff 等响应头存在。
- 未登录访问 `/api/v1/admin/*` 返回 401；普通或伪造角色 JWT 无法访问。
- 后台修改栏目名称、排序、显隐、简介、轮播和网站设置后，前台刷新准确变化。
- 上传伪造扩展名、路径穿越 upload_id、超大分片、缺失分片均被拒绝。
- 做经授权的外部漏洞扫描与温和压测；压测必须经过 CDN/WAF 并设置停止阈值，禁止直接对生产数据库做破坏性测试。
