@echo off
REM =================================
REM 🚀 Crypto Payment Platform Setup Script (Windows)
REM =================================

echo ==========================================
echo 🚀 Crypto Payment Platform Setup
echo ==========================================
echo.

REM Check if Node.js is installed
echo [INFO] Checking Node.js installation...
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is not installed. Please install Node.js 18+
    pause
    exit /b 1
)

REM Check Node.js version
for /f "tokens=1,2 delims=." %%a in ('node --version') do (
    set NODE_VERSION=%%a
    set NODE_MAJOR=%%b
)

echo [SUCCESS] Node.js version found

REM Check if npm is installed
echo [INFO] Checking npm installation...
npm --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] npm is not installed. Please install npm
    pause
    exit /b 1
)

echo [SUCCESS] npm is available

REM Check if we're in the right directory
if not exist "package.json" (
    echo [ERROR] Please run this script from the project root directory
    pause
    exit /b 1
)

echo [SUCCESS] System requirements check passed
echo.

REM Create environment file
if not exist ".env.local" (
    echo [INFO] Creating .env.local file...
    copy "env.example" ".env.local" >nul
    echo [SUCCESS] .env.local file created
    echo [WARNING] Please edit .env.local with your configuration values
) else (
    echo [INFO] .env.local file already exists
)
echo.

REM Install dependencies
echo [INFO] Installing dependencies...
call npm install
if %errorlevel% neq 0 (
    echo [ERROR] Failed to install dependencies
    pause
    exit /b 1
)
echo [SUCCESS] Dependencies installed successfully
echo.

REM Setup database
echo [INFO] Setting up database...
if not exist "data" mkdir data
echo [SUCCESS] Database directory ready
echo.

REM Build application
echo [INFO] Building application...
call npm run build
if %errorlevel% neq 0 (
    echo [ERROR] Failed to build application
    pause
    exit /b 1
)
echo [SUCCESS] Application built successfully
echo.

REM Display summary
echo ==========================================
echo 🎉 Setup Complete! 🎉
echo ==========================================
echo.
echo Your crypto payment platform is ready!
echo.
echo Next steps:
echo 1. Edit .env.local with your configuration
echo 2. Configure your blockchain networks
echo 3. Set up Telegram bot (optional)
echo 4. Configure auto-transfer settings
echo.
echo Commands:
echo   npm run dev          - Start development server
echo   npm start            - Start production server
echo   npm test             - Run tests
echo   npm run db:migrate   - Run database migrations
echo.
echo Access your application:
echo   Frontend:     http://localhost:3000
echo   Admin Panel:  http://localhost:3000/admin
echo   Health Check: http://localhost:3000/api/health
echo.
echo Documentation: README.md
echo ==========================================
echo.
pause
