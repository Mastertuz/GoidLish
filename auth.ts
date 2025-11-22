
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
        try {
          console.log('=== Auth authorize attempt ===');
          console.log('Credentials received:', { email: credentials?.email, hasPassword: !!credentials?.password });
          
          const validatedCredentials = schema.login.parse(credentials);
          console.log('Credentials validated');

          const user = await prisma.user.findUnique({
            where: { email: validatedCredentials.email },
          });
          console.log('User found:', { exists: !!user, hasPassword: !!user?.password });

          if (!user || !user.password) {
            console.log('User not found or no password');
            return null;
          }

          const isPasswordValid = await bcrypt.compare(
            validatedCredentials.password,
            user.password
          );
          console.log('Password valid:', isPasswordValid);

          if (!isPasswordValid) {
            console.log('Invalid password');
            return null;
          }

          console.log('Auth successful, returning user:', { id: user.id, email: user.email });
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