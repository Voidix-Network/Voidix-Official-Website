# Voidix网站贡献指南

## 🤝 如何贡献

我们欢迎任何形式的贡献！无论是代码、文档、设计建议还是bug报告。

### 贡献类型
- 🐛 Bug修复
- ✨ 新功能开发
- 📝 文档改进
- 🎨 UI/UX优化
- 🔧 性能优化
- 🌐 国际化翻译

### 参与方式
1. Fork项目到你的GitHub账号
2. 创建特性分支进行开发
3. 提交Pull Request
4. 等待代码审查和合并

## 🛠 开发环境准备

### 必需软件
- Node.js 16.0+
- Git 2.0+
- 代码编辑器（推荐VS Code）

### 推荐插件（VS Code）
- ESLint
- Prettier
- Vetur（Vue开发）
- GitLens

### 环境配置
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

## 📋 开发工作流程

### 1. 创建功能分支
```bash
git checkout -b feature/your-feature-name
```

### 2. 开发阶段
- 遵循编码规范
- 编写必要的测试
- 确保代码质量

### 3. 提交代码
```bash
git add .
git commit -m "feat: 添加新功能描述"
git push origin feature/your-feature-name
```

### 4. 创建Pull Request
- 在GitHub上创建PR
- 填写清晰的PR描述
- 等待代码审查

### 5. 代码审查
- 响应审查意见
- 修改代码问题
- 通过审查后合并

## 📏 编码规范

### JavaScript/TypeScript规范
- 使用ES6+语法
- 优先使用const，然后let
- 使用箭头函数
- 合理使用解构赋值
- 避免使用var

### CSS规范
- 使用BEM命名规范
- 移动端优先设计
- 使用CSS变量
- 避免!important

### HTML规范
- 语义化标签
- 无障碍访问支持
- SEO友好的结构

### Vue.js规范
- 单文件组件
- 组合式API优先
- Props类型定义
- 合理的组件拆分

## 📝 提交规范

使用Conventional Commits规范：

```
<类型>[可选的作用域]: <描述>

[可选的正文]

[可选的脚注]
```

### 提交类型
- `feat`: 新功能
- `fix`: Bug修复
- `docs`: 文档更新
- `style`: 代码格式修改
- `refactor`: 代码重构
- `test`: 测试相关
- `chore`: 构建过程或辅助工具的变动

### 示例
```
feat(player): 添加玩家统计页面

添加了玩家在线时长和成就统计功能
- 新增玩家数据API接口
- 实现统计图表组件
- 优化移动端显示效果

Closes #123
```

## 🔍 代码审查标准

### 必检项目
- [ ] 代码功能正确性
- [ ] 符合项目编码规范
- [ ] 无安全漏洞
- [ ] 性能无明显问题
- [ ] 兼容性测试通过

### 推荐检查
- [ ] 代码可读性
- [ ] 测试覆盖率
- [ ] 文档完整性
- [ ] 错误处理机制

## 🐛 问题排查指南

### 开发环境问题
1. **依赖安装失败**
   - 清除npm缓存：`npm cache clean --force`
   - 删除node_modules重新安装
   - 检查Node.js版本

2. **热重载不工作**
   - 检查文件系统监听权限
   - 重启开发服务器
   - 检查防火墙设置

3. **构建失败**
   - 检查代码语法错误
   - 确认所有依赖已安装
   - 查看构建日志详细信息

### 运行时问题
1. **页面空白**
   - 检查浏览器控制台错误
   - 确认路由配置正确
   - 检查组件导入路径

2. **API请求失败**
   - 检查网络连接
   - 确认API端点正确
   - 检查CORS配置

## 🤝 协作规范

### 沟通渠道
- GitHub Issues：bug报告和功能请求
- Pull Requests：代码审查和讨论
- Discussions：一般性讨论和问答

### 响应时间
- Bug修复：2-3个工作日
- 功能开发：1-2周
- 文档更新：1-2个工作日

### 发布周期
- 主版本：6个月
- 次版本：2-4周
- 补丁版本：随时发布

## 💡 新手建议

