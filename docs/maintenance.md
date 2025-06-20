# Voidix网站维护手册

## 🛠 日常维护任务

### 每天检查（3分钟）
- [ ] 网站能正常打开吗？
- [ ] 服务器状态页面更新了吗？
- [ ] 有玩家反馈新问题吗？
- [ ] CDN和缓存工作正常吗？

### 每周检查（15分钟）
- [ ] 所有页面链接都正常吗？
- [ ] 网站加载速度还OK吗？
- [ ] 有没有新的404错误？
- [ ] FAQ需要更新吗？
- [ ] SSL证书状态正常吗？

### 每月检查（1小时）
- [ ] 服务器信息更新
- [ ] 检查所有表单功能
- [ ] 更新sitemap.xml时间
- [ ] 备份重要数据
- [ ] 安全漏洞检查
- [ ] 性能监控报告分析

## 🚨 常见问题处理

### 网站打不开了
**可能原因：**
- 服务器出问题了
- 域名解析有问题
- nginx配置出错
- DDoS攻击

**解决步骤：**
1. 先检查服务器是否正常运行
2. 查看nginx错误日志
3. 检查域名DNS设置
4. 检查防火墙和安全组配置
5. 如果都正常，联系服务器提供商

### 页面显示错误
**可能原因：**
- HTML代码有问题
- CSS文件丢失
- JavaScript出错
- 缓存问题

**解决步骤：**
1. 按F12打开浏览器开发者工具
2. 看Console有没有红色错误信息
3. 检查Network标签页，看哪些文件加载失败
4. 清除浏览器缓存重试
5. 根据错误信息修复对应文件

### 网站加载很慢
**可能原因：**
- 图片文件太大
- CSS/JS文件未压缩
- 服务器性能不足
- CDN配置问题

**解决步骤：**
1. 使用PageSpeed Insights检测
2. 压缩图片和代码文件
3. 检查CDN配置
4. 优化服务器性能
5. 启用浏览器缓存

## 服务器相关问题

### CPU使用率过高
1. 检查进程占用情况
2. 优化代码性能
3. 增加服务器配置
4. 设置负载均衡

### 内存不足
1. 检查内存泄漏
2. 优化数据库查询
3. 清理临时文件
4. 增加虚拟内存

### 磁盘空间不足
1. 清理日志文件
2. 删除旧的备份
3. 压缩静态资源
4. 扩容磁盘空间

## 🔧 维护工具推荐

### 监控工具
- **网站监控**: UptimeRobot、阿里云监控
- **性能监控**: Google PageSpeed、GTmetrix
- **服务器监控**: 宝塔面板、Zabbix
- **错误监控**: Sentry、Rollbar

### 备份工具
- **代码备份**: Git、GitHub
- **数据库备份**: mysqldump、定时任务
- **文件备份**: rsync、云存储同步

### 安全工具
- **漏洞扫描**: AWVS、OpenVAS
- **恶意软件检测**: ClamAV
- **访问分析**: fail2ban、nginx日志分析

## 📊 性能优化建议

### 前端优化
1. **代码分割**: 使用动态导入
2. **图片优化**: WebP格式、懒加载
3. **CSS优化**: 关键CSS内联、非关键CSS异步
4. **JavaScript优化**: Tree-shaking、代码压缩

### 服务器优化
1. **HTTP/2**: 启用HTTP/2协议
2. **Gzip压缩**: 启用文本文件压缩
3. **缓存策略**: 合理设置Cache-Control
4. **CDN加速**: 使用内容分发网络

### 数据库优化
1. **索引优化**: 为常用查询添加索引
2. **查询优化**: 避免N+1查询问题
3. **连接池**: 使用数据库连接池
4. **读写分离**: 大型应用考虑读写分离

## 🔒 安全维护

### 安全检查清单
- [ ] SSL证书有效性
- [ ] 密码强度和定期更换
- [ ] 软件版本更新
- [ ] 访问日志异常检查
- [ ] 备份数据完整性验证

### 安全最佳实践
1. **定期更新**: 保持系统和软件最新
2. **最小权限**: 只给必要的权限
3. **双因子认证**: 重要账号启用2FA
4. **数据加密**: 敏感数据传输和存储加密
5. **访问控制**: 限制管理后台访问IP

## 📈 监控和报告

### 关键指标监控
- **可用性**: 网站正常运行时间
- **性能**: 页面加载时间、TTFB
- **安全**: 攻击尝试、异常访问
- **用户体验**: 错误率、转化率

### 定期报告
- **每周**: 基础运行状况报告
- **每月**: 详细性能和安全报告
- **每季度**: 优化建议和改进计划

## 📞 紧急联系信息

### 技术支持
- **服务器提供商**: [联系方式]
- **域名注册商**: [联系方式]
- **CDN服务商**: [联系方式]

