@echo off
setlocal enabledelayedexpansion
chcp 65001 >nul
title Casino Discord Bot - Simple Launcher
color 0B

:: ═══════════════════════════════════════════════════════════════
:: 🎰 CASINO DISCORD BOT - SIMPLE LAUNCHER
:: ═══════════════════════════════════════════════════════════════

:: Cambiar al directorio padre del bot
cd /d "%~dp0\.."

:: Variables
set "BOT_STATUS=Checking..."
set "MYSQL_STATUS=Checking..."

:: Colores
for /F %%a in ('echo prompt $E ^| cmd') do set "ESC=%%a"
set "GREEN=%ESC%[32m"
set "RED=%ESC%[31m"
set "CYAN=%ESC%[36m"
set "YELLOW=%ESC%[33m"
set "WHITE=%ESC%[37m"
set "RESET=%ESC%[0m"

:main
call :check_status
call :show_menu
goto :end

:show_menu
cls
echo.
echo %CYAN%
echo     ╔════════════════════════════════════════════════╗
echo     ║                                                ║
echo     ║        🎰 Casino Discord Bot Launcher          ║
echo     ║                                                ║
echo     ╠════════════════════════════════════════════════╣
echo     ║  Bot Status: !BOT_STATUS!                      ║
echo     ║  MySQL: !MYSQL_STATUS!                        ║
echo     ╚════════════════════════════════════════════════╝
echo %RESET%
echo.
echo %WHITE%                 ┌─── Options ───┐%RESET%
echo.
echo       %GREEN%[1]%CYAN% 🚀 Start Bot
echo       %GREEN%[2]%CYAN% 🛑 Stop Bot  
echo       %GREEN%[3]%CYAN% 🔄 Restart Bot
echo       %GREEN%[4]%CYAN% � Status Check
echo       %GREEN%[5]%CYAN% 📋 View Config
echo       %GREEN%[6]%CYAN% 🧪 Quick Test
echo.
echo       %RED%[0]%CYAN% ❌ Exit
echo.
echo %WHITE%                 └───────────────┘%RESET%
echo.
set /p "choice=%CYAN%    Choose option: %RESET%"

if "%choice%"=="1" goto :start_bot
if "%choice%"=="2" goto :stop_bot
if "%choice%"=="3" goto :restart_bot
if "%choice%"=="4" goto :status_check
if "%choice%"=="5" goto :view_config
if "%choice%"=="6" goto :quick_test
if "%choice%"=="0" goto :exit_launcher

echo %RED%   ❌ Invalid option%RESET%
timeout /t 2 /nobreak >nul
goto :show_menu

:start_bot
cls
echo.
echo %CYAN%   🚀 Starting Casino Bot...%RESET%
echo.

:: Verificaciones básicas
node --version >nul 2>&1
if !errorlevel! neq 0 (
    echo %RED%   ❌ Node.js not found!%RESET%
    pause
    goto :show_menu
)

if not exist "config.yml" (
    echo %RED%   ❌ config.yml not found!%RESET%
    pause
    goto :show_menu
)

if not exist "node_modules\" (
    echo %YELLOW%   � Installing dependencies...%RESET%
    call npm install >nul 2>&1
)

:: Crear archivo PID para control del proceso
echo %YELLOW%   📝 Creating process control file...%RESET%
echo !date! !time! > bot_launcher.pid

echo %GREEN%   ✅ Starting bot...%RESET%
start "Casino Discord Bot" cmd /k "title Casino Discord Bot Console && echo PID: !random! > bot_process.pid && node index.js"

echo %GREEN%   🎉 Bot started!%RESET%
timeout /t 2 /nobreak >nul
goto :show_menu

:stop_bot
cls
echo.
echo %CYAN%   🛑 Stopping Casino Bot...%RESET%
echo.

:: Múltiples métodos para asegurar que se detenga
echo %YELLOW%   🔍 Searching for bot processes...%RESET%

:: Método 1: Por título de ventana
taskkill /FI "WINDOWTITLE eq Casino Discord Bot*" /T /F >nul 2>&1

