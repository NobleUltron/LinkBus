#!/usr/bin/env bash
set -e

echo "========================================================"
echo "  LinkBus Production Docker Launcher"
echo "========================================================"
echo ""

# 1. Build React Frontend for Production
echo "[1/4] Building React SPA Production Bundle..."
npm run build

# 2. Build and Start Docker Containers
echo "[2/4] Building & Launching Docker Services (Nginx, PHP-FPM, MySQL, Redis)..."
docker-compose up -d --build

# 3. Wait for MySQL to become ready
echo "[3/4] Waiting for MySQL container healthcheck..."
docker-compose exec -T app php artisan migrate --force
docker-compose exec -T app php artisan db:seed --force

# 4. Clear & Optimize Laravel Caches
echo "[4/4] Optimizing Laravel Caches..."
docker-compose exec -T app php artisan config:cache
docker-compose exec -T app php artisan route:cache
docker-compose exec -T app php artisan view:cache

echo ""
echo "========================================================"
echo "  LinkBus Production Services Online!"
echo "  Web UI:  http://localhost"
echo "  API:     http://localhost/api"
echo "========================================================"
