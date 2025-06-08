#!/usr/bin/env node

/**
 * Voidix 网站统一部署脚本
 * 功能: 
 * - webpack 构建
 * - HTML 引用替换
 * - 静态资源处理
 * - 跨平台 nginx 部署
 * - 备份管理
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const os = require('os');

// 统一配置
const CONFIG = {
  sourceDir: process.cwd(),
  distDir: 'dist',
  htmlFiles: ['index.html', 'status.html', 'faq.html', 'error.html', 'bug-report.html'],
  cssMapping: {
    'index.html': 'index',
    'status.html': 'status', 
    'faq.html': 'faq',
    'error.html': 'error',
    'bug-report.html': 'bug-report'
  },
  // Nginx 配置
  nginx: {
    webRoot: process.env.NGINX_WEB_ROOT || (os.platform() === 'win32' 
      ? 'C:\\nginx\\html\\voidix.net' 
      : '/var/www/voidix.net'),
    backupDir: process.env.BACKUP_DIR || (os.platform() === 'win32'
      ? 'C:\\backups\\voidix-website'
      : '/var/backups/voidix-website'),
    service: os.platform() === 'win32' ? 'nginx' : 'nginx',
    user: process.env.DEPLOY_USER || (os.platform() === 'win32' ? null : 'www-data'),
    group: process.env.DEPLOY_GROUP || (os.platform() === 'win32' ? null : 'www-data')
  },
  enableBackup: true,
  platform: os.platform()
};

// 统一日志系统
const log = {
  info: (msg) => console.log(`✅ [INFO] ${new Date().toISOString().slice(11, 19)} ${msg}`),
  warn: (msg) => console.log(`⚠️  [WARN] ${new Date().toISOString().slice(11, 19)} ${msg}`),
  error: (msg) => console.log(`❌ [ERROR] ${new Date().toISOString().slice(11, 19)} ${msg}`),
  success: (msg) => console.log(`🎉 [SUCCESS] ${new Date().toISOString().slice(11, 19)} ${msg}`),
  step: (msg) => console.log(`🔄 [STEP] ${msg}`),
  title: (msg) => console.log(`\n${'='.repeat(50)}\n🚀 ${msg}\n${'='.repeat(50)}`)
};

/**
 * 通用工具函数
 */
const utils = {
  /**
   * 确保目录存在
   */
  ensureDir(dirPath) {
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
  },

  /**
   * 递归复制文件或目录
   */
  copyRecursive(src, dest) {
    const stat = fs.statSync(src);
    
    if (stat.isDirectory()) {
      this.ensureDir(dest);
      const items = fs.readdirSync(src);
      for (const item of items) {
        this.copyRecursive(path.join(src, item), path.join(dest, item));
      }
    } else {
      this.ensureDir(path.dirname(dest));
      fs.copyFileSync(src, dest);
    }
  },

  /**
   * 删除目录
   */
  removeDir(dirPath) {
    if (fs.existsSync(dirPath)) {
      fs.rmSync(dirPath, { recursive: true, force: true });
    }
  },

  /**
   * 执行命令（跨平台）
   */
  exec(command, options = {}) {
    try {
      const result = execSync(command, { 
        stdio: options.silent ? 'pipe' : 'inherit',
        encoding: 'utf8',
        ...options 
      });
      return result;
    } catch (error) {
      throw new Error(`命令执行失败: ${command}\n错误: ${error.message}`);
    }
  },

  /**
   * 检查权限（跨平台）
   */
  checkPermissions() {
    if (CONFIG.platform === 'win32') {
      // Windows: 检查是否以管理员身份运行
      try {
        this.exec('net session', { silent: true });
        log.info('检测到管理员权限');
        return true;
      } catch {
        log.warn('建议以管理员身份运行以获得完整权限');
        return true; // Windows 可以继续，但可能有权限限制
      }
    } else {
      // Linux/macOS: 检查 root 或 sudo 权限
      try {
        const uid = process.getuid();
        if (uid === 0) {
          log.info('检测到 root 权限');
          return true;
        }
        
        this.exec('sudo -n true', { silent: true });
        log.info('检测到 sudo 权限');
        return true;
      } catch {
        log.error('需要 root 或 sudo 权限来部署到 nginx');
        log.error('请使用: sudo node scripts/deploy-unified.js deploy');
        return false;
      }
    }
  }
};

