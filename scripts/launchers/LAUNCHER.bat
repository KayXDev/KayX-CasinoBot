@echo off
color 0a
title Casino Discord Bot - Launcher v2.0

echo.
echo     ██████  █████  ███████ ██ ███   ██  ██████  
echo    ██      ██   ██ ██      ██ ████  ██ ██    ██ 
echo    ██      ███████ ███████ ██ ██ ██ ██ ██    ██ 
echo    ██      ██   ██      ██ ██ ██  ████ ██    ██ 
echo     ██████ ██   ██ ███████ ██ ██   ███  ██████  
echo.
echo                    Discord Bot Launcher
echo.

:menu
echo  ╔══════════════════════════════════════════╗
echo  ║         MENU PRINCIPAL                   ║
echo  ╠══════════════════════════════════════════╣
echo  ║                                          ║
echo  ║  [1] Iniciar Bot de Discord              ║
echo  ║  [2] Solo Bot (Modo Debug)               ║
echo  ║  [3] Ver Logs                            ║
echo  ║  [4] Salir                               ║
echo  ║                                          ║
echo  ╚══════════════════════════════════════════╝
echo.

set /p choice="  👉 Selecciona una opcion (1-4): "

if "%choice%"=="1" goto bot
if "%choice%"=="2" goto debug
if "%choice%"=="3" goto logs
if "%choice%"=="4" goto exit

echo.
echo  ❌ Opcion no valida, intenta de nuevo...
timeout /t 2 >nul
cls
goto menu

:bot
cls
echo.
echo  ╔══════════════════════════════════════════╗
echo  ║         INICIANDO BOT...                 ║
echo  ╚══════════════════════════════════════════╝
echo.
echo 🤖 Iniciando Bot de Discord...
echo.
npm start
goto end

:debug
cls
echo.
echo  ╔══════════════════════════════════════════╗
echo  ║         MODO DEBUG ACTIVADO              ║
echo  ╚══════════════════════════════════════════╝
echo.
echo 🐛 Iniciando Bot en Modo Debug...
echo.
set DEBUG=*
npm start
goto end

:logs
cls
echo.
echo  ╔══════════════════════════════════════════╗
echo  ║              LOGS DEL BOT                ║
echo  ╚══════════════════════════════════════════╝
echo.
echo 📊 Mostrando logs recientes...
echo.
if exist "logs\commands.json" (
    type "logs\commands.json" | more
) else (
    echo No se encontraron logs disponibles.
)
echo.
pause
cls
goto menu

:exit
cls
echo.
echo  ╔══════════════════════════════════════════╗
echo  ║              SALIENDO...                 ║
echo  ╚══════════════════════════════════════════╝
echo.
echo 👋 Gracias por usar Casino Discord Bot!
timeout /t 2 >nul
goto end

:end
exit