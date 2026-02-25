import NextAuth from 'next-auth'
import DiscordProvider from 'next-auth/providers/discord'
import { JWT } from 'next-auth/jwt'
import { Session, User, Account, Profile } from 'next-auth'

export const authOptions = {
  providers: [
    DiscordProvider({
      clientId: process.env.DISCORD_CLIENT_ID!,
      clientSecret: process.env.DISCORD_CLIENT_SECRET!,
    })
  ],
  secret: process.env.NEXTAUTH_SECRET,
  callbacks: {
    async jwt({ token, account, profile }: { token: JWT, account: Account | null, profile?: Profile }) {
      if (account && profile) {
        token.id = (profile as any).id
        token.username = (profile as any).username
        token.discriminator = (profile as any).discriminator
        token.avatar = (profile as any).avatar
      }
      return token
    },
    async session({ session, token }: { session: Session, token: JWT }) {
      if (token && session.user) {
        (session.user as any).id = token.id as string
        ;(session.user as any).username = token.username as string
        ;(session.user as any).discriminator = token.discriminator as string
        ;(session.user as any).avatar = token.avatar as string
      }
      return session
    },
  },
}

const handler = NextAuth(authOptions)
export { handler as GET, handler as POST }