# 开发工作流程指南

## 项目开发标准流程

### 新手入门

#### 环境准备
1. **克隆项目**
   ```powershell
   git clone https://github.com/your-username/Voidix-Official-Website.git
   cd Voidix-Official-Website
   ```

2. **了解项目结构**
   - 阅读 `memory-bank/projectbrief.md` 了解项目概述
   - 查看 `docs/project-structure.md` 了解文件组织
   - 学习 `.clinerules` 中的项目最佳实践

3. **本地开发环境**
   ```powershell
   # 方法1：使用 Python 内置服务器
   python -m http.server 8000
   
   # 方法2：使用 PowerShell 的简单服务器（如果有）
   # 或者直接用 VS Code 的 Live Server 扩展
   ```

### 开发流程

#### 功能开发标准流程

1. **创建功能分支**
   ```powershell
   git checkout -b feature/功能名称
   ```

2. **开发前准备**
   - 更新 `memory-bank/activeContext.md` 记录当前工作
   - 如果是新功能，更新 `memory-bank/progress.md`
   - 检查 `.clinerules` 中的相关模式

3. **编码规范**
   - HTML: 使用语义化标签，保持层级清晰
   - CSS: 遵循现有的类命名规范，优先使用 TailwindCSS
   - JavaScript: 模块化开发，更新 `sharedConfig.js` 配置
   - 注释: 关键逻辑必须添加注释

4. **测试检查**
   ```powershell
   # 检查页面加载
   # 访问 http://localhost:8000
   
   # 检查所有页面
   # index.html, status.html, faq.html, bug-report.html, error.html
   
   # 检查移动端响应式
   # 使用浏览器开发者工具测试不同屏幕尺寸
   ```

5. **提交代码**
   ```powershell
   git add .
   git commit -m "Add: 描述功能变更"
   ```

#### Bug修复流程

1. **创建修复分支**
   ```powershell
   git checkout -b bugfix/问题描述
   ```

2. **问题分析**
   - 复现问题
   - 查看浏览器控制台错误
   - 检查相关文档

3. **修复和测试**
   - 修复问题
   - 验证修复效果
   - 确保不影响其他功能

4. **更新文档**
   - 如果是文档问题，更新对应的 md 文件
   - 在 `memory-bank/progress.md` 中标记问题已解决

### 文档维护

#### 文档更新时机
- 功能变更时必须更新相关文档
- 发现文档不准确时立即修正
- 定期检查文档与实际代码的一致性

#### 文档类型和职责

**核心文档** (memory-bank/)
- `projectbrief.md`: 项目基础信息，变更需谨慎
- `activeContext.md`: 当前工作状态，频繁更新
- `progress.md`: 项目进度，每次完成功能后更新
- `techContext.md`: 技术栈变更时更新
- `systemPatterns.md`: 架构调整时更新
- `productContext.md`: 产品定位变更时更新

**操作文档** (docs/)
- `maintenance.md`: 运维流程变更时更新
- `seo-guide.md`: SEO策略调整时更新
- `project-structure.md`: 文件结构变更时更新

**配置文件**
- `.clinerules`: 发现新的最佳实践时更新
- `README.md`: 项目重大变更时更新

### 部署流程

#### 本地测试部署
```powershell
# 使用部署脚本进行本地测试
bash deploy.sh  # 或在 Git Bash 中运行
```

#### 生产部署
1. **合并到主分支**
   ```powershell
   git checkout main
   git merge feature/功能名称
   ```

2. **推送到远程**
   ```powershell
   git push origin main
   ```

3. **服务器部署**
   - 自动部署：通过 CI/CD 流程
   - 手动部署：SSH 到服务器运行部署脚本

4. **部署后检查**
   - 访问网站确认功能正常
   - 检查服务器状态监控
   - 验证所有页面链接

### 问题排查

#### 常见问题类型

**页面加载问题**
1. 检查 HTML 文件语法
2. 验证 CSS/JS 文件路径
3. 查看浏览器控制台错误

**状态监控问题**
1. 检查 API 连接
2. 验证 `sharedConfig.js` 配置
3. 查看网络请求响应

**SEO 问题**
1. 验证 meta 标签完整性
2. 检查结构化数据
3. 使用 Google Search Console 诊断

#### 调试工具
- **浏览器开发者工具**: 主要调试工具
- **Google PageSpeed Insights**: 性能分析
- **Google Search Console**: SEO 分析
- **移动设备测试**: 响应式设计验证

### 代码审查标准

#### 提交前自检清单
- [ ] 代码符合现有风格规范
- [ ] 添加了必要的注释
- [ ] 更新了相关文档
- [ ] 在多个浏览器测试通过
- [ ] 移动端显示正常
- [ ] 没有控制台错误
- [ ] 性能没有明显下降

#### 审查重点
1. **功能正确性**: 是否按需求实现
2. **代码质量**: 是否易读易维护
3. **性能影响**: 是否影响页面加载速度
4. **兼容性**: 是否在目标浏览器正常工作
5. **安全性**: 是否存在安全隐患

### 协作规范

#### Git 提交规范
```
类型: 简短描述 (不超过50字符)

详细描述 (如果需要)

例如：
Add: 新增服务器状态监控功能
Fix: 修复移动端菜单显示问题
Update: 更新FAQ页面内容
Docs: 完善项目文档
```

#### 分支命名规范
- `feature/功能名称`: 新功能开发
- `bugfix/问题描述`: Bug 修复
- `docs/文档类型`: 文档更新
- `hotfix/紧急修复`: 紧急问题修复

#### 沟通协作
1. **问题讨论**: 使用 GitHub Issues
2. **代码审查**: 使用 Pull Request
3. **文档更新**: 及时同步团队成员
4. **重大决策**: 更新项目记忆库文档

---

遵循这个工作流程，可以确保项目的可维护性和代码质量。有问题随时参考项目记忆库文档或联系团队成员。
