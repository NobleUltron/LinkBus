#!/bin/sh
set -e

echo "================================================"
echo "  LinkBus - Production Container Starting Up... "
echo "================================================"

cd /var/www/backend

# Run Laravel production optimizations
echo "[1/4] Caching configuration..."
php artisan config:cache

echo "[2/4] Caching routes..."
php artisan route:cache

echo "[3/4] Caching views..."
php artisan view:cache

# Run database migrations
echo "[4/4] Running database migrations..."
php artisan migrate --force --no-interaction

echo "================================================"
echo "  LinkBus is LIVE! Starting web services...     "
echo "================================================"

# Start Supervisor (manages Nginx + PHP-FPM + Queue Worker)
exec /usr/bin/supervisord -c /etc/supervisor/conf.d/supervisord.conf
