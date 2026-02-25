# Script para limpiar completamente los errores de TypeScript y archivos fantasma

Write-Host "🧹 Limpiando proyecto completamente..." -ForegroundColor Yellow

# Cerrar VS Code si está abierto
# Write-Host "Cerrando VS Code..." -ForegroundColor Yellow
# Get-Process -Name "Code" -ErrorAction SilentlyContinue | Stop-Process -Force

# Limpiar cachés
Write-Host "Eliminando cachés..." -ForegroundColor Yellow
if (Test-Path ".next") { Remove-Item -Recurse -Force ".next" }
if (Test-Path "node_modules") { Remove-Item -Recurse -Force "node_modules" }
if (Test-Path "package-lock.json") { Remove-Item -Force "package-lock.json" }

# Limpiar caché de npm
Write-Host "Limpiando caché de npm..." -ForegroundColor Yellow
npm cache clean --force

# Reinstalar dependencias
Write-Host "Reinstalando dependencias..." -ForegroundColor Yellow
npm install

# Verificar que no existe la carpeta store
Write-Host "Verificando estructura..." -ForegroundColor Yellow
if (Test-Path "app\store") {
    Write-Host "❌ Carpeta store encontrada, eliminando..." -ForegroundColor Red
    Remove-Item -Recurse -Force "app\store"
} else {
    Write-Host "✅ No se encontró carpeta store" -ForegroundColor Green
}

Write-Host "🎉 Limpieza completa terminada!" -ForegroundColor Green
Write-Host "💡 Ahora cierra y vuelve a abrir VS Code para eliminar buffers antiguos" -ForegroundColor Cyan