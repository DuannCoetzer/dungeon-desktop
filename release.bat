@echo off
echo ========================================
echo   Dungeon Desktop - RELEASE Build
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

echo This will create a PRODUCTION RELEASE build.
echo.
set /p "confirm=Are you sure? This will run all checks and optimizations. (y/N): "
if /i not "%confirm%"=="y" (
    echo Cancelled.
    pause
    exit /b 0
)

echo.
echo Starting RELEASE build process...
echo.

:: Clean everything
echo [1/5] Deep cleaning...
call npm run clean
rmdir /s /q "dist" 2>nul
rmdir /s /q "src-tauri\target\release" 2>nul

:: Install/update dependencies
echo [2/5] Ensuring dependencies are up to date...
call npm install
if %errorlevel% neq 0 (
    echo ERROR: Failed to install dependencies
    pause
    exit /b 1
)

:: Run comprehensive linting
echo [3/5] Running comprehensive code checks...
call npm run lint
if %errorlevel% neq 0 (
    echo ERROR: Code quality checks failed. Please fix linting errors before release.
    pause
    exit /b 1
)

:: Build frontend with optimizations
echo [4/5] Building optimized frontend...
call npm run build
if %errorlevel% neq 0 (
    echo ERROR: Frontend build failed
    pause
    exit /b 1
)

:: Build optimized Tauri release
echo [5/5] Building optimized desktop application...
call npm run tauri:build
if %errorlevel% neq 0 (
    echo ERROR: Desktop application build failed
    pause
    exit /b 1
)

echo.
echo ========================================
echo   RELEASE BUILD COMPLETED!
echo ========================================
echo.
echo Release artifacts created:
echo   - Installer: src-tauri\target\release\bundle\msi\
echo   - Executable: src-tauri\target\release\dndmapper.exe
echo.
echo The application is ready for distribution!
echo.
echo Press any key to open the release directory...
pause >nul
explorer "src-tauri\target\release\bundle"
