import { PrismaClient } from "@prisma/client"
import { withAccelerate } from "@prisma/extension-accelerate"
 
const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }

// Создаем простой клиент для версии 5.22.0
export const prisma = globalForPrisma.prisma || 
  new PrismaClient().$extends(withAccelerate())
 
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma

export default prisma