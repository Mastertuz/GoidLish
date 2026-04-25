import "dotenv/config"
import { PrismaClient } from "@prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"
import { Pool } from "pg"

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient
  prismaPool?: Pool
}
const connectionString = process.env.DATABASE_URL ?? ""

if (!connectionString) {
  throw new Error("DATABASE_URL is not set")
}

const runtimeDatabaseUrl = (() => {
  const url = new URL(connectionString)
  return url.toString()
})()

const pool =
  globalForPrisma.prismaPool ??
  new Pool({
    connectionString: runtimeDatabaseUrl,
    max: 10,
    connectionTimeoutMillis: 4_000,
    query_timeout: 8_000,
    statement_timeout: 8_000,
    idle_in_transaction_session_timeout: 8_000,
    keepAlive: true,
    idleTimeoutMillis: 5_000,
    allowExitOnIdle: true,
  })

const adapter = new PrismaPg(pool)

export const prisma = globalForPrisma.prisma ||
  new PrismaClient({ adapter })

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma
  globalForPrisma.prismaPool = pool
}