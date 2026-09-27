@echo off
setlocal

cd /d "%~dp0"

echo.
echo ========================================
echo   Print Studio - Windows Launcher
echo ========================================
echo.

where node >nul 2>&1
if errorlevel 1 (
  echo [ERROR] Node.js was not found in PATH.
  echo Install Node.js 22 or newer, then run this file again.
  goto :fail
)

where pnpm >nul 2>&1
if errorlevel 1 (
  echo [ERROR] pnpm was not found in PATH.
  echo Install pnpm 10.17.1 or enable it with Corepack, then run this file again.
  goto :fail
)

where cargo >nul 2>&1
if errorlevel 1 (
  echo [ERROR] Rust/Cargo was not found in PATH.
  echo Tauri requires Rust. Install Rust with rustup, then run this file again.
  goto :fail
)

echo [INFO] Syncing workspace dependencies...
call pnpm install --frozen-lockfile=false --prefer-offline
if errorlevel 1 goto :fail

echo.
echo [INFO] Starting Print Studio...
echo [INFO] Close the Tauri window or press Ctrl+C here to stop.
echo.

call pnpm desktop
if errorlevel 1 goto :fail

exit /b 0

:fail
echo.
echo [ERROR] Print Studio could not be started.
echo.
pause
exit /b 1
