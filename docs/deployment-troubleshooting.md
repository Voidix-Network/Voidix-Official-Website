# 部署故障排除指南

## 🚨 常见部署问题与解决方案

### 问题1：备份目录创建失败
**错误信息**：
```
cp: cannot create regular file '/var/backups/voidix/20250604_044030/nginx.conf.bak': No such file or directory
```

**原因**：备份目录不存在
**解决方案**：已在deploy.sh中添加目录创建逻辑
```bash
# 确保备份根目录存在
sudo mkdir -p "$BACKUP_ROOT"
```

### 问题2：Nginx配置测试失败
**错误信息**：
```
nginx: [emerg] "server" directive is not allowed here in /path/to/nginx-production.conf:6
```

**原因**：使用`nginx -t -c`直接测试sites-enabled配置文件，server块不能在主配置文件中使用
**解决方案**：修改测试方法，先临时部署再测试
```bash
# 先临时复制到目标位置进行测试
sudo cp "$NGINX_CONF_SOURCE" "$NGINX_CONF_DEST.tmp"
sudo nginx -t
```

### 问题3：SSL共享内存区域冲突
**错误信息**：
```
[emerg] the size 10485760 of shared memory zone "SSL" conflicts with already declared size 1048576
```

**原因**：多个配置文件使用相同的SSL会话缓存名称"SSL"，但大小不同
**解决方案**：为每个配置使用唯一的会话缓存名称
```nginx
# 重定向服务器使用不同名称
ssl_session_cache shared:VOIDIX_REDIRECT_SSL:10m;

# 主服务器使用不同名称
ssl_session_cache shared:VOIDIX_SSL:10m;
```

### 问题4：Nginx共享内存区域大小为零
**错误信息**：
```
[emerg] zero size shared memory zone "conn_limit_per_ip"
```

**原因**：在server块中使用了`limit_conn`，但在http上下文中没有定义对应的`limit_conn_zone`
**解决方案**：
1. 注释掉server块中的limit_conn和limit_req指令
2. 在主nginx.conf的http块中添加正确的zone定义
```nginx
# 在主nginx.conf中添加
http {
    limit_conn_zone $binary_remote_addr zone=conn_limit_per_ip:10m;
    limit_req_zone $binary_remote_addr zone=req_limit_per_ip:10m rate=10r/s;
    # ... 其他配置 ...
}

# 然后在站点配置中使用
server {    # ... 其他配置 ...
    limit_conn conn_limit_per_ip 20;
    limit_req zone=req_limit_per_ip burst=20 nodelay;
}
```

### 问题5：服务器名称冲突警告
**错误信息**：
```
[warn] conflicting server name "voidix.top" on 0.0.0.0:80, ignored
```

**原因**：多个配置文件（或同一文件的多个server块）为同一个IP:端口组合定义了相同的server_name
**解决方案**：
1. 这通常只是警告，不会阻止nginx启动
2. 如果需要解决，可以检查所有nginx配置并确保每个IP:端口组合的server_name是唯一的
3. 如果是多个配置文件定义了相同的server_name，可以删除或禁用不需要的配置

**注意**：当使用`include sites-enabled/*`方式加载多个配置文件时，容易出现此类冲突

## 🔧 Nginx配置相关问题

### 配置文件结构说明
- `nginx-production.conf` 包含server块，应放在`/etc/nginx/sites-enabled/`
- 不能直接用作主配置文件测试
- 必须在http块内加载

### SSL证书路径问题
如果出现SSL证书错误：
```
nginx: [emerg] cannot load certificate "/etc/nginx/ssl/voidix/fullchain.cer"
```

**检查清单**：
1. 证书文件是否存在
2. 文件权限是否正确（644 for cert, 600 for key）
3. nginx用户是否有读取权限
4. 路径是否正确

## 🛠️ 部署脚本改进历史

### v1.0 → v1.1
- 修复备份目录创建问题
- 添加BACKUP_ROOT变量避免硬编码

### v1.1 → v1.2  
- 修复Nginx配置测试方法
- 改用临时文件测试避免context错误

## 📋 部署前检查清单

### 环境检查
- [ ] Nginx服务正在运行
- [ ] SSL证书文件存在且权限正确
- [ ] 备份目录可写
- [ ] sites-enabled目录存在

### 配置检查
- [ ] nginx-production.conf语法正确
- [ ] 域名配置匹配实际域名
- [ ] 网站根目录路径正确
- [ ] 日志目录可写

### 权限检查
- [ ] 部署用户有sudo权限
- [ ] 网站文件所有权正确
- [ ] Nginx配置目录可写

## 🔍 调试命令

### 检查Nginx状态
```bash
sudo systemctl status nginx
sudo nginx -t
sudo nginx -T  # 显示完整配置
```

### 检查文件权限
```bash
ls -la /etc/nginx/sites-enabled/
ls -la /www/voidix/
ls -la /etc/nginx/ssl/voidix/
```

### 查看日志
```bash
sudo tail -f /var/log/nginx/error.log
sudo tail -f /var/log/nginx/voidix_error.log
```

## 🆘 紧急恢复

### 如果部署失败
1. 检查备份目录：`ls -la $BACKUP_ROOT`
2. 恢复Nginx配置：`sudo cp $BACKUP_DIR/nginx.conf.bak /etc/nginx/sites-enabled/voidix.conf`
3. 测试配置：`sudo nginx -t`
4. 重载Nginx：`sudo systemctl reload nginx`

### 如果网站无法访问
1. 检查Nginx状态：`sudo systemctl status nginx`
2. 检查配置语法：`sudo nginx -t`
3. 查看错误日志：`sudo tail -20 /var/log/nginx/error.log`
4. 恢复到上一个工作版本

## 💡 最佳实践

1. **测试优先**：在生产环境部署前，先在测试环境验证
2. **备份策略**：每次部署前自动创建备份
3. **渐进部署**：分步骤部署，每步验证
4. **监控告警**：部署后检查网站可访问性
5. **回滚计划**：准备快速回滚方案

## 📞 获取帮助

如果遇到本文档未覆盖的问题：
1. 查看完整错误日志
2. 检查系统资源使用情况
3. 确认网络连接状态
4. 联系系统管理员

记住：部署问题通常有规律可循，记录问题和解决方案有助于预防未来问题！