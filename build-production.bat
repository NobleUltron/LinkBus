@echo off
TITLE LinkBus Production Build & Asset Deployment
echo ========================================================
echo   LinkBus - Local Production Build & Static Asset Packager
echo ========================================================
echo.

:: 1. Build React Frontend Static Bundle
echo [1/4] Building optimized React production bundle (Vite)...
call npm run build
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Frontend build failed. Aborting.
    pause
    exit /b %ERRORLEVEL%
)

:: 2. Sync Static Assets to Laravel Public Directory
echo.
echo [2/4] Packaging all static assets and images to backend/public for unified serving...
xcopy /E /I /Y "dist\*" "backend\public\" >nul

:: 3. Optimize Laravel Caches
echo.
echo [3/4] Optimizing Laravel 12 configuration, routing & view caches...
cd /d "%~dp0backend"
call php artisan config:cache
call php artisan route:cache
call php artisan view:cache
cd /d "%~dp0"

:: 4. Done
echo.
echo ========================================================
echo   [SUCCESS] LinkBus Production Bundle Ready!
echo.
echo   You can run LinkBus in production mode via:
echo     1. Laravel Unified Server: cd backend ^&^& php artisan serve
echo     2. XAMPP Apache: Configure DocumentRoot to backend/public
echo ========================================================
echo.
pause
