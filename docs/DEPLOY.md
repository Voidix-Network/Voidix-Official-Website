# Voidix网站部署指南

## 🚀 快速部署

### ⚡ 一键自动部署（推荐）

#### 方式1: GitHub Actions 自动部署
```bash
# 推送到主分支触发自动部署
git push origin main
```

#### 方式2: 评论触发部署
在任意 Issue 或 PR 中评论：
```
deploy
```

#### 方式3: 手动触发
1. 访问 GitHub Actions 页面
2. 选择 "Website Deployment" 工作流
3. 点击 "Run workflow"

### 📦 环境要求
- **Node.js**: 18.0+
- **npm**: 包管理器
- **Git**: 版本控制
- **Nginx**: Web 服务器（生产环境）
- **自托管运行器**: 配置了 `[self-hosted, website]` 标签

### 🤖 GitHub Actions 集成状态

#### ✅ 集成验证结果
经过全面测试，GitHub Actions 工作流已正确集成：
- **总测试项**: 10
- **通过**: 10 ✅
- **失败**: 0 ❌
- **成功率**: 100%

#### 🔧 工作流配置

**触发条件:**
```yaml
on:
  push:
    branches: [ master, main ]     # 推送到主分支时自动部署
  workflow_dispatch:               # 手动触发部署
    inputs:
      force_deploy: boolean        # 强制部署选项
  issue_comment:                   # 通过评论触发部署
    types: [created]               # 评论包含 "deploy" 时触发
```

**运行环境:**
- **运行器**: `[self-hosted, website]`
- **Node.js**: 18
- **包管理器**: npm (with cache)

**核心步骤:**
1. **代码检出**: `actions/checkout@v4`
2. **环境设置**: Node.js 18 + npm cache
3. **依赖安装**: `npm ci`
4. **CSS构建**: `npm run build` (关键/非关键分离)
5. **环境验证**: 检查脚本和构建产物
6. **执行部署**: `sudo -E ./scripts/deploy.sh`
7. **通知反馈**: 成功/失败通知 (Issue评论触发时)

**环境变量配置:**
```yaml
env:
  NGINX_WEB_ROOT: /var/www/voidix.net
  BACKUP_DIR: /var/backups/voidix-website
  DEPLOY_USER: www-data
  DEPLOY_GROUP: www-data
```

### 🛠️ 部署脚本架构

**脚本层次结构:**
```
scripts/
├── deploy.sh                    # Bash 包装器 (GitHub Actions 调用)
├── deploy-unified.js            # 主部署逻辑 (Node.js)
└── test-deployment-integration.js  # 集成测试脚本
```

**部署流程:**
```
GitHub Actions 触发 → 检出代码 → 安装依赖 → Webpack 构建 
→ 验证环境 → 执行 deploy.sh → 调用 deploy-unified.js 
→ 创建备份 → 部署网站文件 → 部署 nginx 配置文件 → 重启 nginx → 通知反馈
```

### 📦 构建配置

**Webpack 配置:**
- **模式**: 生产环境关键/非关键 CSS 分离
- **入口点**: 10个（每页面2个CSS文件）
- **输出**: `dist/css/[name].min.css`
- **优化**: CSS 压缩、Tree shaking

**CSS 分离策略:**
```
页面               关键CSS                     非关键CSS
index.html    →   index-critical.min.css   +  index-deferred.min.css
status.html   →   status-critical.min.css  +  status-deferred.min.css
faq.html      →   faq-critical.min.css     +  faq-deferred.min.css
error.html    →   error-critical.min.css   +  error-deferred.min.css
bug-report.html → bug-report-critical.min.css + bug-report-deferred.min.css
```

### 本地开发环境搭建

1. **克隆项目**
```bash
git clone https://github.com/your-username/Voidix-Official-Website.git
cd Voidix-Official-Website
```

2. **安装依赖**
```bash
npm install
```

3. **启动开发服务器**
```bash
npm run dev
```

### 手动生产环境部署

1. **构建生产版本**
```bash
npm run build
```

2. **预览构建结果**
```bash
npm run preview
```

3. **部署到服务器**
- 将 `dist` 文件夹内容上传到服务器
- 配置nginx指向dist目录
- 确保域名正确解析

### Nginx配置示例

```nginx
server {
    listen 80;
    server_name yourdomain.com;
    
    location / {
        root /path/to/your/dist;
        index index.html;
        try_files $uri $uri/ /index.html;
    }
    
    # 静态资源缓存
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

## 🔐 SSL证书配置

### RSA+ECC双证书配置

为获得最佳兼容性和性能，推荐配置RSA+ECC双证书：
- **RSA证书**: 兼容旧版浏览器和系统
- **ECC证书**: 现代浏览器性能优先，加密强度更高，密钥更小

#### 证书文件结构
```
/etc/nginx/ssl/voidix.net/
├── RSA/
│   ├── voidix.cer         # RSA完整证书链
│   └── voidix.net.key     # RSA私钥
└── ECC/
    ├── voidix.cer         # ECC完整证书链
    └── voidix.net.key     # ECC私钥
