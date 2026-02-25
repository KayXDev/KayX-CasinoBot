# Script de PowerShell para actualizar estadísticas de servidores
# Se puede programar con Task Scheduler de Windows

$ErrorActionPreference = "Stop"

Write-Host "🔄 Iniciando actualización de estadísticas de servidores..." -ForegroundColor Yellow

try {
    # Cambiar al directorio del website
    Set-Location "C:\Users\ahern\Desktop\casino-discord-bot\website"
    
    # Verificar que el servidor esté corriendo
    $response = Invoke-RestMethod -Uri "http://localhost:3000/api/health" -Method GET -ErrorAction SilentlyContinue
    
    if (-not $response) {
        Write-Host "⚠️  El servidor Next.js no está corriendo. Iniciando..." -ForegroundColor Orange
        Start-Process -FilePath "npm" -ArgumentList "run", "dev" -WindowStyle Hidden
        Start-Sleep -Seconds 10
    }

    # Ejecutar actualización
    $updateResponse = Invoke-RestMethod -Uri "http://localhost:3000/api/discord/update-servers" -Method POST -Headers @{
        "Content-Type" = "application/json"
        "Authorization" = "Bearer default-key"
    }

    if ($updateResponse.success) {
        Write-Host "✅ Actualización completada: $($updateResponse.message)" -ForegroundColor Green
        Write-Host "📊 Actualizados: $($updateResponse.stats.updated) | Errores: $($updateResponse.stats.errors)" -ForegroundColor Cyan
    } else {
        Write-Host "❌ Error en la actualización: $($updateResponse.error)" -ForegroundColor Red
    }

} catch {
    Write-Host "💥 Error ejecutando actualización: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

Write-Host "🎯 Proceso completado" -ForegroundColor Green