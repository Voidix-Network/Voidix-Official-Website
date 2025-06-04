#!/bin/bash
# 自动部署脚本 - 用于GitHub Actions自托管运行器
# 此脚本与您的 deploy.yml 工作流配合使用

set -e  # 遇到错误立即退出

echo "🚀 开始部署 Voidix 官方网站..."

# 配置变量
WEBSITE_DIR="/www/voidix"
NGINX_CONF_SOURCE="nginx-production.conf"
NGINX_CONF_DEST="/etc/nginx/sites-enabled/voidix.conf"
BACKUP_ROOT="/var/backups/voidix"
BACKUP_DIR="$BACKUP_ROOT/$(date +%Y%m%d_%H%M%S)"

# 临时文件变量
TEMP_CONF_FILE="/tmp/nginx_temp_$$.conf"

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 清理函数
cleanup() {
    log_info "执行清理操作..."
    # 清理所有临时文件 - 优先尝试不使用sudo，失败时再使用sudo
    rm -f "$TEMP_CONF_FILE" 2>/dev/null || sudo rm -f "$TEMP_CONF_FILE" 2>/dev/null || true
    rm -f "${NGINX_CONF_DEST}.test" 2>/dev/null || sudo rm -f "${NGINX_CONF_DEST}.test" 2>/dev/null || true
    log_info "清理完成"
}

# 设置陷阱，确保脚本退出时清理临时文件
trap cleanup EXIT

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 检查是否为root用户或有sudo权限
check_permissions() {
    log_info "检查权限..."
    if [[ $EUID -ne 0 ]] && ! sudo -n true 2>/dev/null; then
        log_error "此脚本需要root权限或sudo访问权限"
        exit 1
    fi
    log_info "权限检查通过"
}

# 创建备份
create_backup() {
    log_info "创建当前部署的备份..."
    
    # 确保备份根目录存在
    sudo mkdir -p "$BACKUP_ROOT"
    
    # 创建时间戳备份目录
    sudo mkdir -p "$BACKUP_DIR"
    
    if [ -d "$WEBSITE_DIR" ]; then
        sudo cp -r "$WEBSITE_DIR" "$BACKUP_DIR/website"
        log_info "网站文件已备份到: $BACKUP_DIR/website"
    fi
    
    if [ -f "$NGINX_CONF_DEST" ]; then
        sudo cp "$NGINX_CONF_DEST" "$BACKUP_DIR/nginx.conf.bak"
        log_info "Nginx配置已备份到: $BACKUP_DIR/nginx.conf.bak"
    fi
}

# 部署网站文件
deploy_website() {
    log_info "部署网站文件到 $WEBSITE_DIR..."
    
    # 确保目标目录存在
    sudo mkdir -p "$WEBSITE_DIR"
      # 复制文件，排除不需要的文件和目录
    sudo rsync -av \
        --exclude='.git/' \
        --exclude='.github/' \
        --exclude='memory-bank/' \
        --exclude='docs/' \
        --exclude='*.conf' \
        --exclude='*.md' \
        --exclude='deploy.sh' \
        --exclude='.gitignore' \
        --exclude='.idea/' \
        ./ "$WEBSITE_DIR/"
    
    # 设置正确的权限
    sudo chown -R nginx:nginx "$WEBSITE_DIR" 2>/dev/null || sudo chown -R www-data:www-data "$WEBSITE_DIR"
    sudo find "$WEBSITE_DIR" -type d -exec chmod 755 {} \;
    sudo find "$WEBSITE_DIR" -type f -exec chmod 644 {} \;
    
    log_info "网站文件部署完成"
}

# 部署Nginx配置
deploy_nginx_config() {
    log_info "部署Nginx配置..."
      if [ ! -f "$NGINX_CONF_SOURCE" ]; then
        log_error "找不到nginx-production.conf文件"
        exit 1
    fi
    
    # 测试nginx配置语法
    log_info "测试Nginx配置语法..."
    # 方法1：复制到正确位置测试完整配置
    sudo cp "$NGINX_CONF_SOURCE" "$NGINX_CONF_DEST.test"
    sudo nginx -t
    
    if [ $? -ne 0 ]; then
        log_error "Nginx完整配置测试失败"
        sudo rm -f "$NGINX_CONF_DEST.test"
        exit 1
    fi
    
    # 清理测试文件
    rm -f "$NGINX_CONF_DEST.test" 2>/dev/null || sudo rm -f "$NGINX_CONF_DEST.test" 2>/dev/null
    
    log_info "配置文件验证完成，准备部署..."
    
    # 部署配置文件
    sudo cp "$NGINX_CONF_SOURCE" "$NGINX_CONF_DEST"
    
    log_info "Nginx配置部署完成"
}

# 测试并重载Nginx
reload_nginx() {
    log_info "测试Nginx配置并重载..."
    
    # 再次测试配置
    sudo nginx -t
    
    if [ $? -ne 0 ]; then
        log_error "Nginx配置测试失败，正在恢复备份..."
        restore_backup
        exit 1
    fi
    
    # 重载Nginx
    sudo systemctl reload nginx
    
    if [ $? -eq 0 ]; then
        log_info "Nginx已成功重载"
    else
        log_error "Nginx重载失败"
        exit 1
    fi
}

# 恢复备份（如果需要）
restore_backup() {
    if [ -d "$BACKUP_DIR" ]; then
        log_warn "正在恢复备份..."
        
        if [ -f "$BACKUP_DIR/nginx.conf.bak" ]; then
            sudo cp "$BACKUP_DIR/nginx.conf.bak" "$NGINX_CONF_DEST"
        fi
        
        sudo nginx -t && sudo systemctl reload nginx
        log_warn "备份已恢复"
    fi
}

# 验证部署
verify_deployment() {
    log_info "验证部署..."
    
    # 检查Nginx状态
    if ! sudo systemctl is-active --quiet nginx; then
        log_error "Nginx服务未运行"
        exit 1
    fi
    
    # 检查网站文件
    if [ ! -f "$WEBSITE_DIR/index.html" ]; then
        log_error "主页文件不存在"
        exit 1
    fi
    
    # 测试HTTP连接（如果curl可用）
    if command -v curl >/dev/null 2>&1; then
        local response_code=$(curl -s -o /dev/null -w "%{http_code}" -k https://localhost/ || echo "000")
        if [ "$response_code" = "200" ] || [ "$response_code" = "301" ] || [ "$response_code" = "302" ]; then
            log_info "网站HTTP测试通过 (状态码: $response_code)"
        else
            log_warn "网站HTTP测试返回状态码: $response_code"
        fi
    fi
    
    log_info "部署验证完成"
}

# 清理旧备份（保留最近5个）
cleanup_old_backups() {
    log_info "清理旧备份..."
    
    if [ -d "$BACKUP_ROOT" ]; then
        # 保留最近的5个备份
        sudo find "$BACKUP_ROOT" -maxdepth 1 -type d -name "20*" | \
            sudo sort -r | \
            sudo tail -n +6 | \
            sudo xargs -r rm -rf
        log_info "旧备份清理完成"
    fi
}

# 主执行流程
main() {
    log_info "=== Voidix 官方网站自动部署开始 ==="
      check_permissions
    create_backup
    deploy_website
    deploy_nginx_config
    reload_nginx
    verify_deployment
    cleanup_old_backups
    
    log_info "=== 🎉 部署成功完成！ ==="
    log_info "网站已部署到: $WEBSITE_DIR"
    log_info "备份位置: $BACKUP_DIR"
    log_info "访问您的网站: https://voidix.top"
}

# 如果直接运行此脚本
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi
