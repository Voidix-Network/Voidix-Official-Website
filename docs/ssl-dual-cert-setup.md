# RSA+ECC双证书配置指南

## 🎯 概述
为voidix.net配置RSA+ECC双证书，提供最佳兼容性和性能：
- **RSA证书**: 兼容旧版浏览器和系统
- **ECC证书**: 现代浏览器性能优先，加密强度更高，密钥更小

## 📁 证书文件结构
```
/etc/nginx/ssl/voidix.net/
├── RSA/
│   ├── voidix.cer         # RSA完整证书链
│   └── voidix.net.key     # RSA私钥
└── ECC/
    ├── voidix.cer         # ECC完整证书链
    └── voidix.net.key     # ECC私钥
```

## 🔧 Nginx配置 (已更新)
nginx-production.conf中的双证书配置：
```nginx
# RSA证书 (兼容性)
ssl_certificate "/etc/nginx/ssl/voidix.net/RSA/voidix.cer";
ssl_certificate_key "/etc/nginx/ssl/voidix.net/RSA/voidix.net.key";

# ECC证书 (性能) - 现代浏览器优先选择
ssl_certificate "/etc/nginx/ssl/voidix.net/ECC/voidix.cer";
ssl_certificate_key "/etc/nginx/ssl/voidix.net/ECC/voidix.net.key";
```

## 📋 部署步骤

### 1. 申请证书
```bash
# RSA证书 (2048位)
acme.sh --issue -d voidix.net -d www.voidix.net --nginx --keylength 2048

# ECC证书 (P-256)
acme.sh --issue -d voidix.net -d www.voidix.net --nginx --keylength ec-256
```

### 2. 安装证书
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

### 3. 设置权限
```bash
chmod 644 /etc/nginx/ssl/voidix.net/*/*.cer
chmod 600 /etc/nginx/ssl/voidix.net/*/*.key
chown -R nginx:nginx /etc/nginx/ssl/voidix.net/
```

### 4. 验证配置
```bash
# 测试nginx配置
nginx -t

# 重载nginx
systemctl reload nginx
```

## 🔍 验证双证书工作
```bash
# 检查RSA证书
openssl s_client -connect voidix.net:443 -cipher RSA

# 检查ECC证书
openssl s_client -connect voidix.net:443 -cipher ECDHE
```

## 🚨 重要说明
1. **WebSocket保持不变**: server.voidix.top:10203 继续使用原配置
2. **自动续期**: 配置定时任务自动更新两种证书
3. **回退机制**: 如果ECC证书问题，RSA证书确保服务可用
4. **性能监控**: 监控两种证书的使用情况和性能

## 🔄 自动续期脚本
```bash
#!/bin/bash
# 添加到crontab: 0 0 1 * * /path/to/renew-certs.sh

# 续期RSA证书
acme.sh --renew -d voidix.net --force

# 续期ECC证书
acme.sh --renew -d voidix.net --ecc --force

# 重载nginx
systemctl reload nginx
```

生成时间: 2025-06-04 20:22:20