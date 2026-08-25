#!/bin/sh
set -e

echo "================================================"
echo "  LinkBus - Production Container Starting Up... "
echo "================================================"

# Configure Nginx to listen on Render's dynamic PORT environment variable (default 8080/10000)
PORT_TO_USE="${PORT:-8080}"
echo "Configuring Nginx to listen on port: ${PORT_TO_USE}"
sed -i "s/listen [0-9]\+;/listen ${PORT_TO_USE};/g" /etc/nginx/nginx.conf

cd /var/www/backend

# Ensure APP_KEY exists
if [ -z "$APP_KEY" ]; then
    echo "APP_KEY is missing. Generating application key..."
    export APP_KEY=$(php artisan key:generate --show)
fi

# Ensure storage link exists
php artisan storage:link || true

# Run database migrations & seeders with automated fallback
echo "[1/4] Running database migrations..."
if ! php artisan migrate --force --no-interaction; then
    echo "⚠️  Primary database connection failed or host unreachable."
    echo "🔄 Switching automatically to embedded SQLite database fallback..."
    export DB_CONNECTION=sqlite
    export DB_DATABASE=/var/www/backend/database/database.sqlite
    mkdir -p /var/www/backend/database
    touch /var/www/backend/database/database.sqlite
    chown -R www-data:www-data /var/www/backend/database
    chmod -R 775 /var/www/backend/database
    
    php artisan migrate --force --no-interaction
    php artisan db:seed --force --no-interaction || true
else
    echo "[2/4] Seeding initial data (if fresh)..."
    php artisan db:seed --force --no-interaction || true
fi

# Run Laravel production optimizations
echo "[3/4] Caching configuration & routes..."
php artisan config:cache
php artisan route:cache
php artisan view:cache

echo "[4/4] Optimizing autoloader..."
php artisan optimize:clear || true
php artisan config:cache
php artisan route:cache

echo "================================================"
echo "  LinkBus is LIVE! Starting web services on port ${PORT_TO_USE}... "
echo "================================================"

# Start Supervisor (manages Nginx + PHP-FPM + Queue Worker)
exec /usr/bin/supervisord -c /etc/supervisor/conf.d/supervisord.conf