:: Método 2: Por proceso Node.js que ejecuta index.js
for /f "tokens=2" %%i in ('tasklist /FI "IMAGENAME eq node.exe" /FO table /NH 2^>nul ^| findstr /C:"node.exe"') do (
    wmic process where "ProcessId=%%i and CommandLine like '%%index.js%%'" delete >nul 2>&1
)

:: Método 3: Terminar todos los cmd.exe que contengan "Casino"
taskkill /FI "WINDOWTITLE eq *Casino*" /T /F >nul 2>&1

:: Limpiar archivo PID
if exist "bot_process.pid" del "bot_process.pid" >nul 2>&1
if exist "bot_launcher.pid" del "bot_launcher.pid" >nul 2>&1

echo %GREEN%   ✅ Bot stopped!%RESET%
timeout /t 2 /nobreak >nul
goto :show_menu

:restart_bot
cls
echo.
echo %CYAN%   🔄 Restarting Casino Bot...%RESET%
echo.

echo %YELLOW%   🛑 Stopping current bot...%RESET%
:: Usar los mismos métodos de stop
taskkill /FI "WINDOWTITLE eq Casino Discord Bot*" /T /F >nul 2>&1
for /f "tokens=2" %%i in ('tasklist /FI "IMAGENAME eq node.exe" /FO table /NH 2^>nul ^| findstr /C:"node.exe"') do (
    wmic process where "ProcessId=%%i and CommandLine like '%%index.js%%'" delete >nul 2>&1
)
taskkill /FI "WINDOWTITLE eq *Casino*" /T /F >nul 2>&1

if exist "bot_process.pid" del "bot_process.pid" >nul 2>&1
if exist "bot_launcher.pid" del "bot_launcher.pid" >nul 2>&1

echo %YELLOW%   ⏳ Waiting for processes to close...%RESET%
timeout /t 3 /nobreak >nul

echo %YELLOW%   🚀 Starting new bot instance...%RESET%
echo !date! !time! > bot_launcher.pid
start "Casino Discord Bot" cmd /k "title Casino Discord Bot Console && echo PID: !random! > bot_process.pid && node index.js"

echo %GREEN%   🎉 Bot restarted!%RESET%
timeout /t 2 /nobreak >nul
goto :show_menu

:status_check
cls
echo.
echo %CYAN%   📊 System Status Check%RESET%
echo.

:: Check bot - múltiples métodos
set "BOT_RUNNING=0"

:: Método 1: Por título de ventana
tasklist /FI "WINDOWTITLE eq Casino Discord Bot*" 2>nul | find /I "cmd.exe" >nul
if !errorlevel! equ 0 set "BOT_RUNNING=1"

:: Método 2: Por proceso Node.js ejecutando index.js
for /f "tokens=2" %%i in ('tasklist /FI "IMAGENAME eq node.exe" /FO table /NH 2^>nul ^| findstr /C:"node.exe"') do (
    wmic process where "ProcessId=%%i and CommandLine like '%%index.js%%'" get ProcessId /format:value 2>nul | find "ProcessId=" >nul
    if !errorlevel! equ 0 set "BOT_RUNNING=1"
)

:: Método 3: Verificar archivo PID
if exist "bot_process.pid" set "BOT_RUNNING=1"

if "!BOT_RUNNING!"=="1" (
    echo %GREEN%   ✅ Bot: Running%RESET%
) else (
    echo %RED%   ❌ Bot: Stopped%RESET%
)

:: Check Node.js
node --version >nul 2>&1
if !errorlevel! equ 0 (
    for /f "delims=" %%i in ('node --version 2^>nul') do echo %GREEN%   ✅ Node.js: %%i%RESET%
) else (
    echo %RED%   ❌ Node.js: Not found%RESET%
)

:: Check MySQL
net start 2>nul | find /I "MySQL" >nul
if !errorlevel! equ 0 (
    echo %GREEN%   ✅ MySQL: Running%RESET%
) else (
    echo %RED%   ❌ MySQL: Stopped%RESET%
)

