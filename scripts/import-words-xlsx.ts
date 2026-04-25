import "dotenv/config"
import fs from "fs/promises"
import path from "path"
import * as XLSX from "xlsx"
import { PrismaClient } from "@prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"
import { Pool } from "pg"

type RawRow = Record<string, unknown>

type ParsedWord = {
  english: string
  russian?: string | null
  definition?: string | null
  example?: string | null
  imageUrl?: string | null
}

const databaseUrl = process.env.IMPORT_DATABASE_URL ?? process.env.DATABASE_URL

if (!databaseUrl) {
  throw new Error("Set IMPORT_DATABASE_URL or DATABASE_URL before importing")
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

function normalizeHeader(value: unknown): string {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ")
}

function toStringOrEmpty(value: unknown): string {
  return String(value ?? "").trim()
}

function isTruthyCell(value: unknown): boolean {
  return String(value ?? "").trim().length > 0
}

function findColumn(headers: string[], aliases: string[]): string | null {
  const aliasSet = new Set(aliases.map((a) => normalizeHeader(a)))
  for (const header of headers) {
    if (aliasSet.has(normalizeHeader(header))) {
      return header
    }
  }
  return null
}

function hasCyrillic(value: unknown): boolean {
  return /[\u0400-\u04FF]/.test(String(value ?? ""))
}

function chooseColumnByScore(headers: string[], rows: RawRow[], scorer: (value: unknown) => number): string | null {
  let bestHeader: string | null = null
  let bestScore = -1

  for (const header of headers) {
    let score = 0
    for (const row of rows) {
      score += scorer(row[header])
    }
    if (score > bestScore) {
      bestScore = score
      bestHeader = header
    }
  }

  return bestHeader
}

function parseRows(rows: RawRow[]): ParsedWord[] {
  if (rows.length === 0) return []

  const headers = Object.keys(rows[0])

  const englishColumn =
    findColumn(headers, ["english", "en", "word", "слово", "английский", "english word"]) ??
    chooseColumnByScore(headers, rows, (value) => {
      const text = toStringOrEmpty(value)
      if (!text) return 0
      if (hasCyrillic(text)) return 0
      // Prefer concise latin words over long explanation text.
      return text.length <= 30 ? 3 : 1
    }) ??
    headers[0] ??
    null

  const russianColumn =
    findColumn(headers, ["russian", "ru", "translation", "перевод", "русский"]) ??
    chooseColumnByScore(headers, rows, (value) => {
      const text = toStringOrEmpty(value)
      if (!text) return 0
      return hasCyrillic(text) ? 5 : 0
    }) ??
    headers[1] ??
    null

  const definitionColumn =
    findColumn(headers, ["definition", "определение", "значение"]) ??
    chooseColumnByScore(headers, rows, (value) => {
      const text = toStringOrEmpty(value)
      if (!text) return 0
      if (hasCyrillic(text)) return 0
      return text.length > 30 ? 2 : 0
    })
  const exampleColumn = findColumn(headers, ["example", "пример", "sentence", "контекст"])
  const imageUrlColumn = findColumn(headers, ["imageurl", "image url", "image", "картинка", "изображение", "url"])

  if (!englishColumn || !russianColumn) {
    throw new Error("Cannot detect English/Russian columns in Excel sheet")
  }

  const parsed = rows
    .filter((row) => isTruthyCell(row[englishColumn]) || isTruthyCell(row[russianColumn]))
    .map((row) => {
      const english = toStringOrEmpty(row[englishColumn])
      const russian = toStringOrEmpty(row[russianColumn])
      const definition = definitionColumn ? toStringOrEmpty(row[definitionColumn]) : ""
      const example = exampleColumn ? toStringOrEmpty(row[exampleColumn]) : ""
      const imageUrl = imageUrlColumn ? toStringOrEmpty(row[imageUrlColumn]) : ""

      return {
        english,
        russian,
        definition: definition || null,
        example: example || null,
        imageUrl: imageUrl || null,
      }
    })
    .filter((word) => {
      if (word.english.length === 0) return false
      if (/^word\s*list\b/i.test(word.english)) return false
      return true
    })

  const unique = new Map<string, ParsedWord>()
  for (const word of parsed) {
    const key = `${word.english.toLowerCase()}::${(word.russian ?? "").toLowerCase()}`
    if (!unique.has(key)) unique.set(key, word)
  }

  return Array.from(unique.values())
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

function enrichWordInput(word: ParsedWord): Required<ParsedWord> {
  const english = (word.english ?? "").trim()
  const russian = (word.russian ?? "").trim() || fallbackRussian(english)
  const definition = (word.definition ?? "").trim() || fallbackDefinition(english, russian)
  const example = (word.example ?? "").trim() || fallbackExample(english)
  const imageUrl = (word.imageUrl ?? "").trim() || fallbackImageUrl(english)

  return {
    english,
    russian,
    definition,
    example,
    imageUrl,
  }
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

  const users = await withRetry("resolveUser(list users)", () => prisma.user.findMany({
    select: { id: true, email: true },
    orderBy: { createdAt: "asc" },
  }))

  if (users.length === 0) {
    throw new Error("No users found. Register at least one account first.")
  }

  if (users.length === 1) {
    return users[0]
  }

  // If several users exist, import into the account with the largest existing dictionary.
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

  const chosenUser = [...users]
    .sort((a, b) => (scoreByUser.get(b.id) ?? 0) - (scoreByUser.get(a.id) ?? 0))[0]

  console.warn(`Multiple users found, auto-selected: ${chosenUser.email}`)

  return chosenUser
}

async function run() {
  const fileArg = getArg("--file") ?? "1.xlsx"
  const emailArg = getArg("--email")
  const dictionaryName = getArg("--dictionary") ?? "Импорт из Excel"
  const sheetArg = getArg("--sheet")

  const absoluteFilePath = path.isAbsolute(fileArg)
    ? fileArg
    : path.join(process.cwd(), fileArg)

  await fs.access(absoluteFilePath)

  const workbook = XLSX.readFile(absoluteFilePath)
  const sheetName = sheetArg ?? workbook.SheetNames[0]

  if (!sheetName || !workbook.Sheets[sheetName]) {
    throw new Error("Cannot find the target sheet in workbook")
  }

  const rows = XLSX.utils.sheet_to_json<RawRow>(workbook.Sheets[sheetName], {
    defval: "",
    raw: false,
    blankrows: false,
  })

  const words = parseRows(rows)
  if (words.length === 0) {
    throw new Error("No valid words found in the selected sheet")
  }

  const user = await resolveUser(emailArg)

  let dictionary = await withRetry("find dictionary", () =>
    prisma.dictionary.findFirst({
      where: { userId: user.id, name: dictionaryName },
    }),
  )

  if (!dictionary) {
    dictionary = await withRetry("create dictionary", () =>
      prisma.dictionary.create({
        data: {
          userId: user.id,
          name: dictionaryName,
        },
      }),
    )
  }

  const existingWords = await withRetry("load existing words", () =>
    prisma.word.findMany({
      where: { dictionaryId: dictionary.id },
      select: { english: true, russian: true },
    }),
  )

  const existingSet = new Set(existingWords.map((word) => `${word.english.toLowerCase()}::${word.russian.toLowerCase()}`))

  let inserted = 0
  let skipped = 0
  const newRows: Array<{
    dictionaryId: string
    english: string
    russian: string
    definition: string | null
    example: string | null
    imageUrl: string | null
  }> = []

  for (const wordRaw of words) {
    const word = enrichWordInput(wordRaw)
    const key = `${word.english.toLowerCase()}::${word.russian.toLowerCase()}`
    if (existingSet.has(key)) {
      skipped += 1
      continue
    }

    newRows.push({
      dictionaryId: dictionary.id,
      english: word.english,
      russian: word.russian,
      definition: word.definition ?? null,
      example: word.example ?? null,
      imageUrl: word.imageUrl ?? null,
    })
    existingSet.add(key)
  }

  const chunkSize = 50
  for (let i = 0; i < newRows.length; i += chunkSize) {
    const chunk = newRows.slice(i, i + chunkSize)
    const result = await withRetry("bulk insert words", () =>
      prisma.word.createMany({
        data: chunk,
      }),
    )
    inserted += result.count
  }

  console.log(`User: ${user.email}`)
  console.log(`Dictionary: ${dictionary.name}`)
  console.log(`Read rows: ${rows.length}`)
  console.log(`Parsed unique words: ${words.length}`)
  console.log(`Inserted: ${inserted}`)
  console.log(`Skipped duplicates: ${skipped}`)
}

run()
  .catch((error) => {
    console.error("Import failed:", error)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
    await pool.end()
  })