```

#### Nginx双证书配置
```nginx
server {
    listen 443 ssl http2;
    server_name voidix.net www.voidix.net;
    
    # RSA证书 (兼容性)
    ssl_certificate "/etc/nginx/ssl/voidix.net/RSA/voidix.cer";
    ssl_certificate_key "/etc/nginx/ssl/voidix.net/RSA/voidix.net.key";

    # ECC证书 (性能) - 现代浏览器优先选择
    ssl_certificate "/etc/nginx/ssl/voidix.net/ECC/voidix.cer";
    ssl_certificate_key "/etc/nginx/ssl/voidix.net/ECC/voidix.net.key";
    
    # SSL配置
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES128-GCM-SHA256:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-RSA-CHACHA20-POLY1305;
    ssl_prefer_server_ciphers off;
    
    location / {
        root /path/to/your/dist;
        index index.html;
        try_files $uri $uri/ /index.html;
    }
}
```

#### 证书申请步骤

1. **申请证书**
```bash
# RSA证书 (2048位)
acme.sh --issue -d voidix.net -d www.voidix.net --nginx --keylength 2048

# ECC证书 (P-256)
acme.sh --issue -d voidix.net -d www.voidix.net --nginx --keylength ec-256
```

2. **安装证书**
```bash
# 安装RSA证书
acme.sh --install-cert -d voidix.net \
--key-file /etc/nginx/ssl/voidix.net/RSA/voidix.net.key \
--fullchain-file /etc/nginx/ssl/voidix.net/RSA/voidix.cer \
--reloadcmd "service nginx force-reload"

# 安装ECC证书
acme.sh --install-cert -d voidix.net --ecc \
--key-file /etc/nginx/ssl/voidix.net/ECC/voidix.net.key \
--fullchain-file /etc/nginx/ssl/voidix.net/ECC/voidix.cer \
--reloadcmd "service nginx force-reload"
```

3. **设置权限**
```bash
chmod 644 /etc/nginx/ssl/voidix.net/*/*.cer
chmod 600 /etc/nginx/ssl/voidix.net/*/*.key
chown -R nginx:nginx /etc/nginx/ssl/voidix.net/
```

4. **验证配置**
```bash
# 测试nginx配置
nginx -t

# 重载nginx
systemctl reload nginx

# 检查RSA证书
openssl s_client -connect voidix.net:443 -cipher RSA

# 检查ECC证书
openssl s_client -connect voidix.net:443 -cipher ECDHE
```

#### 自动续期配置
创建续期脚本 `/etc/nginx/ssl/renew-certs.sh`：
```bash
#!/bin/bash
# 添加到crontab: 0 0 1 * * /etc/nginx/ssl/renew-certs.sh

# 续期RSA证书
acme.sh --renew -d voidix.net --force

# 续期ECC证书
acme.sh --renew -d voidix.net --ecc --force

# 重载nginx
systemctl reload nginx

echo "$(date): SSL certificates renewed successfully" >> /var/log/ssl-renewal.log
```

设置定时任务：
```bash
chmod +x /etc/nginx/ssl/renew-certs.sh
crontab -e
# 添加: 0 0 1 * * /etc/nginx/ssl/renew-certs.sh
```

### 常见部署问题

**问题1: 页面刷新404**
- 解决：配置nginx的 `try_files` 规则

**问题2: 静态资源加载失败**
- 解决：检查nginx根目录配置和文件权限

**问题3: 构建失败**
- 解决：检查Node.js版本和依赖安装

**问题4: GitHub Actions 部署失败**
- 解决方案：
  - 检查自托管运行器状态：`gh runner list`
  - 验证环境变量配置：检查 `NGINX_WEB_ROOT`, `BACKUP_DIR` 等
  - 查看工作流日志：`gh run view --log`
  - 检查脚本权限：`ls -la scripts/deploy.sh`

**问题5: deploy.sh 脚本权限错误**
- 解决：`chmod +x scripts/deploy.sh`

**问题6: 评论触发部署不生效**
- 解决：确保评论包含 "deploy" 关键字
- 检查工作流权限：需要 issues 和 pull-requests 写权限

**问题7: CSS 构建失败**
- 解决：检查 webpack.config.js 配置
- 验证 build-entries 目录下所有入口文件存在
- 运行 `npm run test:integration` 检查构建配置

### 部署流程

#### 🤖 自动化部署（推荐）
```bash
# GitHub Actions 自动部署
git push origin main
```

#### 开发环境部署
```bash
npm run dev
```

#### 测试环境部署
```bash
npm run build:test
npm run deploy:test
```

#### 生产环境部署
```bash
npm run build
npm run deploy:prod
```

#### 🧪 部署集成测试
运行完整的部署集成测试：
```bash
npm run test:integration
```

**测试覆盖项目:**
1. ✅ GitHub Actions 工作流文件存在且有效
2. ✅ 部署脚本可执行且存在
3. ✅ Node.js 部署脚本存在
4. ✅ package.json 配置正确
5. ✅ webpack 配置文件存在
6. ✅ 所有构建入口文件存在
7. ✅ CSS 构建入口点配置正确
8. ✅ scripts 目录下脚本权限正确
9. ✅ 集成测试脚本可执行
10. ✅ npm run build 命令正常运行

### 常用命令速查

#### npm命令
```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 构建生产版本
npm run build