:: Check files
if exist "config.yml" (echo %GREEN%   ✅ Config: Found%RESET%) else (echo %RED%   ❌ Config: Missing%RESET%)
if exist "index.js" (echo %GREEN%   ✅ Bot file: Found%RESET%) else (echo %RED%   ❌ Bot file: Missing%RESET%)

echo.
pause
goto :show_menu

:view_config
cls
echo.
echo %CYAN%   � Configuration File%RESET%
echo.

if exist "config.yml" (
    echo %GREEN%   Showing config.yml:%RESET%
    echo   ========================
    type config.yml
    echo   ========================
) else (
    echo %RED%   ❌ config.yml not found!%RESET%
)

echo.
pause
goto :show_menu

:quick_test
cls
echo.
echo %CYAN%   🧪 Quick System Test%RESET%
echo.

:: Test Node.js
echo %CYAN%   Testing Node.js...%RESET%
node --version >nul 2>&1 && echo %GREEN%   ✅ Node.js OK%RESET% || echo %RED%   ❌ Node.js Failed%RESET%

:: Test files
echo %CYAN%   Testing files...%RESET%
if exist "index.js" (echo %GREEN%   ✅ index.js OK%RESET%) else (echo %RED%   ❌ index.js Missing%RESET%)
if exist "config.yml" (echo %GREEN%   ✅ config.yml OK%RESET%) else (echo %RED%   ❌ config.yml Missing%RESET%)

:: Test dependencies
echo %CYAN%   Testing dependencies...%RESET%
if exist "node_modules\" (echo %GREEN%   ✅ Dependencies OK%RESET%) else (echo %YELLOW%   ⚠️ Dependencies Missing%RESET%)

echo.
echo %GREEN%   ✅ Quick test completed!%RESET%
pause
goto :show_menu

:check_status
:: Check bot status - múltiples métodos
set "BOT_RUNNING=0"

:: Verificar por título de ventana
tasklist /FI "WINDOWTITLE eq Casino Discord Bot*" 2>nul | find /I "cmd.exe" >nul
if !errorlevel! equ 0 set "BOT_RUNNING=1"

:: Verificar por proceso Node.js ejecutando index.js
for /f %%i in ('tasklist /FI "IMAGENAME eq node.exe" /NH /FO CSV 2^>nul ^| find "index.js" /C') do (
    if %%i gtr 0 set "BOT_RUNNING=1"
)

:: Verificar archivo PID
if exist "bot_process.pid" set "BOT_RUNNING=1"

if "!BOT_RUNNING!"=="1" (
    set "BOT_STATUS=%GREEN%✅ Online%RESET%"
) else (
    set "BOT_STATUS=%RED%❌ Offline%RESET%"
)

:: Check MySQL status
net start 2>nul | find /I "MySQL" >nul
if !errorlevel! equ 0 (
    set "MYSQL_STATUS=%GREEN%✅ Online%RESET%"
) else (
    set "MYSQL_STATUS=%RED%❌ Offline%RESET%"
)
goto :eof

:exit_launcher
cls
echo.
echo %CYAN%
echo     ╔════════════════════════════════════════╗
echo     ║                                        ║
echo     ║      🎰 Thanks for using the          ║
echo     ║         Casino Bot Launcher!           ║
echo     ║                                        ║
echo     ╚════════════════════════════════════════╝
echo %RESET%
echo.
timeout /t 2 /nobreak >nul


:exit_launcher
cls
echo.
echo %CYAN%%BRIGHT%
echo                ╔══════════════════════════════════════════════════╗
echo                ║                                                  ║
echo                ║    %YELLOW%🎰 Thanks for using Casino Bot Launcher! %CYAN%║
echo                ║                                                  ║
echo                ║    %GREEN%Bot Status: !BOT_STATUS! %CYAN%║
echo                ║    %MAGENTA%Have a great day managing your bot! %CYAN%║
echo                ║                                                  ║
echo                ╚══════════════════════════════════════════════════╝
echo %RESET%
echo.
timeout /t 3 /nobreak >nul

:end
endlocal
exit /b