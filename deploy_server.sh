#!/bin/bash
# ====================================================================
# LinkBus - Automated Linux / Ubuntu Production Deployment Script
# ====================================================================
# Usage:
#   chmod +x deploy_server.sh
#   sudo ./deploy_server.sh
# ====================================================================

set -e

echo "=========================================================="
echo "      LINKBUS AUTOMATED PRODUCTION SERVER INSTALLER       "
echo "=========================================================="
echo ""

# 1. Update Package Repositories
echo "[1/8] Updating package lists..."
sudo apt update && sudo apt upgrade -y

# 2. Install Required Packages (Nginx, PHP 8.2, Extensions, MySQL, Git, Node.js)
echo "[2/8] Installing Nginx, PHP 8.2, MySQL, and dependencies..."
sudo apt install -y software-properties-common curl git unzip certbot python3-certbot-nginx
sudo add-apt-repository -y ppa:ondrej/php
sudo apt update
sudo apt install -y nginx mysql-server \
    php8.2-fpm php8.2-mysql php8.2-mbstring php8.2-xml php8.2-bcmath \
    php8.2-curl php8.2-zip php8.2-gd php8.2-intl php8.2-cli

# Install Composer
if ! command -v composer &> /dev/null; then
    echo "Installing Composer..."
    curl -sS https://getcomposer.org/installer | php
    sudo mv composer.phar /usr/local/bin/composer
fi

# Install Node.js 20.x
if ! command -v node &> /dev/null; then
    echo "Installing Node.js 20.x..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt install -y nodejs
fi

# 3. Setup Project Directory
PROJECT_DIR="/var/www/linkbus"
echo "[3/8] Setting up project directory at $PROJECT_DIR..."
sudo mkdir -p $PROJECT_DIR
sudo chown -R $USER:$USER $PROJECT_DIR

# 4. Build Frontend & Copy Static Assets
echo "[4/8] Building frontend assets..."
cd $PROJECT_DIR
if [ -f "package.json" ]; then
    npm install
    npm run build
    mkdir -p backend/public/assets
    cp -r dist/* backend/public/
fi

# 5. Install Backend Dependencies
echo "[5/8] Installing PHP Composer dependencies..."
cd $PROJECT_DIR/backend
composer install --no-dev --optimize-autoloader

# Setup Production .env if missing
if [ ! -f ".env" ]; then
    cp .env.production.example .env
    php artisan key:generate
    echo "⚠️ Please edit $PROJECT_DIR/backend/.env with your production database credentials."
fi

# Optimize Laravel Caches
php artisan storage:link || true
php artisan config:cache
php artisan route:cache
php artisan view:cache

# 6. Set Linux File Permissions
echo "[6/8] Configuring secure file permissions for www-data..."
sudo chown -R www-data:www-data $PROJECT_DIR/backend/storage $PROJECT_DIR/backend/bootstrap/cache
sudo chmod -R 775 $PROJECT_DIR/backend/storage $PROJECT_DIR/backend/bootstrap/cache

# 7. Configure Nginx Web Server
echo "[7/8] Configuring Nginx..."
if [ -f "$PROJECT_DIR/nginx-linkbus.conf" ]; then
    sudo cp $PROJECT_DIR/nginx-linkbus.conf /etc/nginx/sites-available/linkbus.conf
    sudo ln -sf /etc/nginx/sites-available/linkbus.conf /etc/nginx/sites-enabled/
    sudo rm -f /etc/nginx/sites-enabled/default
    sudo nginx -t
    sudo systemctl reload nginx
fi

# 8. Configure Background Queue Worker & Cron
echo "[8/8] Enabling background services & scheduler..."
if [ -f "$PROJECT_DIR/linkbus-queue.service" ]; then
    sudo cp $PROJECT_DIR/linkbus-queue.service /etc/systemd/system/
    sudo systemctl daemon-reload
    sudo systemctl enable linkbus-queue
    sudo systemctl restart linkbus-queue
fi

# Add Laravel Schedule to Crontab
(crontab -l 2>/dev/null | grep -v 'schedule:run'; echo "* * * * * cd $PROJECT_DIR/backend && php artisan schedule:run >> /dev/null 2>&1") | crontab -

echo ""
echo "=========================================================="
echo "   [SUCCESS] LinkBus Successfully Deployed on Ubuntu!     "
echo "=========================================================="
echo " Next Steps:"
echo " 1. Configure MySQL: sudo mysql -e \"CREATE DATABASE linkbus_prod; CREATE USER 'linkbus_user'@'localhost' IDENTIFIED BY 'password'; GRANT ALL ON linkbus_prod.* TO 'linkbus_user'@'localhost'; FLUSH PRIVILEGES;\""
echo " 2. Run Database Migrations: cd $PROJECT_DIR/backend && php artisan migrate --force"
echo " 3. Attach Free SSL: sudo certbot --nginx -d yourdomain.com"
echo "=========================================================="
