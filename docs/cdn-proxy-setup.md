# CDN 反向代理配置指南

## 概述

这是 Voidix 网站的全方位 CDN 反向代理系统，通过 `cdn.voidix.net` 提供统一的 CDN 服务入口，支持防盗链、压缩、缓存等功能。

## 架构设计

### 🏗️ 代理结构
```
cdn.voidix.net
├── /unpkg/* → unpkg.com/*
├── /jsdelivr/* → cdn.jsdelivr.net/*
├── /cdnjs/* → cdnjs.cloudflare.com/ajax/libs/*
├── /tailwindcss/* → cdn.tailwindcss.com/*
└── /fonts/* → fonts.googleapis.com/*
```

### 🔧 核心特性
- ✅ **统一入口**: 所有 CDN 资源通过一个域名访问
- ✅ **Gzip 压缩**: 自动压缩 JS/CSS/JSON 等资源
- ✅ **智能缓存**: 7天静态资源缓存，3天 Tailwind CSS 缓存
- ✅ **防盗链保护**: 仅允许 voidix.net 域名和搜索引擎引用
- ✅ **CORS 支持**: 完整的跨域资源共享配置
- ✅ **SSL 安全**: 使用现有的双证书配置
- ✅ **监控支持**: 健康检查和状态监控端点

## 配置文件

### 主配置文件
- **文件**: `nginx-cdn-proxy.conf`
- **用途**: Nginx 反向代理配置
- **位置**: 项目根目录

### 缓存配置
```nginx
proxy_cache_path /var/cache/nginx/cdn levels=1:2 keys_zone=cdn_cache:100m max_size=10g inactive=7d use_temp_path=off;
```

## 地址映射

### 原始地址 → 代理地址映射

| 原始服务 | 原始地址 | 代理地址 |
|---------|---------|---------|
| UNPKG | `https://unpkg.com/package@version/file` | `https://cdn.voidix.net/unpkg/package@version/file` |
| jsDelivr | `https://cdn.jsdelivr.net/npm/package@version/file` | `https://cdn.voidix.net/jsdelivr/npm/package@version/file` |
| CDNJS | `https://cdnjs.cloudflare.com/ajax/libs/lib/version/file` | `https://cdn.voidix.net/cdnjs/lib/version/file` |
| Tailwind CSS | `https://cdn.tailwindcss.com/file` | `https://cdn.voidix.net/tailwindcss/file` |
| Google Fonts | `https://fonts.googleapis.com/css?family=Font` | `https://cdn.voidix.net/fonts/css?family=Font` |

### 使用示例

#### React 库
```html
<!-- 原始地址 -->
<script src="https://unpkg.com/react@18/umd/react.development.js"></script>

<!-- 代理地址 -->
<script src="https://cdn.voidix.net/unpkg/react@18/umd/react.development.js"></script>
```

#### Tailwind CSS
```html
<!-- 原始地址 -->
<script src="https://cdn.tailwindcss.com"></script>

<!-- 代理地址 -->
<script src="https://cdn.voidix.net/tailwindcss/"></script>
```

## 部署步骤

### 1. 准备工作
```bash
# 创建缓存目录
sudo mkdir -p /var/cache/nginx/cdn
sudo chown nginx:nginx /var/cache/nginx/cdn

# 检查证书文件存在
ls -la /etc/ssl/certs/voidix.net*
ls -la /etc/ssl/private/voidix.net*
```

### 2. 部署配置
```bash
# 复制配置文件到 Nginx 配置目录
sudo cp nginx-cdn-proxy.conf /etc/nginx/sites-available/
sudo ln -s /etc/nginx/sites-available/nginx-cdn-proxy.conf /etc/nginx/sites-enabled/

# 测试配置
sudo nginx -t

# 重载 Nginx
sudo systemctl reload nginx
```

### 3. DNS 配置
确保 `cdn.voidix.net` 指向服务器 IP 地址：
```
cdn.voidix.net. IN A 你的服务器IP
```

### 4. 验证测试
```bash
# 测试健康检查
curl https://cdn.voidix.net/health

# 测试代理功能
curl -I https://cdn.voidix.net/tailwindcss/

# 检查缓存状态
curl -I https://cdn.voidix.net/unpkg/react@18/umd/react.development.js
```

## 性能优化

### 缓存策略
- **静态库文件**: 7天缓存 (UNPKG, jsDelivr, CDNJS, Google Fonts)
- **动态框架**: 3天缓存 (Tailwind CSS)
- **404错误**: 1分钟缓存，避免重复请求

### 压缩配置
支持的文件类型：
- `text/plain`
- `text/css`
- `text/javascript`
- `application/javascript`
- `application/json`
- `image/svg+xml`
- `font/woff`
- `font/woff2`

### 安全配置
- **防盗链**: 仅允许 voidix.net 相关域名引用
- **安全头**: X-Frame-Options, X-Content-Type-Options 等
- **CORS**: 允许跨域资源访问

## 监控与维护

### 健康检查
```bash
# 基本健康检查
curl https://cdn.voidix.net/health

# 返回: OK
```

### 状态监控
```bash
# 内网访问状态页面 (仅限内网)
curl http://127.0.0.1/nginx_status
```

### 缓存管理
```bash
# 清理缓存
sudo rm -rf /var/cache/nginx/cdn/*

# 重启 Nginx 服务
sudo systemctl restart nginx
```

### 日志监控
```bash
# 查看访问日志
sudo tail -f /var/log/nginx/access.log | grep cdn.voidix.net

# 查看错误日志
sudo tail -f /var/log/nginx/error.log
```

## 故障排除

### 常见问题

#### 1. 502 Bad Gateway
```bash
# 检查上游服务器连接
curl -I https://unpkg.com/
curl -I https://cdn.jsdelivr.net/

# 检查 DNS 解析
nslookup unpkg.com
nslookup cdn.jsdelivr.net
```

#### 2. SSL 证书问题
```bash
# 验证证书文件
sudo nginx -t

# 检查证书有效期
openssl x509 -in /etc/ssl/certs/voidix.net.crt -text -noout | grep "Not After"
```

#### 3. 缓存问题
```bash
# 清理特定缓存
sudo find /var/cache/nginx/cdn -name "*react*" -delete

# 重载配置
sudo systemctl reload nginx
```

## 网站集成

### HTML 文件更新
需要更新以下文件中的 CDN 地址：
- `index.html`
- `status.html`
- `faq.html`
- `error.html`
- `bug-report.html`

### 更新示例
```html
<!-- 更新前 -->
<script src="https://unpkg.com/react@18/umd/react.development.js"></script>

<!-- 更新后 -->
<script src="https://cdn.voidix.net/unpkg/react@18/umd/react.development.js"></script>
```

## 维护清单

### 定期检查 (每月)
- [ ] 检查缓存使用情况
- [ ] 验证上游服务器可用性
- [ ] 检查 SSL 证书有效期
- [ ] 监控访问日志异常

### 性能监控 (每周)
- [ ] 检查响应时间
- [ ] 监控缓存命中率
- [ ] 查看错误日志
- [ ] 验证压缩效果

---

**创建时间**: 2025-06-04 22:55:31  
**用途**: CDN 反向代理系统部署和维护指南