@echo off
echo 🎰 Casino Discord Bot - Launcher
echo.

:menu
echo Selecciona una opcion:
echo 1. Iniciar Bot de Discord
echo 2. Salir
echo.

set /p choice="Ingresa tu opcion (1-2): "

if "%choice%"=="1" goto bot
if "%choice%"=="2" goto exit

echo Opcion no valida
goto menu

:bot
echo 🤖 Iniciando Bot de Discord...
npm start
goto end

:exit
echo 👋 Saliendo...
goto end

:end
pause