# 运行测试
npm test

# 运行部署集成测试
npm run test:integration
```

#### GitHub Actions 相关命令
```bash
# 推送触发自动部署
git push origin main

# 查看工作流状态
gh workflow list

# 手动触发部署工作流
gh workflow run deploy.yml

# 查看最新工作流运行状态
gh run list --workflow=deploy.yml --limit=1
```

#### 部署脚本命令
```bash
# 完整部署流程（推荐）
node scripts/deploy-unified.js full

# 分步骤部署
node scripts/deploy-unified.js prepare          # 构建项目并准备 dist 目录
sudo node scripts/deploy-unified.js deploy     # 部署网站文件和 nginx 配置
sudo node scripts/deploy-unified.js config     # 仅部署 nginx 配置文件

# 备份操作
sudo node scripts/deploy-unified.js backup     # 创建当前部署的备份

# 手动执行原始 Bash 脚本
./scripts/deploy.sh

# 检查部署脚本权限
ls -la scripts/deploy.sh

# 运行集成测试
node scripts/test-deployment-integration.js
```

#### nginx 配置文件自动部署

部署脚本现在会自动处理 nginx 配置文件的部署：

**自动复制的配置文件：**
- `nginx-production.conf` → `/etc/nginx/sites-enabled/voidix.conf`
- `nginx-cdn-proxy.conf` → `/etc/nginx/sites-enabled/cdn-proxy.conf`

**安全特性：**
- ✅ 部署前自动备份现有配置
- ✅ nginx 语法测试验证
- ✅ 自动清理冲突的旧配置文件
- ✅ 配置部署后自动重载 nginx 服务

**环境变量配置：**
```bash
# 可选：自定义 nginx 配置路径
export NGINX_CONFIG_DIR="/etc/nginx/sites-enabled"
export NGINX_PROD_CONFIG="/etc/nginx/sites-enabled/voidix.conf"
export NGINX_CDN_CONFIG="/etc/nginx/sites-enabled/cdn-proxy.conf"
```

#### 服务器命令
```bash
# 查看进程
ps aux | grep nginx

# 重启服务
sudo systemctl restart nginx

# 查看日志
tail -f /var/log/nginx/error.log

