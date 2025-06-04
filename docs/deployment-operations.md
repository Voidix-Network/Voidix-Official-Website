# 部署与运维完整指南

## 🎯 概述

这份指南涵盖了Voidix网站的完整部署流程、日常运维和故障排除，从基础操作到高级问题诊断。

---

## 🚀 第一部分：自动化部署

### 💡 GitHub Actions部署流程

Voidix网站使用GitHub Actions实现自动化部署，支持评论触发和手动触发。

#### 触发部署的方法

**方法1：评论触发**
在已合并的PR中评论：
```
deploy
```

**方法2：手动触发**
1. 进入GitHub仓库的Actions页面
2. 选择"Advanced PR Deployment Controller"工作流
3. 点击"Run workflow"

#### 部署权限要求
- 评论者必须是仓库的OWNER或MEMBER
- PR必须已合并到master分支
- 工作流会自动验证权限和状态

### 🔧 部署脚本功能

部署脚本(`deploy.sh`)自动执行以下步骤：

1. **权限检查**：验证执行权限
2. **备份创建**：自动备份当前版本
3. **文件部署**：同步网站文件到生产目录
4. **Nginx配置**：更新和测试Web服务器配置
5. **服务重载**：重启相关服务
6. **部署验证**：检查网站可访问性
7. **清理维护**：清理旧备份文件

---

## 🛠️ 第二部分：故障排除

### 🚨 常见部署问题与解决方案

#### 问题1：备份目录创建失败
**错误信息**：
```
cp: cannot create regular file '/var/backups/voidix/20250604_044030/nginx.conf.bak': No such file or directory
```

**原因**：备份目录不存在
**解决方案**：已在deploy.sh中添加目录创建逻辑
```bash
# 确保备份根目录存在
sudo mkdir -p "$BACKUP_ROOT"
# 创建时间戳备份目录
sudo mkdir -p "$BACKUP_DIR"
```

#### 问题2：Nginx配置测试失败
**错误信息**：
```
nginx: [emerg] "server" directive is not allowed here in /path/to/nginx-production.conf:6
```

**原因**：使用错误的nginx测试方法
**解决方案**：修改测试方法，先临时部署再测试
```bash
# 先临时复制到目标位置进行测试
sudo cp "$NGINX_CONF_SOURCE" "$NGINX_CONF_DEST.tmp"
sudo nginx -t
```

#### 问题3：SSL证书路径错误
**错误信息**：
```
nginx: [emerg] cannot load certificate "/etc/nginx/ssl/voidix/fullchain.cer"
```

**检查清单**：
1. 证书文件是否存在：`ls -la /etc/nginx/ssl/voidix/`
2. 文件权限是否正确：`chmod 644 fullchain.cer && chmod 600 voidix.top.key`
3. nginx用户是否有读取权限
4. 路径配置是否正确

### 🔍 调试工具和命令

#### 检查Nginx状态
```bash
# 查看服务状态
sudo systemctl status nginx

# 测试配置语法
sudo nginx -t

# 显示完整配置
sudo nginx -T

# 重载配置
sudo systemctl reload nginx
```

#### 检查文件权限
```bash
# 检查Nginx配置目录
ls -la /etc/nginx/sites-enabled/

# 检查网站文件目录
ls -la /www/voidix/

# 检查SSL证书
ls -la /etc/nginx/ssl/voidix/
```

#### 查看系统日志
```bash
# Nginx错误日志
sudo tail -f /var/log/nginx/error.log

# 网站专用日志
sudo tail -f /var/log/nginx/voidix_error.log

# 系统日志
sudo journalctl -u nginx -f
```

### 🆘 紧急恢复程序

#### 如果部署失败
1. **检查备份**：`ls -la $BACKUP_ROOT`
2. **恢复Nginx配置**：
   ```bash
   sudo cp $BACKUP_DIR/nginx.conf.bak /etc/nginx/sites-enabled/voidix.conf
   ```
3. **测试配置**：`sudo nginx -t`
4. **重载服务**：`sudo systemctl reload nginx`

#### 如果网站无法访问
1. **检查Nginx状态**：`sudo systemctl status nginx`
2. **检查配置语法**：`sudo nginx -t`
3. **查看错误日志**：`sudo tail -20 /var/log/nginx/error.log`
4. **恢复到上一个工作版本**

---

## 📋 第三部分：日常运维

### 🔒 安全维护

