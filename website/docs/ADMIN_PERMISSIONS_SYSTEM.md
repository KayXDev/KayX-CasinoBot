# 🛡️ Sistema de Permisos de Administrador - Casino Bot

## 📋 Descripción General

Se ha implementado un sistema avanzado de permisos que permite a los administradores del servidor de Discord tener acceso al panel de administración del sitio web, no solo al propietario (owner).

## 🔧 Funcionalidades Implementadas

### 1. **API de Verificación de Permisos** (`/api/users/permissions`)
- **Endpoint**: `GET /api/users/permissions`
- **Función**: Verifica si el usuario autenticado tiene permisos de administrador
- **Verificaciones**:
  - ✅ Si es el owner (ID hardcodeado)
  - ✅ Si tiene rol con permisos `ADMINISTRATOR` en Discord
  - ✅ Si tiene permisos `MANAGE_GUILD` (Administrar Servidor)
  - ✅ Si tiene permisos `MANAGE_ROLES` (Administrar Roles)
  - ✅ Si tiene permisos `MANAGE_CHANNELS` (Administrar Canales)

### 2. **Hook Personalizado** (`useUserPermissions`)
- **Archivo**: `hooks/useUserPermissions.ts`
- **Exports**:
  - `useUserPermissions()` - Hook principal con información completa
  - `useIsAdmin()` - Hook simple que retorna si es admin (owner o servidor admin)
  - `useIsOwner()` - Hook simple que retorna si es el owner específicamente

### 3. **Componente Navbar Actualizado**
- **Nuevo badge**: Los admins del servidor ven un badge "ADMIN" (azul/púrpura)
- **Menú Admin**: Opción "Admin" aparece para todos los administradores
- **Owner distinction**: El owner sigue viendo "Admin Dashboard", los admins ven "Admin"

### 4. **Panel de Administración Protegido**
- **Archivo**: `app/admin/page.tsx`
- **Protección**: Solo usuarios con permisos de administrador pueden acceder
- **Mensaje de error**: Si no tienes permisos, muestra mensaje claro de acceso denegado

## 🔑 Configuración Requerida

### Variables de Entorno (`.env.local`)
```bash
DISCORD_BOT_TOKEN=YOUR_DISCORD_BOT_TOKEN
```

### ID del Servidor Discord
```javascript
const GUILD_ID = '1382476289151336460' // Tu servidor Discord
```

## 📊 Estructura de Respuesta de la API

```javascript
// Ejemplo de respuesta exitosa para admin del servidor
{
  "success": true,
  "isAdmin": true,
  "isOwner": false,
  "permissions": ["ADMINISTRATOR"],
  "roles": 3
}

// Ejemplo de respuesta para owner
{
  "success": true,
  "isAdmin": true,
  "isOwner": true,
  "permissions": ["ADMINISTRATOR"]
}

// Ejemplo de respuesta para usuario sin permisos
{
  "success": true,
  "isAdmin": false,
  "isOwner": false,
  "error": "User not in server"
}
```

## 🎯 Uso en Componentes

### Hook Básico
```javascript
import { useUserPermissions } from '@/hooks/useUserPermissions'

function MyComponent() {
  const { isAdmin, isOwner, permissions, loading } = useUserPermissions()
  
  if (loading) return <div>Cargando permisos...</div>
  
  return (
    <div>
      {isOwner && <p>¡Eres el owner!</p>}
      {!isOwner && isAdmin && <p>¡Eres admin del servidor!</p>}
      {!isAdmin && <p>No tienes permisos de admin</p>}
    </div>
  )
}
```

### Hook Simplificado
```javascript
import { useIsAdmin } from '@/hooks/useUserPermissions'

function AdminOnlyComponent() {
  const isAdmin = useIsAdmin()
  
  if (!isAdmin) return null
  
  return <div>Contenido solo para admins</div>
}
```

## 🔒 Permisos de Discord Soportados

| Permiso | Bit | Descripción |
|---------|-----|-------------|
| `ADMINISTRATOR` | `0x8` | Administrador completo |
| `MANAGE_GUILD` | `0x20` | Administrar servidor |
| `MANAGE_ROLES` | `0x10000000` | Administrar roles |
| `MANAGE_CHANNELS` | `0x10` | Administrar canales |

## 🧪 Testing

### Script de Prueba
Ejecuta en la consola del navegador (mientras estés autenticado):

```javascript
// Ejecutar test-admin-permissions.js
// o directamente en consola:
fetch('/api/users/permissions')
  .then(res => res.json())
  .then(data => console.log('Permisos:', data))
```

## 🚀 Beneficios del Nuevo Sistema

1. **Descentralización**: No solo el owner puede administrar
2. **Seguridad**: Verificación en tiempo real con Discord API
3. **Flexibilidad**: Múltiples niveles de permisos administrativos
4. **UX Mejorada**: Feedback visual claro en la interfaz
5. **Escalabilidad**: Fácil de extender para más roles/permisos

## 📝 Notas Importantes

- ⚠️ El bot debe estar en el servidor y tener permisos para leer miembros y roles
- 🔄 Los permisos se verifican en cada request para máxima seguridad
- ⏱️ Hay un sistema de caché en el hook para evitar requests innecesarios
- 🎨 El UI se actualiza automáticamente cuando cambian los permisos

## 🔄 Próximas Mejoras

- [ ] Cache de permisos con TTL
- [ ] Notificaciones cuando se otorgan/revocan permisos
- [ ] Logs de actividad administrativa
- [ ] Roles personalizados específicos del bot