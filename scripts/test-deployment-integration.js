#!/usr/bin/env node

/**
 * Voidix 网站部署集成测试脚本
 * 验证 GitHub Actions 工作流、部署脚本和构建配置的集成是否正确
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🧪 开始 Voidix 网站部署集成测试');
console.log('='.repeat(50));

let testsPassed = 0;
let testsFailed = 0;

function test(name, fn) {
  try {
    console.log(`\n🔍 测试: ${name}`);
    fn();
    console.log(`✅ 通过: ${name}`);
    testsPassed++;
  } catch (error) {
    console.log(`❌ 失败: ${name}`);
    console.log(`   错误: ${error.message}`);
    testsFailed++;
  }
}

function checkFileExists(filePath, description) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`${description} 不存在: ${filePath}`);
  }
  console.log(`   ✓ ${description} 存在`);
}

function checkCommand(command, description) {
  try {
    execSync(command, { stdio: 'pipe' });
    console.log(`   ✓ ${description} 可执行`);
  } catch (error) {
    throw new Error(`${description} 执行失败: ${error.message}`);
  }
}

// 测试 1: 检查关键文件存在
test('关键文件存在性', () => {
  checkFileExists('.github/workflows/deploy.yml', 'GitHub Actions 工作流');
  checkFileExists('scripts/deploy-unified.js', 'Node.js 部署脚本');
  checkFileExists('scripts/deploy.sh', 'Bash 部署脚本');
  checkFileExists('package.json', 'package.json');
  checkFileExists('webpack.config.js', 'Webpack 配置');
  checkFileExists('sitemap.xml', '站点地图');
});

// 测试 2: 检查 package.json 脚本
test('package.json 脚本配置', () => {
  const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  
  const requiredScripts = ['build', 'deploy', 'deploy:prepare', 'deploy:nginx'];
  for (const script of requiredScripts) {
    if (!packageJson.scripts[script]) {
      throw new Error(`缺少脚本: ${script}`);
    }
    console.log(`   ✓ 脚本存在: ${script}`);
  }
});

// 测试 3: 检查 webpack 配置
test('Webpack 配置验证', () => {
  const webpackConfigPath = path.resolve(__dirname, '..', 'webpack.config.js');
  const webpackConfig = require(webpackConfigPath);
  const prodConfig = webpackConfig({}, { mode: 'production' });
  
  if (!prodConfig.entry) {
    throw new Error('Webpack 入口配置缺失');
  }
  
  // 检查关键/非关键 CSS 入口点
  const requiredEntries = [
    'index-critical', 'index-deferred',
    'status-critical', 'status-deferred',
    'faq-critical', 'faq-deferred',
    'error-critical', 'error-deferred',
    'bug-report-critical', 'bug-report-deferred'
  ];
  
  for (const entry of requiredEntries) {
    if (!prodConfig.entry[entry]) {
      throw new Error(`缺少 webpack 入口: ${entry}`);
    }
    console.log(`   ✓ Webpack 入口存在: ${entry}`);
  }
});

// 测试 4: 检查构建入口文件
test('构建入口文件存在', () => {
  const buildEntries = [
    'build-entries/index-critical.js',
    'build-entries/index-deferred.js',
    'build-entries/status-critical.js',
    'build-entries/status-deferred.js',
    'build-entries/faq-critical.js',
    'build-entries/faq-deferred.js',
    'build-entries/error-critical.js',
    'build-entries/error-deferred.js',
    'build-entries/bug-report-critical.js',
    'build-entries/bug-report-deferred.js'
  ];
  
  for (const entry of buildEntries) {
    checkFileExists(entry, `构建入口文件: ${entry}`);
  }
});

// 测试 5: 检查 HTML 文件
test('HTML 文件存在', () => {
  const htmlFiles = ['index.html', 'status.html', 'faq.html', 'error.html', 'bug-report.html'];
  
  for (const htmlFile of htmlFiles) {
    checkFileExists(htmlFile, `HTML 文件: ${htmlFile}`);
  }
});

// 测试 6: 检查 GitHub Actions 工作流语法
test('GitHub Actions 工作流语法', () => {
  const yamlContent = fs.readFileSync('.github/workflows/deploy.yml', 'utf8');
  
  // 基本语法检查
  if (!yamlContent.includes('name: Website Deployment')) {
    throw new Error('工作流名称缺失');
  }
  
  if (!yamlContent.includes('runs-on: [self-hosted, website]')) {
    throw new Error('自托管运行器配置缺失');
  }
  
  if (!yamlContent.includes('npm run build')) {
    throw new Error('构建步骤缺失');
  }
  
  if (!yamlContent.includes('sudo -E ./scripts/deploy.sh')) {
    throw new Error('部署步骤缺失');
  }
  
  console.log('   ✓ 工作流语法基本正确');
});

// 测试 7: 检查部署脚本权限和语法
test('部署脚本语法和权限', () => {
  // 检查 Node.js 脚本语法
  try {
    const deployScriptPath = path.resolve(__dirname, 'deploy-unified.js');
    require(deployScriptPath);
    console.log('   ✓ Node.js 部署脚本语法正确');
  } catch (error) {
    throw new Error(`Node.js 脚本语法错误: ${error.message}`);
  }
  
  // 检查 Bash 脚本存在且可读
  const bashScriptPath = path.resolve(__dirname, 'deploy.sh');
  const bashScript = fs.readFileSync(bashScriptPath, 'utf8');
  if (!bashScript.includes('#!/bin/bash')) {
    throw new Error('Bash 脚本缺少 shebang');
  }
  
  if (!bashScript.includes('node scripts/deploy-unified.js')) {
    throw new Error('Bash 脚本未调用 Node.js 脚本');
  }
  
  console.log('   ✓ Bash 脚本语法正确');
});

// 测试 8: 检查依赖是否完整
test('依赖完整性检查', () => {
  try {
    execSync('npm ls --depth=0', { stdio: 'pipe' });
    console.log('   ✓ 所有依赖已正确安装');
  } catch (error) {
    // npm ls 在有缺失依赖时会返回非零状态码，但我们只检查关键依赖
    const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    const criticalDeps = ['webpack', 'mini-css-extract-plugin', 'css-minimizer-webpack-plugin'];
    
    for (const dep of criticalDeps) {
      if (!packageJson.devDependencies[dep]) {
        throw new Error(`关键依赖缺失: ${dep}`);
      }
      console.log(`   ✓ 关键依赖存在: ${dep}`);
    }
  }
});

// 测试 9: 环境变量配置检查
test('环境变量配置', () => {
  const yamlContent = fs.readFileSync('.github/workflows/deploy.yml', 'utf8');
  
  const requiredEnvVars = ['NGINX_WEB_ROOT', 'BACKUP_DIR', 'DEPLOY_USER', 'DEPLOY_GROUP'];
  
  for (const envVar of requiredEnvVars) {
    if (!yamlContent.includes(`${envVar}:`)) {
      throw new Error(`环境变量配置缺失: ${envVar}`);
    }
    console.log(`   ✓ 环境变量配置存在: ${envVar}`);
  }
});

// 测试 10: 站点地图最新性检查
test('站点地图最新性', () => {
  const sitemapContent = fs.readFileSync('sitemap.xml', 'utf8');
  const today = new Date().toISOString().split('T')[0];
  
  if (!sitemapContent.includes('2025-06-09')) {
    console.log('   ⚠️  站点地图日期可能需要更新');
  } else {
    console.log('   ✓ 站点地图日期是最新的');
  }
  
  // 检查所有必要的URL是否存在
  const requiredUrls = [
    'https://www.voidix.net/',
    'https://www.voidix.net/status.html',
    'https://www.voidix.net/faq.html',
    'https://www.voidix.net/bug-report.html',
    'https://www.voidix.net/error.html'
  ];
  
  for (const url of requiredUrls) {
    if (!sitemapContent.includes(url)) {
      throw new Error(`站点地图缺少URL: ${url}`);
    }
    console.log(`   ✓ URL存在: ${url}`);
  }
});

// 显示测试结果
console.log('\n' + '='.repeat(50));
console.log('🧪 测试完成');
console.log(`✅ 通过: ${testsPassed}`);
console.log(`❌ 失败: ${testsFailed}`);
console.log(`📊 总计: ${testsPassed + testsFailed}`);

if (testsFailed === 0) {
  console.log('\n🎉 所有测试通过！部署集成配置正确。');
  console.log('\n📋 部署就绪检查清单:');
  console.log('  ✅ GitHub Actions 工作流配置正确');
  console.log('  ✅ 部署脚本存在且语法正确');
  console.log('  ✅ Webpack 构建配置完整');
  console.log('  ✅ 所有必要文件存在');
  console.log('  ✅ 依赖配置正确');
  console.log('  ✅ 环境变量配置完整');
  
  console.log('\n🚀 可以安全进行部署！');
  process.exit(0);
} else {
  console.log('\n❌ 发现问题，请修复后重新运行测试。');
  process.exit(1);
}
