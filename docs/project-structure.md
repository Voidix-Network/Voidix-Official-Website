# Voidix网站项目结构说明

## 写在前面

这份文档详细说明了Voidix网站的文件组织结构，帮助你快速了解每个文件的作用。

## 整体结构

```
Voidix-Official-Website/
├── docs/                     # 📁 文档中心（新整理）
│   ├── README.md             # 文档导航首页
│   ├── seo-guide.md          # SEO完整指南
│   ├── seo-tasks.md          # SEO日常任务清单
│   ├── ssl-dual-cert-setup.md # RSA+ECC双证书配置指南
│   ├── maintenance.md        # 网站维护手册
│   └── project-structure.md  # 项目结构说明（当前文件）
├── index.html                # 🏠 网站首页
├── status.html               # 📊 服务器状态页面
├── faq.html                  # ❓ 常见问题页面
├── bug-report.html           # 🐛 问题反馈页面
├── error.html                # ⚠️ 错误页面
├── sitemap.xml               # 🗺️ 网站地图（SEO用）
├── robots.txt                # 🤖 搜索引擎爬取规则
├── nginx-production.conf     # ⚙️ 主站服务器配置文件
├── nginx-cdn-proxy.conf      # 🌐 CDN反向代理配置文件
├── deploy.sh                 # 🚀 自动部署脚本
├── LICENSE.md                # 📄 开源许可证说明
├── LICENSE_CODE              # 📄 代码许可证（AGPL v3）
├── LICENSE_CONTENT           # 📄 内容许可证（CC BY-SA 4.0）
├── assets/                   # 📁 静态资源文件夹
│   ├── css/                  # 🎨 样式文件
│   │   ├── style.css         # 主要样式文件
│   │   ├── seo-enhancements.css # SEO增强样式
│   │   └── status-page.css   # 状态页面专用样式
│   └── js/                   # ⚡ JavaScript文件
│       ├── index-page.js     # 首页脚本
│       ├── script.js         # 通用脚本
│       ├── menu.js           # 菜单功能脚本
│       ├── status-page.js    # 状态页面脚本
│       └── sharedConfig.js   # 共享配置文件
```

## 核心文件详解

### 网页文件

**index.html - 网站首页**
- 作用：展示Voidix服务器的基本信息
- 包含：服务器介绍、特色功能、加入方式
- 优化：已添加SEO元标签和结构化数据

**status.html - 服务器状态页**
- 作用：实时显示服务器在线状态和玩家数量
- 特点：自动刷新数据，响应式设计
- 依赖：status-page.js和status-page.css

**faq.html - 常见问题**
- 作用：回答玩家常见疑问
- 特点：折叠式问答设计，易于浏览
- SEO：针对长尾关键词优化

**bug-report.html - 问题反馈**
- 作用：收集玩家反馈和bug报告
- 特点：简洁的表单设计
- 注意：需要后端支持处理表单提交

### 样式文件

**assets/css/style.css - 主样式**
- 作用：定义网站的整体视觉风格
- 特点：响应式设计，支持深色模式
- 包含：布局、颜色、字体、动画等

**assets/css/seo-enhancements.css - SEO增强样式**
- 作用：专门为SEO优化的样式
- 特点：改善可读性，提升用户体验
- 用途：面包屑导航、结构化数据显示等

**assets/css/status-page.css - 状态页样式**
- 作用：状态页面的专用样式
- 特点：突出服务器状态，易于识别
- 包含：状态指示器、进度条、数据表格样式

### 脚本文件

**assets/js/script.js - 通用脚本**
- 作用：所有页面共用的JavaScript功能
- 包含：主题切换、基础交互、工具函数

**assets/js/index-page.js - 首页脚本**
- 作用：首页特有的功能
- 包含：动态内容加载、特效动画

**assets/js/status-page.js - 状态页脚本**
- 作用：获取和显示服务器状态
- 功能：API调用、数据刷新、状态更新