/**
 * 构建模块
 */
const builder = {
  /**
   * 运行 webpack 构建
   */
  build() {
    log.step('开始 webpack 构建...');
    try {
      utils.exec('npm run build');
      log.success('Webpack 构建完成');
    } catch (error) {
      log.error(`构建失败: ${error.message}`);
      throw error;
    }
  },

  /**
   * 处理 HTML 文件引用替换
   */
  processHtmlFiles() {
    log.step('处理 HTML 文件引用替换...');
    
    for (const htmlFile of CONFIG.htmlFiles) {
      const srcPath = path.join(CONFIG.sourceDir, htmlFile);
      const destPath = path.join(CONFIG.distDir, htmlFile);
      
      if (!fs.existsSync(srcPath)) {
        log.warn(`源文件不存在，跳过: ${htmlFile}`);
        continue;
      }

      try {
        let content = fs.readFileSync(srcPath, 'utf8');
        const cssName = CONFIG.cssMapping[htmlFile];        if (cssName) {
          // 替换 CSS 引用为生产环境的分离式 CSS
          // 匹配完整的 link 标签，包括跨行的情况
          content = content.replace(
            /<link[^>]*href=["']assets\/css\/main\.css["'][^>]*>/gis,
            `<!-- Critical CSS -->\n    <link rel="stylesheet" href="css/${cssName}-critical.min.css">\n    <!-- Deferred CSS -->\n    <link rel="preload" href="css/${cssName}-deferred.min.css" as="style" onload="this.onload=null;this.rel='stylesheet'">\n    <noscript><link rel="stylesheet" href="css/${cssName}-deferred.min.css"></noscript>`
          );
          
          // 添加 CSS 加载 polyfill
          if (!content.includes('loadCSS')) {
            content = content.replace(
              '</head>',
              `    <script>
      /*! loadCSS rel=preload polyfill. */
      !function(e){"use strict";var t=function(t,n,r,o){var i,d=e.document,a=d.createElement("link");if(n)i=n;else{var f=(d.body||d.getElementsByTagName("head")[0]).childNodes;i=f[f.length-1]}var l=d.styleSheets;if(o)for(var s in o)o.hasOwnProperty(s)&&a.setAttribute(s,o[s]);a.rel="stylesheet",a.href=t,a.media="only x",function e(t){if(d.body)return t();setTimeout(function(){e(t)})}(function(){i.parentNode.insertBefore(a,n?i:i.nextSibling)});var h=function(e){for(var t=a.href,n=l.length;n--;)if(l[n].href===t)return e();setTimeout(function(){h(e)})};function u(){a.addEventListener&&a.removeEventListener("load",u),a.media=r||"all"}a.addEventListener&&a.addEventListener("load",u),(a.onloadcssdefined=h)(u)};t.relpreload="preload"===t.relpreload,t.relpreload||t(n,r,null,o);"undefined"!=typeof module?module.exports=t:e.loadCSS=t}("undefined"!=typeof global?global:this);
    </script>
  </head>`
            );
          }
        }
        
        fs.writeFileSync(destPath, content, 'utf8');
        log.info(`已处理: ${htmlFile}`);
        
      } catch (error) {
        log.error(`处理 ${htmlFile} 时出错: ${error.message}`);
        throw error;
      }
    }
    
    log.success('HTML 文件处理完成');
  },

  /**
   * 复制静态资源
   */  copyAssets() {
    log.step('复制静态资源...');
    
    // 复制到 dist 目录的静态资源
    const assetDirs = ['assets', 'images', 'favicon.ico', 'robots.txt', 'sitemap.xml'];
    
    for (const asset of assetDirs) {
      const srcPath = path.join(CONFIG.sourceDir, asset);
      const destPath = path.join(CONFIG.distDir, asset);
      
      if (fs.existsSync(srcPath)) {
        try {
          utils.copyRecursive(srcPath, destPath);
          log.info(`已复制: ${asset}`);
        } catch (error) {
          log.warn(`复制 ${asset} 时出错: ${error.message}`);
        }
      }
    }
    
    // 将 nginx 配置文件也复制到 dist 目录以便部署
    const configFiles = ['nginx-production.conf', 'nginx-cdn-proxy.conf'];
    for (const configFile of configFiles) {
      const srcPath = path.join(CONFIG.sourceDir, configFile);
      const destPath = path.join(CONFIG.distDir, configFile);
      
      if (fs.existsSync(srcPath)) {
        try {
          fs.copyFileSync(srcPath, destPath);
          log.info(`已复制配置文件: ${configFile}`);
        } catch (error) {
          log.warn(`复制配置文件 ${configFile} 时出错: ${error.message}`);
        }
      }
    }
    
    log.success('静态资源复制完成');
  },

  /**
   * 准备完整的 dist 目录
   */
  prepare() {
    log.title('准备部署文件');
    
    // 清理 dist 目录
    log.step('清理 dist 目录...');
    utils.removeDir(CONFIG.distDir);
    utils.ensureDir(CONFIG.distDir);
    
    // 构建
    this.build();
    
    // 处理 HTML
    this.processHtmlFiles();
    
    // 复制静态资源
    this.copyAssets();
    
    log.success('部署文件准备完成！');
    log.info(`所有文件已生成到: ${path.resolve(CONFIG.distDir)}`);
  }
};

/**
 * 部署模块
 */
const deployer = {
  /**
   * 创建备份
   */
  createBackup() {
    if (!CONFIG.enableBackup) {
      log.info('跳过备份（已禁用）');
      return;
    }
    
    log.step('创建备份...');
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = path.join(CONFIG.nginx.backupDir, `backup-${timestamp}`);
    
    try {
      // 确保备份目录存在
      utils.ensureDir(CONFIG.nginx.backupDir);
      
      // 如果网站目录存在，创建备份
      if (fs.existsSync(CONFIG.nginx.webRoot)) {
        log.info(`创建备份: ${backupPath}`);
        
        if (CONFIG.platform === 'win32') {
          utils.exec(`xcopy "${CONFIG.nginx.webRoot}" "${backupPath}" /E /I /H /Y`);
        } else {
          utils.exec(`cp -r "${CONFIG.nginx.webRoot}" "${backupPath}"`);
        }
        
        log.success('备份创建成功');
      } else {
        log.warn('网站目录不存在，跳过备份');
      }
      
      // 清理旧备份（保留最近5个）
      this.cleanOldBackups();
      
    } catch (error) {
      log.error(`备份失败: ${error.message}`);
      throw error;
    }
  },

  /**
   * 清理旧备份
   */
  cleanOldBackups() {
    try {
      if (!fs.existsSync(CONFIG.nginx.backupDir)) return;
      
      const backups = fs.readdirSync(CONFIG.nginx.backupDir)
        .filter(name => name.startsWith('backup-'))
        .sort()
        .reverse();
      
      if (backups.length > 5) {
        log.info('清理旧备份...');
        for (let i = 5; i < backups.length; i++) {
          const oldBackup = path.join(CONFIG.nginx.backupDir, backups[i]);
          utils.removeDir(oldBackup);
          log.info(`已删除旧备份: ${backups[i]}`);
        }
      }
    } catch (error) {
      log.warn(`清理旧备份时出错: ${error.message}`);
    }  },

  /**
   * 部署 nginx 配置文件到系统目录
   */
  deployNginxConfigs() {
    log.step('部署 nginx 配置文件到系统目录...');
    
    if (CONFIG.platform === 'win32') {
      log.warn('Windows 平台下的 nginx 配置部署功能有限');
      return;
    }
    
    try {
      // 确保 nginx 配置目录存在
      const nginxConfigDir = '/etc/nginx/sites-enabled';
      if (!fs.existsSync(nginxConfigDir)) {
        log.warn(`nginx 配置目录不存在: ${nginxConfigDir}`);
        return;
      }
      
      // 部署生产配置文件
      const prodConfigSource = path.join(CONFIG.distDir, 'nginx-production.conf');
      const prodConfigDest = '/etc/nginx/sites-enabled/voidix.conf';
      
      if (fs.existsSync(prodConfigSource)) {
        log.info('部署生产环境 nginx 配置...');
        
        // 备份现有配置（如果存在）
        if (fs.existsSync(prodConfigDest)) {
          const backupPath = `${prodConfigDest}.backup.${Date.now()}`;
          utils.exec(`cp "${prodConfigDest}" "${backupPath}"`);
          log.info(`已备份现有配置: ${backupPath}`);
        }
        
        // 复制新配置
        utils.exec(`cp "${prodConfigSource}" "${prodConfigDest}"`);
        log.info(`生产配置已部署到: ${prodConfigDest}`);
      } else {
        log.warn('nginx-production.conf 不存在于 dist 目录中');
      }
      
      // 部署 CDN 代理配置文件
      const cdnConfigSource = path.join(CONFIG.distDir, 'nginx-cdn-proxy.conf');
      const cdnConfigDest = '/etc/nginx/sites-enabled/cdn-proxy.conf';
      
      if (fs.existsSync(cdnConfigSource)) {
        log.info('部署 CDN 代理 nginx 配置...');
        
        // 清理旧的 CDN 相关配置文件，避免冲突
        const oldConfigs = [
          '/etc/nginx/sites-enabled/*cdn*',
          '/etc/nginx/sites-enabled/*jsdelivr*',
          '/etc/nginx/sites-enabled/nginx-jsdelivr-proxy.conf'
        ];
        
        for (const pattern of oldConfigs) {
          try {
            utils.exec(`rm -f ${pattern}`, { silent: true });
          } catch (error) {
            // 忽略删除失败的错误
          }
        }
        
        // 复制新配置
        utils.exec(`cp "${cdnConfigSource}" "${cdnConfigDest}"`);
        log.info(`CDN 代理配置已部署到: ${cdnConfigDest}`);
      } else {
        log.warn('nginx-cdn-proxy.conf 不存在于 dist 目录中');
      }
      
      // 测试 nginx 配置语法
      log.info('测试 nginx 配置语法...');
      try {
        utils.exec('nginx -t');
        log.success('nginx 配置语法测试通过');
      } catch (error) {
        log.error(`nginx 配置语法测试失败: ${error.message}`);
        throw error;
      }
      
      log.success('nginx 配置文件部署完成');
      
    } catch (error) {
      log.error(`nginx 配置部署失败: ${error.message}`);
      throw error;
    }
  },

  /**
   * 部署文件到 nginx
   */
  deployFiles() {
    log.step('部署文件到 nginx...');
    
    try {
      // 确保 nginx 网站目录存在
      utils.ensureDir(path.dirname(CONFIG.nginx.webRoot));
      
      // 如果目标目录存在，先删除
      if (fs.existsSync(CONFIG.nginx.webRoot)) {
        if (CONFIG.platform === 'win32') {
          utils.exec(`rmdir /s /q "${CONFIG.nginx.webRoot}"`);
        } else {
          utils.exec(`rm -rf "${CONFIG.nginx.webRoot}"`);
        }
      }
      
      // 复制文件
      log.info(`复制文件到: ${CONFIG.nginx.webRoot}`);
      utils.copyRecursive(CONFIG.distDir, CONFIG.nginx.webRoot);
      
      // 设置权限（仅 Linux/macOS）
      if (CONFIG.platform !== 'win32' && CONFIG.nginx.user && CONFIG.nginx.group) {
        log.info('设置文件权限...');
        utils.exec(`chown -R ${CONFIG.nginx.user}:${CONFIG.nginx.group} "${CONFIG.nginx.webRoot}"`);
        utils.exec(`chmod -R 755 "${CONFIG.nginx.webRoot}"`);
      }
      
      log.success('文件部署成功');
      
    } catch (error) {
      log.error(`文件部署失败: ${error.message}`);
      throw error;
    }
  },

  /**
   * 重启 nginx 服务
   */
  restartNginx() {
    log.step('重启 nginx 服务...');
    
    try {
      if (CONFIG.platform === 'win32') {
        // Windows nginx 重启
        try {
          utils.exec('net stop nginx', { silent: true });
        } catch {
          log.info('nginx 服务未运行');
        }
        utils.exec('net start nginx');
      } else {
        // Linux/macOS nginx 重启
        utils.exec('systemctl reload nginx');
        
        // 验证 nginx 状态
        const status = utils.exec('systemctl is-active nginx', { silent: true }).trim();
        if (status !== 'active') {
          throw new Error('nginx 服务未正常运行');
        }
      }
      
      log.success('Nginx 服务重启成功');
      
    } catch (error) {
      log.error(`Nginx 重启失败: ${error.message}`);
      throw error;
    }
  },

  /**
   * 执行完整部署
   */
  deploy() {
    log.title('开始 Nginx 部署');
    
    // 检查权限
    if (!utils.checkPermissions()) {
      process.exit(1);
    }
    
    // 检查 dist 目录
    if (!fs.existsSync(CONFIG.distDir)) {
      log.error('dist 目录不存在，请先运行构建');
      log.info('运行: node scripts/deploy-unified.js prepare');
      process.exit(1);
    }
      try {
      // 创建备份
      this.createBackup();
      
      // 部署网站文件
      this.deployFiles();
      
      // 部署 nginx 配置文件
      this.deployNginxConfigs();
      
      // 重启服务
      this.restartNginx();
      
      log.success('部署完成！');
      log.info(`网站已部署到: ${CONFIG.nginx.webRoot}`);
      log.info('nginx 配置文件已同步部署');
      
    } catch (error) {
      log.error(`部署失败: ${error.message}`);
      process.exit(1);
    }
  }
};

/**
 * 命令行接口
 */
function main() {
  const command = process.argv[2] || 'help';
    switch (command) {
    case 'prepare':
      builder.prepare();
      break;
      
    case 'deploy':
      deployer.deploy();
      break;
      
    case 'config':
      log.title('仅部署 nginx 配置文件');
      if (!utils.checkPermissions()) {
        process.exit(1);
      }
      // 确保 dist 目录中有配置文件
      if (!fs.existsSync(CONFIG.distDir)) {
        log.error('dist 目录不存在，请先运行 prepare');
        process.exit(1);
      }
      deployer.deployNginxConfigs();
      deployer.restartNginx();
      break;
      
    case 'full':
      log.title('执行完整部署流程');
      builder.prepare();
      deployer.deploy();
      break;
      
    case 'backup':
      deployer.createBackup();
      break;
      
    case 'help':
    default:
      console.log(`
🚀 Voidix 网站统一部署脚本

用法: node scripts/deploy-unified.js <命令>

命令:
  prepare  - 构建项目并准备 dist 目录
  deploy   - 部署 dist 目录到 nginx（需要管理员/sudo权限）
  config   - 仅部署 nginx 配置文件（需要管理员/sudo权限）
  full     - 执行完整部署流程（prepare + deploy）
  backup   - 仅创建备份
  help     - 显示此帮助信息

环境变量:
  NGINX_WEB_ROOT  - nginx 网站根目录 (默认: ${CONFIG.nginx.webRoot})
  BACKUP_DIR      - 备份目录 (默认: ${CONFIG.nginx.backupDir})
  DEPLOY_USER     - 部署用户 (默认: ${CONFIG.nginx.user || 'N/A'})
  DEPLOY_GROUP    - 部署组 (默认: ${CONFIG.nginx.group || 'N/A'})

示例:
  node scripts/deploy-unified.js prepare
  sudo node scripts/deploy-unified.js deploy
  sudo node scripts/deploy-unified.js config
  sudo node scripts/deploy-unified.js full
      `);
      break;
  }
}

// 错误处理
process.on('uncaughtException', (error) => {
  log.error(`未捕获的异常: ${error.message}`);
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  log.error(`未处理的 Promise 拒绝: ${reason}`);
  process.exit(1);
});

// 运行主函数
if (require.main === module) {
  main();
}

module.exports = { CONFIG, utils, builder, deployer };
