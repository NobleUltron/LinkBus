@echo off
TITLE LinkBus Full-Stack Launcher (React + Laravel + MySQL)
echo ========================================================
echo   LinkBus - Modern Bus Ticketing & Logistics System
echo ========================================================
echo.

:: 1. Check if MySQL is active
echo [1/3] Checking MySQL database connectivity...
C:\xampp\mysql\bin\mysql.exe -u root -e "USE linkbus;" >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [WARNING] MySQL database 'linkbus' is not reachable.
    echo Please make sure XAMPP MySQL module is STARTED in XAMPP Control Panel.
    echo Press any key to attempt starting Laravel and Vite anyway...
    pause >nul
) else (
    echo [OK] Connected to MySQL database 'linkbus'.
)

echo.
:: 2. Launch Laravel 12 API Server
echo [2/3] Starting Laravel 12 Backend API Server on http://localhost:8000 ...
start "LinkBus Backend API (Laravel 12)" cmd /k "cd /d %~dp0backend && php artisan serve --port=8000"

echo.
:: 3. Launch React Frontend Dev Server
echo [3/3] Starting React Vite Frontend Server on http://localhost:5173 ...
start "LinkBus Frontend UI (React + Vite)" cmd /k "cd /d %~dp0 && npm run dev"

echo.
echo ========================================================
echo   System Started Successfully!
echo   Frontend URL: http://localhost:5173
echo   Backend API:  http://localhost:8000/api
echo   Demo Login:   admin@linkbus.co.ug / password
echo ========================================================
echo.

:: Open browser automatically
timeout /t 3 >nul
start http://localhost:5173

pause