**assets/js/menu.js - 菜单脚本**
- 作用：导航菜单的交互功能
- 特点：响应式菜单，移动端适配

**assets/js/sharedConfig.js - 共享配置**
- 作用：存储全站公用的配置信息
- 包含：服务器信息、API地址、常量定义

### 配置文件

**sitemap.xml - 网站地图**
- 作用：告诉搜索引擎网站的页面结构
- 内容：所有公开页面的URL和更新时间
- 更新：每次新增页面后都要更新

**robots.txt - 爬虫规则**
- 作用：指导搜索引擎如何抓取网站
- 内容：允许抓取的页面和禁止抓取的目录
- 重要：影响SEO效果

**nginx-production.conf - 主站服务器配置**
- 作用：生产环境的主站nginx配置
- 包含：HTTPS重定向、缓存策略、安全设置
- 注意：修改需要重载nginx服务

**nginx-cdn-proxy.conf - CDN反向代理配置**
- 作用：全方位CDN反向代理系统配置
- 支持：UNPKG、jsDelivr、CDNJS、Tailwind CSS、Google Fonts
- 特性：智能缓存、防盗链、CSP安全、Gzip压缩
- 域名：cdn.voidix.net

## 文档系统

### docs/ 目录说明
这是新整理的文档中心，把所有相关文档集中管理：

- **README.md** - 文档导航，新手必读
- **seo-guide.md** - 全面的SEO优化指南
- **seo-tasks.md** - SEO日常工作清单
- **ssl-dual-cert-setup.md** - RSA+ECC双证书配置指南
- **maintenance.md** - 网站维护操作手册
- **project-structure.md** - 项目结构说明（本文档）

### 旧文档处理
以下文档将逐步迁移到docs/目录：
- `MAINTENANCE-GUIDE.md` → 已整合到 `docs/maintenance.md`
- `SEO-ENHANCEMENT-STRATEGY.md` → 已整合到 `docs/seo-guide.md`
- `SEO-QUICK-WINS.md` → 已整合到 `docs/seo-tasks.md`
- `全搜索引擎SEO优化指南.md` → 已整合到 `docs/seo-guide.md`

## 特殊目录

### memory-bank/ 目录
这个目录是AI助手的"记忆库"，存储项目的上下文信息：
- 普通用户可以忽略这个目录
- 对AI助手来说很重要，记录了项目的历史和决策
- 包含开发过程中的重要信息和经验总结

### .github/ 目录
GitHub相关的配置文件：
- `workflows/` - GitHub Actions自动化流程
- `deploy_on_pr_comment.yml` - 自动部署工作流

## 文件命名规范

### HTML文件
- 使用小写字母和连字符
- 文件名要能体现页面功能
- 例：`bug-report.html`, `faq.html`

### CSS文件
- 按功能分类命名
- 主样式：`style.css`
- 专用样式：`页面名-page.css`
- 功能样式：`功能名-enhancements.css`

### JavaScript文件
- 按页面或功能命名
- 页面脚本：`页面名-page.js`
- 通用脚本：`script.js`
- 功能脚本：`功能名.js`

## 维护建议

### 新增页面时
1. 在根目录创建HTML文件
2. 如需专用样式，在`assets/css/`创建对应CSS文件
3. 如需专用脚本，在`assets/js/`创建对应JS文件
4. 更新`sitemap.xml`
5. 更新导航菜单
6. 更新本文档的结构说明

### 修改文件时
1. 修改前先备份
2. 测试修改效果
3. 检查其他页面是否受影响
4. 更新相关文档

### 删除文件时
1. 确认没有其他文件引用
2. 从`sitemap.xml`移除
3. 更新导航菜单
4. 更新本文档

---

这个项目结构设计简洁明了，易于维护。如果你是新接手的维护者，建议先从[文档中心](README.md)开始了解，然后阅读[维护手册](maintenance.md)学习具体操作。