// Utilidad para obtener información de usuario de Discord
export interface DiscordUser {
  id: string
  username: string
  discriminator: string
  avatar?: string
  display_name?: string
}

const userCache = new Map<string, DiscordUser>()

export async function getDiscordUser(userId: string): Promise<DiscordUser | null> {
  // Verificar caché primero
  if (userCache.has(userId)) {
    return userCache.get(userId)!
  }

  try {
    // En una implementación real, aquí harías una llamada a la API de Discord
    // Por ahora, vamos a crear un usuario genérico
    const user: DiscordUser = {
      id: userId,
      username: `User_${userId.slice(-4)}`,
      discriminator: '0000',
      avatar: undefined,
      display_name: `Usuario ${userId.slice(-4)}`
    }

    // Guardar en caché
    userCache.set(userId, user)
    return user
  } catch (error) {
    console.error('Error fetching Discord user:', error)
    return null
  }
}

export function getAvatarUrl(user: DiscordUser): string {
  if (user.avatar) {
    return `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png`
  }
  
  // Avatar por defecto
  const defaultAvatarNum = parseInt(user.discriminator) % 5
  return `https://cdn.discordapp.com/embed/avatars/${defaultAvatarNum}.png`
}

export function getDisplayName(user: DiscordUser): string {
  return user.display_name || user.username
}