#### SSL证书管理
```bash
# 检查证书有效期
openssl x509 -in /etc/nginx/ssl/voidix/fullchain.cer -text -noout | grep "Not After"

# 测试SSL配置
openssl s_client -connect voidix.top:443 -servername voidix.top
```

#### 安全头部验证
```bash
# 检查安全头部
curl -I https://www.voidix.top

# 测试CSP策略
curl -H "Accept: text/html" https://www.voidix.top | grep -i "content-security-policy"
```

### 📊 性能监控

#### 网站性能检查
```bash
# 响应时间测试
curl -w "@curl-format.txt" -o /dev/null -s https://www.voidix.top

# 压缩测试
curl -H "Accept-Encoding: gzip" -I https://www.voidix.top
```

#### 服务器资源监控
```bash
# 磁盘使用情况
df -h

# 内存使用情况
free -h

# Nginx进程状态
ps aux | grep nginx
```

### 🧹 维护任务

#### 日志轮转和清理
```bash
# 检查日志大小
du -sh /var/log/nginx/

# 手动轮转日志
sudo logrotate -f /etc/logrotate.d/nginx
```

#### 备份管理
```bash
# 检查备份空间使用
du -sh /var/backups/voidix/

# 清理旧备份（保留最近5个）
sudo find /var/backups/voidix -maxdepth 1 -type d -name "20*" | \
    sudo sort -r | sudo tail -n +6 | sudo xargs -r rm -rf
```

---

## 📝 第四部分：部署检查清单

### ✅ 部署前检查

#### 环境检查
- [ ] Nginx服务正在运行
- [ ] SSL证书文件存在且权限正确
- [ ] 备份目录可写
- [ ] sites-enabled目录存在
- [ ] 磁盘空间充足

#### 配置检查
- [ ] nginx-production.conf语法正确
- [ ] 域名配置匹配实际域名
- [ ] 网站根目录路径正确
- [ ] 日志目录可写
- [ ] SSL证书路径正确

#### 权限检查
- [ ] 部署用户有sudo权限
- [ ] 网站文件所有权正确
- [ ] Nginx配置目录可写
- [ ] SSL证书可读

### ✅ 部署后验证

#### 功能验证
- [ ] 网站首页可正常访问
- [ ] HTTPS重定向工作正常
- [ ] 静态资源加载正确
- [ ] 搜索功能正常
- [ ] 表单提交正常

#### 性能验证
- [ ] 页面加载速度正常
- [ ] Gzip压缩生效
- [ ] 缓存头设置正确
- [ ] HTTP/2推送正常

#### 安全验证
- [ ] SSL证书有效
- [ ] 安全头部设置正确
- [ ] CSP策略生效
- [ ] 敏感文件无法访问

---

## 💡 第五部分：最佳实践

### 🎯 部署策略

1. **渐进式部署**：分步骤执行，每步验证
2. **蓝绿部署**：使用备份快速切换
3. **健康检查**：部署后立即验证功能
4. **回滚准备**：随时准备回到上一版本

### 🔄 变更管理

1. **测试环境**：生产部署前先在测试环境验证
2. **版本控制**：所有配置文件纳入版本管理
3. **变更记录**：记录每次部署的变更内容
4. **通知机制**：部署状态及时通知相关人员

### 📈 监控告警

1. **实时监控**：设置网站可用性监控
2. **性能指标**：监控响应时间和错误率
3. **资源监控**：监控服务器资源使用情况
4. **日志分析**：定期分析错误日志

### 🔧 自动化改进

1. **脚本优化**：持续优化部署脚本
2. **错误处理**：增强错误检测和处理能力
3. **文档更新**：及时更新操作文档
4. **流程改进**：根据实际情况优化流程

---

## 📞 获取帮助

### 🆘 紧急联系

如果遇到紧急问题：
1. 首先尝试恢复到上一个稳定版本
2. 查看详细错误日志确定问题
3. 参考故障排除部分的相关解决方案
4. 记录问题现象和解决过程

### 📚 参考资源

- [Nginx官方文档](https://nginx.org/en/docs/)
- [GitHub Actions文档](https://docs.github.com/en/actions)
- [SSL证书管理指南](https://certbot.eff.org/)
- [Web安全最佳实践](https://owasp.org/)

记住：部署是一个需要谨慎对待的过程，准备充分、步骤清晰、验证及时是成功的关键！