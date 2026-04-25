import "dotenv/config"
import { PrismaClient } from "@prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"
import { Pool } from "pg"

const databaseUrl = process.env.IMPORT_DATABASE_URL ?? process.env.DATABASE_URL

if (!databaseUrl) {
  throw new Error("Set IMPORT_DATABASE_URL or DATABASE_URL before running fill script")
}

const pool = new Pool({
  connectionString: databaseUrl,
  max: 8,
  connectionTimeoutMillis: 8_000,
  query_timeout: 30_000,
  statement_timeout: 30_000,
  idle_in_transaction_session_timeout: 30_000,
  keepAlive: true,
  idleTimeoutMillis: 10_000,
  allowExitOnIdle: true,
})

const prisma = new PrismaClient({
  adapter: new PrismaPg(pool),
})

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))
const QUERY_TIMEOUT_MS = 45000

async function withQueryTimeout<T>(label: string, fn: () => Promise<T>): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | null = null
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error(`${label}: query timeout after ${QUERY_TIMEOUT_MS}ms`))
    }, QUERY_TIMEOUT_MS)
  })

  try {
    return await Promise.race([fn(), timeoutPromise])
  } finally {
    if (timeoutId) clearTimeout(timeoutId)
  }
}

function isTransientDbError(error: unknown): boolean {
  const message = error instanceof Error ? error.message.toLowerCase() : ""
  const code =
    typeof error === "object" && error !== null && "code" in error
      ? String((error as { code?: string }).code ?? "")
      : ""

  return (
    message.includes("connection terminated unexpectedly") ||
    message.includes("server closed the connection") ||
    message.includes("terminating connection") ||
    message.includes("socket hang up") ||
    message.includes("timeout") ||
    code === "P2024" ||
    code === "P1017" ||
    code === "P2037"
  )
}

async function withRetry<T>(label: string, fn: () => Promise<T>, attempts = 5): Promise<T> {
  let lastError: unknown

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await withQueryTimeout(label, fn)
    } catch (error) {
      lastError = error
      if (!isTransientDbError(error) || attempt === attempts) {
        throw error
      }
      console.warn(`${label}: transient DB error, retry ${attempt}/${attempts}`)
      await sleep(120 * attempt)
    }
  }

  throw lastError
}

function getArg(flag: string): string | undefined {
  const idx = process.argv.findIndex((arg) => arg === flag)
  if (idx === -1 || idx + 1 >= process.argv.length) return undefined
  return process.argv[idx + 1]
}

function fallbackRussian(english: string): string {
  return `перевод: ${english}`
}

function fallbackDefinition(english: string, russian: string): string {
  return `${english} means \"${russian}\".`
}

function fallbackExample(english: string): string {
  return `I use the word \"${english}\" in a sentence.`
}

function fallbackImageUrl(english: string): string {
  return `https://picsum.photos/seed/${encodeURIComponent(english.toLowerCase())}/640/360`
}

async function resolveUser(emailArg?: string) {
  if (emailArg) {
    const user = await withRetry("resolveUser(by email)", () =>
      prisma.user.findUnique({ where: { email: emailArg } }),
    )
    if (!user) {
      throw new Error(`User not found: ${emailArg}`)
    }
    return user
  }

  const users = await withRetry("resolveUser(list users)", () =>
    prisma.user.findMany({
      select: { id: true, email: true },
      orderBy: { createdAt: "asc" },
    }),
  )

  if (users.length === 0) {
    throw new Error("No users found")
  }

  if (users.length === 1) {
    return users[0]
  }

  const dictionaries = await withRetry("resolveUser(select dictionaries)", () =>
    prisma.dictionary.findMany({
      where: { userId: { not: null } },
      select: {
        userId: true,
        _count: { select: { words: true } },
      },
    }),
  )

  const scoreByUser = new Map<string, number>()
  for (const dictionary of dictionaries) {
    if (!dictionary.userId) continue
    const current = scoreByUser.get(dictionary.userId) ?? 0
    scoreByUser.set(dictionary.userId, current + dictionary._count.words)
  }

  return [...users].sort((a, b) => (scoreByUser.get(b.id) ?? 0) - (scoreByUser.get(a.id) ?? 0))[0]
}

async function run() {
  const emailArg = getArg("--email")
  const user = await resolveUser(emailArg)

  const dictionaries = await withRetry("load dictionaries", () =>
    prisma.dictionary.findMany({
      where: { userId: user.id },
      select: { id: true },
    }),
  )

  const dictionaryIds = dictionaries.map((d) => d.id)
  if (dictionaryIds.length === 0) {
    console.log(`User: ${user.email}`)
    console.log("No dictionaries to update")
    return
  }

  const words = await withRetry("load words", () =>
    prisma.word.findMany({
      where: { dictionaryId: { in: dictionaryIds } },
      select: {
        id: true,
        english: true,
        russian: true,
        definition: true,
        example: true,
        imageUrl: true,
      },
    }),
  )

  const russianByEnglish = new Map<string, string>()
  const definitionByEnglish = new Map<string, string>()
  const exampleByEnglish = new Map<string, string>()
  const imageByEnglish = new Map<string, string>()

  for (const word of words) {
    const key = word.english.trim().toLowerCase()
    if (!key) continue
    if (word.russian.trim()) russianByEnglish.set(key, word.russian.trim())
    if (word.definition?.trim()) definitionByEnglish.set(key, word.definition.trim())
    if (word.example?.trim()) exampleByEnglish.set(key, word.example.trim())
    if (word.imageUrl?.trim()) imageByEnglish.set(key, word.imageUrl.trim())
  }

  let updated = 0

  for (const word of words) {
    const english = word.english.trim()
    if (!english) continue

    const key = english.toLowerCase()
    const currentRussian = word.russian.trim()
    const currentDefinition = word.definition?.trim() ?? ""
    const currentExample = word.example?.trim() ?? ""
    const currentImage = word.imageUrl?.trim() ?? ""

    const russian = currentRussian || russianByEnglish.get(key) || fallbackRussian(english)
    const definition = currentDefinition || definitionByEnglish.get(key) || fallbackDefinition(english, russian)
    const example = currentExample || exampleByEnglish.get(key) || fallbackExample(english)
    const imageUrl = currentImage || imageByEnglish.get(key) || fallbackImageUrl(english)

    const shouldUpdate =
      russian !== currentRussian ||
      definition !== currentDefinition ||
      example !== currentExample ||
      imageUrl !== currentImage

    if (!shouldUpdate) continue

    await withRetry("update word", () =>
      prisma.word.update({
        where: { id: word.id },
        data: {
          russian,
          definition,
          example,
          imageUrl,
        },
      }),
    )

    updated += 1
  }

  console.log(`User: ${user.email}`)
  console.log(`Words scanned: ${words.length}`)
  console.log(`Words updated: ${updated}`)
}

run()
  .catch((error) => {
    console.error("Fill failed:", error)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
    await pool.end()
  })
