
import { PrismaAdapter } from "@auth/prisma-adapter";
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { prisma } from "@/lib/prisma";
import { schema } from "@/lib/schema";
import bcrypt from "bcryptjs";
const adapter = PrismaAdapter(prisma);

export const { handlers, signIn, signOut, auth } = NextAuth({
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
        const validatedCredentials = schema.parse(credentials);

        const user = await prisma.user.findUnique({
          where: { email: validatedCredentials.email },
        });

        if (!user || !user.password) {
          throw new Error("Invalid credentials.");
        }

        const isPasswordValid = await bcrypt.compare(
          validatedCredentials.password,
          user.password
        );

        if (!isPasswordValid) {
          throw new Error("Invalid credentials.");
        }

        return user;
      },
    }),
  ],
  pages: {
    signIn: "/auth/login",
    error: "/auth/login",
  },
  callbacks: {
    async jwt({ token, user, account }) {
      // Добавляем роль пользователя в токен
      if (user) {
        console.log("JWT callback - user data:", { id: user.id, role: user.role, email: user.email });
        token.role = user.role || 'user';
        token.sub = user.id;
      }
      console.log("JWT callback - final token:", { sub: token.sub, role: token.role });
      return token;
    },
    async session({ session, token }) {
      console.log("Session callback - incoming data:", { 
        hasSession: !!session, 
        hasUser: !!session?.user, 
        hasToken: !!token,
        tokenSub: token?.sub,
        tokenRole: token?.role 
      });
      
      if (session && token) {
        // Для JWT стратегии токен содержит всю нужную информацию
        session.user.id = token.sub as string;
        session.user.role = (token.role as string) || 'user';
        console.log("Session callback - final session:", { userId: session.user.id, role: session.user.role });
      }
      return session;
    },
  },
  jwt: {
    // Используем стандартное кодирование JWT
  },
});