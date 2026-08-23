@echo off
TITLE LinkBus Docker Production Deployment
echo ========================================================
echo   LinkBus Production Container Launcher
echo ========================================================
echo.

:: 1. Build Frontend Bundle
echo [1/4] Building React Frontend Production Bundle...
call npm run build

if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Frontend build failed. Aborting Docker setup.
    pause
    exit /b 1
)

:: 2. Launch Containers
echo.
echo [2/4] Launching Docker Containers (Nginx, PHP-FPM, MySQL 8.0, Redis)...
docker-compose up -d --build

if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Docker Compose failed to start. Ensure Docker Desktop is running.
    pause
    exit /b 1
)

:: 3. Run Migrations & Seeders inside container
echo.
echo [3/4] Running Database Migrations & Seeders...
docker-compose exec -T app php artisan migrate --force
docker-compose exec -T app php artisan db:seed --force

:: 4. Cache Configurations
echo.
echo [4/4] Optimizing Production Route & Config Caches...
docker-compose exec -T app php artisan config:cache
docker-compose exec -T app php artisan route:cache

echo.
echo ========================================================
echo   LinkBus Production Deployment Running via Docker!
echo   Application URL: http://localhost
echo   API Endpoint:    http://localhost/api
echo ========================================================
pause
