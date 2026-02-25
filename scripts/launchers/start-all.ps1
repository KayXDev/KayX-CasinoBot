# Script para inicializar el Casino Discord Bot
# Uso: .\start-all.ps1

Write-Host "Iniciando Casino Discord Bot..." -ForegroundColor Green
Write-Host ""

# Verificar si Node.js esta instalado
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Host "Error: Node.js no esta instalado" -ForegroundColor Red
    exit 1
}

# Verificar si estamos en el directorio correcto
if (-not (Test-Path "package.json")) {
    Write-Host "Error: Ejecuta este script desde la carpeta del bot" -ForegroundColor Red
    exit 1
}

Write-Host "Verificaciones completadas" -ForegroundColor Green
Write-Host ""

# Iniciar el bot directamente
Write-Host "Iniciando el Bot de Discord..." -ForegroundColor Blue
npm start