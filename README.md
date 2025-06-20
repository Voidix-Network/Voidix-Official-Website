# Voidix Official Website

![Voidix Logo](./assets/images/favicon-32x32.png)

Voidix是一个由开发者NekoEpisode和CYsonHab创建的公益小游戏Minecraft服务器，继承VBPIXEL和EternalStar的精神。我们致力于为所有玩家提供公平与和谐的游戏环境，完全无商业化运营。

## 🎮 服务器特色

### 小游戏服务器
- **起床战争**: 经典的团队竞技模式
- **多种小游戏**: 丰富的游戏模式选择
- **公平竞技**: 无任何付费优势，纯技术竞争

### 生存服务器
- **纯净体验**: 原汁原味的Minecraft生存模式
- **无花哨特效**: 专注于核心游戏体验
- **社区友好**: 和谐的玩家社区环境

### 技术优势
- **跨版本兼容**: 支持Java版1.7.2到最新版本
- **基岩版支持**: 通过GeyserMC技术实现跨平台游戏
- **实时监控**: 提供服务器状态和玩家数量统计
- **高性能**: 稳定的服务器性能保障

## 🚀 快速开始

### 加入服务器

**Java版玩家:**
```
小游戏服务器: minigame.voidix.net
生存服务器: survival.voidix.net
端口: 默认25565
版本支持: 1.7.2 - 最新版本
```

**基岩版玩家:**
```
小游戏服务器: minigame.voidix.net
生存服务器: survival.voidix.net
端口: 10205
通过GeyserMC技术支持
```

### 网站本地运行

1. **克隆项目**
   ```bash
   git clone https://github.com/your-username/Voidix-Official-Website.git
   cd Voidix-Official-Website
   ```

2. **启动本地服务器**
   ```powershell
   # 方法1：使用 Python 内置服务器
   python -m http.server 8000
   
   # 方法2：使用 Node.js live-server (需要全局安装)
   npx live-server --port=8000
   
   # 方法3：使用 PHP 内置服务器
   php -S localhost:8000
   ```

3. **访问网站**   打开浏览器访问 `http://localhost:8000`

> **注意**: 生产环境部署请使用 `npm run deploy` 或查看 [docs/DEPLOY.md](docs/DEPLOY.md) 获取详细部署指南

## 🛠️ 技术栈

### 前端技术
- **HTML5**: 现代化的页面结构
- **模块化CSS**: 基于ITCSS方法论的自定义CSS架构
- **TailwindCSS**: 通过CDN补充的实用工具类
- **原生JavaScript**: 高性能的交互逻辑和模块化组件

### 基础设施
- **CDN**: 自建cdn.voidix.net内容分发网络
- **Nginx**: 反向代理和Web服务器
- **HTTPS**: 全站SSL/TLS加密
- **SEO优化**: 搜索引擎友好的页面结构

> ⚠️ **CDN使用限制**: 我们的CDN启用了防盗链保护，仅允许localhost和*.voidix.net域名访问。其他域名调用CDN资源会被返回403错误。

### 项目结构
```
Voidix-Official-Website/
├── assets/                 # 静态资源
│   ├── css/               # 样式文件
│   │   ├── main.css       # 主入口样式文件
│   │   ├── base/          # 基础样式层
│   │   ├── components/    # 组件样式层
│   │   ├── pages/         # 页面样式层
│   │   └── utilities/     # 工具样式层
│   ├── js/                # JavaScript文件
│   │   ├── script.js      # 通用脚本
│   │   ├── index-page.js  # 首页脚本
│   │   ├── status-page.js # 状态页面脚本
│   │   ├── menu.js        # 菜单交互
│   │   └── sharedConfig.js # 全局配置
│   └── images/            # 图片和图标文件
├── docs/                  # 项目文档
│   ├── README.md          # 文档导航中心
│   ├── COMPLETE_GUIDE.md  # 完整指南(部署+SEO+贡献+维护)
│   ├── maintenance.md     # 详细维护手册
│   ├── project-structure.md # 项目结构说明
│   ├── cdn-proxy-setup.md # CDN配置指南
│   ├── ssl-dual-cert-setup.md # SSL证书配置
│   └── WEBPACK_CSS_GUIDE.md # Webpack CSS优化
├── scripts/
│   └── deploy-unified.js  # 统一部署脚本
├── *.html                 # 页面文件
├── nginx-*.conf           # Nginx配置文件
└── robots.txt             # 搜索引擎爬取规则
```

## 📖 页面说明

- **index.html**: 首页，展示服务器基本信息
- **status.html**: 服务器状态监控页面
- **faq.html**: 常见问题解答
- **bug-report.html**: 问题反馈页面
- **error.html**: 错误页面

## 🤝 贡献指南

我们欢迎社区贡献！请遵循以下步骤：

### 提交问题
1. 在[Issues](https://github.com/your-username/Voidix-Official-Website/issues)中搜索是否已有相关问题
2. 如果没有，请创建新的Issue并详细描述问题
3. 使用适当的标签标记问题类型

### 提交代码
1. **Fork项目**到你的GitHub账户
2. **创建分支**用于你的修改
   ```bash
   git checkout -b feature/your-feature-name
   ```
3. **提交修改**并写明变更内容
   ```bash
   git commit -m "Add: 描述你的修改内容"
   ```
4. **推送分支**到你的Fork仓库
   ```bash
   git push origin feature/your-feature-name
   ```
5. **创建Pull Request**并详细描述你的修改

### 代码规范
- 使用一致的代码风格
- 添加必要的注释
- 确保代码通过基本测试
- 遵循现有的项目结构

## 📋 开发路线图

### 已完成 ✅
- [x] 基础网站架构
- [x] 服务器状态监控
- [x] 响应式设计
- [x] SEO优化基础
- [x] 静态资源组织优化

### 进行中 🔄
- [ ] 性能优化改进
- [ ] 移动端体验优化
- [ ] 错误处理机制完善

### 计划中 📅
- [ ] 构建系统集成
- [ ] 测试框架引入
- [ ] 安全性加强
- [ ] 本地资源备份
- [ ] TypeScript迁移

## 🔧 维护

### 本地开发环境要求
- 任意Web服务器 (Python、PHP、Node.js等)
- 现代浏览器 (Chrome 80+, Firefox 75+, Safari 13+)

### 部署要求
- Nginx 1.18+
- SSL证书
- 域名解析配置

## 📞 联系我们

- **网站管理员**: ASKLL
- **官方网站**: https://www.voidix.net
- **服务器地址**: minigame.voidix.net / survival.voidix.net
- **问题反馈**: 通过网站bug-report页面提交

## 📄 许可证

- **代码许可**: 请查看 [LICENSE_CODE](./LICENSE_CODE) 文件
- **内容许可**: 请查看 [LICENSE_CONTENT](./LICENSE_CONTENT) 文件  
- **项目许可**: 请查看 [LICENSE.md](./LICENSE.md) 文件

## 🙏 致谢

感谢所有为Voidix项目做出贡献的开发者和玩家们！

特别感谢:
- VBPIXEL和EternalStar项目的精神传承
- 社区玩家的持续支持和反馈
- 所有贡献代码和建议的开发者

---

**Voidix - 公平至上，乐趣第一！**

> 这是一个完全公益的项目，无任何商业化运营。我们的目标是为所有玩家提供最纯粹的Minecraft游戏体验。