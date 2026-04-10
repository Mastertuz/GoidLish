
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { prisma } from "@/lib/prisma";
import { schema } from "@/lib/schema";
import bcrypt from "bcryptjs";

export const { handlers, signIn, signOut, auth } = NextAuth({
  trustHost: true,
  // Временно отключаем adapter для использования JWT стратегии
  // adapter,
  session: {
    strategy: "jwt",
  },
  providers: [
    Credentials({
      credentials: {
        email: {},
        password: {},
      },
      authorize: async (credentials) => {
        try {
          const validatedCredentials = schema.login.parse(credentials);

          const user = await prisma.user.findUnique({
            where: { email: validatedCredentials.email },
            select: {
              id: true,
              email: true,
              name: true,
              password: true,
              role: true,
            },
          });

          if (!user || !user.password) {
            return null;
          }

          const isPasswordValid = await bcrypt.compare(
            validatedCredentials.password,
            user.password
          );

          if (!isPasswordValid) {
            return null;
          }

          return {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role || 'user'
          };
        } catch (error) {
          console.error('Auth error:', error);
          return null;
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      // Добавляем роль пользователя в токен
      if (user) {
        token.role = user.role || 'user';
        token.sub = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session && token?.sub) {
        // Для JWT стратегии токен содержит всю нужную информацию.
        // Явно инициализируем user, чтобы избежать runtime-ошибок в /api/auth/session.
        session.user = {
          ...session.user,
          id: token.sub,
          role: (token.role as string) || 'user',
        };
      }
      return session;
    },
  },
  jwt: {
    // Используем стандартное кодирование JWT
  },
});
