@echo off
echo ========================================
echo   Dungeon Desktop - DEBUG Build Script
echo ========================================
echo.

:: Check dependencies
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo ERROR: Node.js is not installed
    pause
    exit /b 1
)

where cargo >nul 2>nul
if %errorlevel% neq 0 (
    echo ERROR: Rust is not installed
    pause
    exit /b 1
)

echo Starting DEBUG build (faster, larger file)...
echo.

:: Build frontend
echo [1/2] Building frontend...
call npm run build
if %errorlevel% neq 0 (
    echo ERROR: Frontend build failed
    pause
    exit /b 1
)

:: Build Tauri app in debug mode
echo [2/2] Building desktop application (DEBUG)...
call npm run tauri:build:debug
if %errorlevel% neq 0 (
    echo ERROR: Desktop application build failed
    pause
    exit /b 1
)

echo.
echo ========================================
echo   DEBUG BUILD COMPLETED!
echo ========================================
echo.
echo Debug executable: src-tauri\target\debug\dndmapper.exe
echo (Larger file size, faster build time, includes debug info)
echo.
pause