# 检查端口占用
netstat -tlnp | grep :80
```

---

*如有部署问题，请参考[维护手册](MAINTENANCE.md)或提交Issue*

## 🌐 CDN反向代理配置

### CDN服务概述

Voidix网站配置了全方位CDN反向代理系统，通过 `cdn.voidix.net` 提供统一的CDN服务入口，支持防盗链、压缩、缓存等功能。

⚠️ **重要提示**: CDN服务启用了防盗链保护，仅允许以下来源访问：
- ✅ **localhost** (本地开发)
- ✅ ***.voidix.net** (官方域名)
- ✅ **voidix.net** (主域名)
- ✅ 主要搜索引擎爬虫

❌ **其他域名直接访问CDN资源将返回403错误**

### CDN架构设计

```
cdn.voidix.net
├── /unpkg/* → unpkg.com/*
├── /jsdelivr/* → cdn.jsdelivr.net/*
├── /cdnjs/* → cdnjs.cloudflare.com/ajax/libs/*
├── /tailwindcss/* → cdn.tailwindcss.com/*
└── /fonts/* → fonts.googleapis.com/*
```

### 核心特性
- ✅ **统一入口**: 所有CDN资源通过一个域名访问
- ✅ **Gzip压缩**: 自动压缩JS/CSS/JSON等资源
- ✅ **智能缓存**: 7天静态资源缓存，3天Tailwind CSS缓存
- ✅ **防盗链保护**: 仅允许voidix.net域名和搜索引擎引用
- ✅ **CORS支持**: 完整的跨域资源共享配置
- ✅ **SSL安全**: 使用现有的双证书配置

### CDN地址映射

| 原始服务 | 原始地址 | 代理地址 |
|---------|---------|---------|
| UNPKG | `https://unpkg.com/package@version/file` | `https://cdn.voidix.net/unpkg/package@version/file` |
| jsDelivr | `https://cdn.jsdelivr.net/npm/package@version/file` | `https://cdn.voidix.net/jsdelivr/npm/package@version/file` |
| CDNJS | `https://cdnjs.cloudflare.com/ajax/libs/lib/version/file` | `https://cdn.voidix.net/cdnjs/lib/version/file` |
| Tailwind CSS | `https://cdn.tailwindcss.com/file` | `https://cdn.voidix.net/tailwindcss/file` |
| Google Fonts | `https://fonts.googleapis.com/css?family=Font` | `https://cdn.voidix.net/fonts/css?family=Font` |

### 使用示例

```html
<!-- AOS动画库 -->
<!-- 原始: https://unpkg.com/aos@2.3.1/dist/aos.js -->
<script src="https://cdn.voidix.net/unpkg/aos@2.3.1/dist/aos.js"></script>

<!-- Tailwind CSS -->
<!-- 原始: https://cdn.tailwindcss.com -->
<script src="https://cdn.voidix.net/tailwindcss/"></script>
```

### CDN部署配置

#### 1. Nginx主配置准备
在 `/etc/nginx/nginx.conf` 的 `http {}` 块中添加缓存配置：

```nginx
# CDN缓存路径配置
proxy_cache_path /var/cache/nginx/cdn
                 levels=1:2
                 keys_zone=cdn_cache:100m
                 max_size=10g
                 inactive=7d
                 use_temp_path=off;

# 代理临时路径配置
proxy_temp_path /var/cache/nginx/temp;
```

#### 2. 创建缓存目录
```bash
# 创建缓存目录
sudo mkdir -p /var/cache/nginx/cdn
sudo mkdir -p /var/cache/nginx/temp
sudo chown -R nginx:nginx /var/cache/nginx/cdn /var/cache/nginx/temp
```

#### 3. 部署CDN配置
```bash
# 复制配置文件到Nginx配置目录
sudo cp nginx-cdn-proxy.conf /etc/nginx/sites-available/
sudo ln -s /etc/nginx/sites-available/nginx-cdn-proxy.conf /etc/nginx/sites-enabled/

# 测试配置
sudo nginx -t

# 重载Nginx
sudo systemctl reload nginx
```

#### 4. DNS配置
确保 `cdn.voidix.net` 指向服务器IP地址：
```
cdn.voidix.net. IN A 你的服务器IP
```

### CDN验证测试

```bash
# 测试健康检查
curl https://cdn.voidix.net/health

# 测试代理功能
curl -I https://cdn.voidix.net/tailwindcss/

# 检查缓存状态
curl -I https://cdn.voidix.net/unpkg/aos@2.3.1/dist/aos.js
```

### 防盗链保护详解

```nginx
# 防盗链配置
valid_referers none blocked server_names
    *.voidix.net
    voidix.net
    localhost
    ~\.google\.
    ~\.bing\.
    ~\.yahoo\.
    ~\.github\.
    ~\.baidu\.;

if ($invalid_referer) {
    return 403;
}
```

**允许访问的来源：**
- ✅ 直接访问（无Referer头）
- ✅ voidix.net官方域名
- ✅ localhost本地开发环境
- ✅ 主流搜索引擎爬虫

### CDN故障排除

#### 403 Forbidden - 防盗链拒绝
**症状**: 浏览器控制台显示403错误，CDN资源无法加载

**解决方案**:
- 本地开发: 使用 `localhost` 而不是IP地址
- 生产环境: 确保在 `*.voidix.net` 域名下访问
- 测试需求: 联系管理员临时添加域名到白名单

#### 502 Bad Gateway
```bash
# 检查上游服务器连接
curl -I https://unpkg.com/
curl -I https://cdn.jsdelivr.net/

# 检查DNS解析
nslookup unpkg.com
```

#### 缓存问题
```bash
# 清理特定缓存
sudo find /var/cache/nginx/cdn -name "*aos*" -delete

# 重载配置
sudo systemctl reload nginx
```

### CDN性能优化

**缓存策略:**
- **静态库文件**: 7天缓存 (UNPKG, jsDelivr, CDNJS, Google Fonts)
- **动态框架**: 3天缓存 (Tailwind CSS)
- **404错误**: 1分钟缓存，避免重复请求

**压缩配置:**
支持 `text/css`, `application/javascript`, `application/json`, `image/svg+xml`, `font/woff`, `font/woff2` 等文件类型的自动压缩。

### CDN维护监控

```bash
# 查看访问日志
sudo tail -f /var/log/nginx/access.log | grep cdn.voidix.net

# 查看错误日志
sudo tail -f /var/log/nginx/error.log

# 清理缓存
sudo rm -rf /var/cache/nginx/cdn/*
```