### 应急流程
1. **发现问题**: 立即记录时间和现象
2. **初步诊断**: 检查常见原因
3. **紧急修复**: 实施临时解决方案
4. **问题根因**: 找出根本原因
5. **永久修复**: 实施长期解决方案
6. **文档记录**: 记录问题和解决过程

## 常用服务器命令

```bash
# 查看进程
ps aux | grep nginx

# 重启服务
sudo systemctl restart nginx

# 查看日志
tail -f /var/log/nginx/error.log

# 检查端口占用
netstat -tlnp | grep :80

# 检查磁盘空间
df -h

# 检查内存使用
free -h

# 查看系统负载
top
```

---

*维护是保证网站稳定运行的关键。如有问题请参考[部署指南](DEPLOY.md)或提交Issue*

### 搜索排名下降
**怎么办**：
参考[SEO完整指南](seo-guide.md)和[SEO日常任务](seo-tasks.md)

### CDN资源加载失败
**症状表现**：
- 页面样式混乱（TailwindCSS未加载）
- JavaScript功能异常（动画库或其他脚本未加载）
- 字体显示不正常（Google Fonts未加载）
- 浏览器控制台显示403错误

**可能原因**：
- 访问域名不在防盗链白名单中
- Referer头信息被浏览器或代理修改
- CDN服务器配置问题

**排查步骤**：
1. **检查访问域名**
   ```bash
   # 确认当前访问的域名
   # ✅ 允许的域名：
   # - localhost (任意端口)
   # - *.voidix.net
   # - voidix.net
   ```

2. **查看浏览器控制台错误**
   ```
   Access to ... has been blocked by CORS policy
   403 Forbidden (防盗链拒绝)
   ```

3. **测试CDN连通性**
   ```powershell
   # 测试CDN域名解析
   nslookup cdn.voidix.net
   
   # 测试CDN响应
   curl -I https://cdn.voidix.net/tailwindcss@3.4.16/
   ```

**解决方案**：
- 本地开发：确保使用`localhost`而不是`127.0.0.1`或其他IP
- 生产环境：确保在`*.voidix.net`域名下访问
- 测试环境：如需在其他域名测试，请联系管理员临时添加到白名单

## 文件修改指南

### 更新首页内容
编辑`index.html`文件：
- 服务器信息在`<main>`标签内
- 修改后记得检查语法是否正确
- 建议先在测试环境试一下

### 更新FAQ
编辑`faq.html`文件：
- 每个问题都是一个`<details>`标签
- 添加新问题记得保持格式一致
- 更新后测试展开/收起功能

### 更新状态页面
编辑`status.html`文件：
- 服务器状态在JavaScript部分
- 修改`servers`数组中的信息
- 测试页面能否正常显示状态

### 修改样式
编辑`assets/css/style.css`文件：
- 修改前建议备份原文件
- 测试在不同设备上的显示效果
- 确保移动端也正常显示

## 性能优化

### 图片优化
- 使用WebP格式（如果浏览器支持）
- 压缩图片大小，但保持清晰度
- 添加`loading="lazy"`属性

### 代码优化
- 压缩CSS和JavaScript文件
- 移除不必要的代码和注释
- 合并小的CSS文件

### 缓存设置
检查`nginx-production.conf`文件：
- 静态文件缓存时间是否合理
- 启用了gzip压缩吗
- 浏览器缓存设置是否正确

## 安全维护

### 定期检查
- [ ] SSL证书是否过期
- [ ] 有没有可疑的访问记录
- [ ] 所有表单都有防护措施吗
- [ ] 敏感文件是否暴露

### 备份策略
**每周备份**：
- 所有HTML文件
- CSS和JavaScript文件
- 配置文件

**每月备份**：
- 完整网站文件
- 服务器配置
- 域名设置记录

## 监控工具设置

### 网站可用性监控
推荐工具：
- UptimeRobot（免费）
- 站长工具监控
- 百度云观测

### 性能监控
- Google PageSpeed Insights
- GTmetrix
- Pingdom

### SEO监控
参考[SEO日常任务](seo-tasks.md)的工具列表

## 紧急联系信息

### 服务器问题
- 服务器提供商客服电话：/
- 技术支持邮箱：/

### 域名问题
- 域名注册商：/
- DNS服务商：/

### 其他技术支持
- 网站开发者：ASKLL520@outlook.com
- 运维工程师：/


## 新手建议

### 第一次接手网站
1. 先通读这份维护手册
2. 熟悉网站的基本结构
3. 了解各个文件的作用
4. 设置好监控工具
5. 建立定期检查的习惯

### 修改文件前
1. 一定要备份原文件
2. 在测试环境先试试
3. 一次只改一个小地方
4. 改完立即测试效果

### 遇到问题时
1. 不要慌，大部分问题都有解决方法
2. 先查看错误信息，理解问题所在
3. 搜索相关解决方案
4. 必要时寻求技术支持

---

记住：网站维护是一个持续的过程，需要耐心和细心。有问题随时查看这份手册，或者参考其他相关文档。