@echo off
chcp 65001 >nul
setlocal

echo ========================================
echo   MaWu - Multi-platform Build
echo ========================================
echo.

echo [1/8] Building frontend...
call npx electron-vite build
if %errorlevel% neq 0 (
    echo [FAIL] Frontend build failed!
    pause
    exit /b 1
)
echo [OK] Frontend build done
echo.

echo [2/8] Building Linux armv7l...
call npx electron-builder --linux --armv7l
if %errorlevel% neq 0 ( echo [FAIL] Linux armv7l ) else ( echo [OK] Linux armv7l )
echo.

echo [3/8] Building Linux arm64...
call npx electron-builder --linux --arm64
if %errorlevel% neq 0 ( echo [FAIL] Linux arm64 ) else ( echo [OK] Linux arm64 )
echo.

echo [4/8] Building Linux ia32...
call npx electron-builder --linux --ia32
if %errorlevel% neq 0 ( echo [FAIL] Linux ia32 ) else ( echo [OK] Linux ia32 )
echo.

echo [5/8] Building Linux x64...
call npx electron-builder --linux --x64
if %errorlevel% neq 0 ( echo [FAIL] Linux x64 ) else ( echo [OK] Linux x64 )
echo.

echo [6/8] Building macOS arm64...
call npx electron-builder --mac --arm64
if %errorlevel% neq 0 ( echo [FAIL] macOS arm64 ) else ( echo [OK] macOS arm64 )
echo.

echo [7/8] Building macOS amd64...
call npx electron-builder --mac --x64
if %errorlevel% neq 0 ( echo [FAIL] macOS amd64 ) else ( echo [OK] macOS amd64 )
echo.

echo [8/8] Building Windows x64 + arm64...
call npx electron-builder --win --x64 --arm64
if %errorlevel% neq 0 ( echo [FAIL] Windows ) else ( echo [OK] Windows )
echo.

echo ========================================
echo   All builds done! Output: dist/
echo ========================================
pause