### 第一次贡献
1. 从简单的文档修改开始
2. 熟悉项目结构和代码风格
3. 参与Issue讨论了解项目需求
4. 阅读现有代码学习最佳实践

### 学习资源
- [Vue.js官方文档](https://vuejs.org/)
- [ES6入门教程](https://es6.ruanyifeng.com/)
- [Git使用指南](https://git-scm.com/docs)
- [前端开发规范](https://github.com/fex-team/styleguide)

### Git命令速查
```bash
# 查看状态
git status

# 添加文件
git add .

# 提交更改
git commit -m "描述信息"

# 推送到远程
git push origin main

# 拉取最新代码
git pull origin main
```

---

*感谢您的贡献！如有问题请参考[部署指南](DEPLOY.md)或[维护手册](MAINTENANCE.md)*

## 📁 项目结构详解

### 整体架构

```
Voidix-Official-Website/
├── docs/                     # 📁 文档中心
│   ├── README.md             # 文档导航首页  
│   ├── DEPLOY.md             # 部署指南
│   ├── SEO.md                # SEO优化指南
│   ├── CONTRIBUTING.md       # 贡献指南（本文档）
│   └── MAINTENANCE.md        # 维护手册
├── index.html                # 🏠 网站首页
├── status.html               # 📊 服务器状态页面
├── faq.html                  # ❓ 常见问题页面
├── bug-report.html           # 🐛 问题反馈页面
├── error.html                # ⚠️ 错误页面
├── sitemap.xml               # 🗺️ 网站地图（SEO用）
├── robots.txt                # 🤖 搜索引擎爬取规则
├── nginx-production.conf     # ⚙️ 主站服务器配置文件
├── assets/                   # 📁 静态资源文件夹
│   ├── css/                  # 🎨 样式文件
│   └── js/                   # ⚡ JavaScript文件
├── build-entries/            # 📁 Webpack构建入口
├── dist/                     # 📁 构建输出目录
└── webpack.*.js              # ⚙️ Webpack配置文件
```

### 样式架构（ITCSS方法论）

本项目采用基于ITCSS的模块化CSS架构：

```
assets/css/
├── main.css              # 主入口文件
├── base/                 # 基础样式层
│   ├── reset.css         # 样式重置
│   ├── variables.css     # CSS变量定义
│   ├── typography.css    # 字体排版
│   ├── animations.css    # 动画效果
│   └── base.css          # 基础元素样式
├── components/           # 组件样式层
│   ├── buttons.css       # 按钮组件
│   ├── text.css          # 文本组件
│   └── interactive.css   # 交互组件
├── pages/                # 页面样式层
│   └── status.css        # 状态页面样式
└── utilities/            # 工具样式层
    └── seo.css           # SEO相关样式
```

### JavaScript架构

采用原生JavaScript + 模块化设计：

```
assets/js/
├── script.js             # 通用脚本
├── index-page.js         # 首页专用脚本
├── status-page.js        # 状态页专用脚本
├── menu.js               # 菜单功能脚本
├── analytics.js          # 分析统计脚本
├── error-handler.js      # 错误处理脚本
├── page-init.js          # 页面初始化脚本
└── sharedConfig.js       # 共享配置文件
```

### 文件命名规范

#### HTML文件
- 使用小写字母和连字符
- 文件名体现页面功能
- 例：`bug-report.html`, `faq.html`

#### CSS文件
- 按功能分类命名
- 主样式：`main.css`
- 页面样式：`页面名.css`
- 组件样式：`组件名.css`

#### JavaScript文件
- 按页面或功能命名
- 页面脚本：`页面名-page.js`
- 通用脚本：`script.js`
- 功能脚本：`功能名.js`

## ⚡ Webpack CSS关键/非关键分离优化

本项目已配置Webpack进行CSS关键/非关键分离，大幅提升首屏渲染性能。

### 优化效果

| 页面 | 关键CSS | 非关键CSS | 总计 | 阻塞减少 |
|------|---------|-----------|------|----------|
| **Index** | 5.93 KB | 1.79 KB | 7.72 KB | 77% |
| **Status** | 7.35 KB | 0.49 KB | 7.84 KB | 94% |
| **FAQ** | 8.19 KB | 0.49 KB | 8.68 KB | 94% |
| **Error** | 6.95 KB | 0.49 KB | 7.44 KB | 93% |
| **Bug Report** | 9.11 KB | 0.49 KB | 9.60 KB | 95% |

### 构建命令

```bash
# 开发模式（热重载，完整CSS）
npm run dev

# 生产构建（关键/非关键分离）
npm run build

# 清理构建文件
npm run clean
```

### CSS优化加载模式

生产环境中，每个页面使用两个CSS文件：

```html
<head>
    <!-- 关键CSS：立即加载，阻塞渲染 -->
    <link rel="stylesheet" href="dist/css/index-critical.min.css">
    
    <!-- 非关键CSS：异步加载，不阻塞渲染 -->
    <link rel="preload" href="dist/css/index-deferred.min.css" as="style" 
          onload="this.onload=null;this.rel='stylesheet'">
    <noscript>
        <link rel="stylesheet" href="dist/css/index-deferred.min.css">
    </noscript>
</head>
```

### Webpack构建入口

```
build-entries/
├── index-critical.js       # 首页关键样式入口
├── index-deferred.js       # 首页非关键样式入口
├── status-critical.js      # 状态页关键样式入口
├── status-deferred.js      # 状态页非关键样式入口
├── faq-critical.js         # FAQ页关键样式入口
├── faq-deferred.js         # FAQ页非关键样式入口
├── error-critical.js       # 错误页关键样式入口
├── error-deferred.js       # 错误页非关键样式入口
├── bug-report-critical.js  # Bug报告关键样式入口
├── bug-report-deferred.js  # Bug报告非关键样式入口
└── index.js                # 开发模式完整CSS入口
```

### 开发指南

#### 修改样式时
1. 编辑 `assets/css/` 下的对应CSS文件
2. 开发阶段使用 `npm run dev`（完整CSS加载）
3. 构建前使用 `npm run build`（自动分离关键/非关键CSS）

#### 新增页面时
1. 在 `build-entries/` 创建对应的critical和deferred入口文件
2. 在 `webpack.optimized.config.js` 中添加新的entry配置
3. 在HTML中按照优化加载模式引用生成的CSS文件

#### 性能监控
- 监控关键CSS大小（建议 < 14KB）
- 检查首屏渲染时间改善情况
- 使用Lighthouse评估性能分数

### Webpack配置文件

- `webpack.optimized.config.js` - 主要优化配置（推荐）
- `webpack.pages.config.js` - 所有页面CSS构建
- `webpack.index.config.js` - 专门用于首页CSS构建
- `webpack.config.js` - 原始配置文件

## 📖 开发最佳实践

### 新增页面开发流程
1. 在根目录创建HTML文件
2. 如需专用样式，在 `assets/css/pages/` 创建对应CSS文件
3. 如需专用脚本，在 `assets/js/` 创建对应JS文件
4. 创建Webpack构建入口文件（critical和deferred）
5. 更新 `sitemap.xml` 添加新页面
6. 更新导航菜单
7. 使用优化加载模式引用CSS文件

### 组件化开发
- 样式组件化：在 `assets/css/components/` 创建可复用组件样式
- 脚本模块化：使用ES6模块导入导出
- 避免全局变量污染
- 保持组件独立性和可复用性

### 性能优化原则
- 关键CSS控制在14KB以内
- 非关键CSS异步加载
- 图片使用适当格式和尺寸
- JavaScript按需加载
- 启用Gzip压缩

### 维护建议

#### 修改文件时
1. 修改前先备份或使用Git分支
2. 本地测试修改效果
3. 检查其他页面是否受影响
4. 运行构建确保无错误
5. 更新相关文档

#### 删除文件时
1. 确认没有其他文件引用
2. 从 `sitemap.xml` 移除对应条目
3. 更新导航菜单
4. 清理相关的Webpack入口配置
5. 更新项目文档
