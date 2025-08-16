@echo off
echo ========================================
echo   Dungeon Desktop - Build Script
echo ========================================
echo.

:: Check if Node.js is installed
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo ERROR: Node.js is not installed or not in PATH
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)

:: Check if npm is installed
where npm >nul 2>nul
if %errorlevel% neq 0 (
    echo ERROR: npm is not installed or not in PATH
    pause
    exit /b 1
)

:: Check if Rust is installed
where cargo >nul 2>nul
if %errorlevel% neq 0 (
    echo ERROR: Rust is not installed or not in PATH
    echo Please install Rust from https://rustup.rs/
    pause
    exit /b 1
)

echo Checking dependencies...
if not exist "node_modules" (
    echo Installing dependencies...
    call npm install
    if %errorlevel% neq 0 (
        echo ERROR: Failed to install dependencies
        pause
        exit /b 1
    )
)

echo.
echo Starting clean build...
echo.

:: Clean previous builds
echo [1/4] Cleaning previous builds...
call npm run clean
if %errorlevel% neq 0 (
    echo WARNING: Clean failed, continuing...
)

:: Run linting
echo [2/4] Running code checks...
call npm run lint
if %errorlevel% neq 0 (
    echo WARNING: Linting issues found, continuing with build...
)

:: Build frontend
echo [3/4] Building frontend...
call npm run build
if %errorlevel% neq 0 (
    echo ERROR: Frontend build failed
    pause
    exit /b 1
)

:: Build Tauri app
echo [4/4] Building desktop application...
call npm run tauri:build
if %errorlevel% neq 0 (
    echo ERROR: Desktop application build failed
    pause
    exit /b 1
)

echo.
echo ========================================
echo   BUILD COMPLETED SUCCESSFULLY!
echo ========================================
echo.
echo Your application has been built and can be found in:
echo   - Windows: src-tauri\target\release\bundle\msi\
echo   - Executable: src-tauri\target\release\dndmapper.exe
echo.
echo Press any key to open the build directory...
pause >nul
explorer "src-tauri\target\release\bundle"
