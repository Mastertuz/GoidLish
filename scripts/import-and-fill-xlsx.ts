import "dotenv/config"
import fs from "fs/promises"
import path from "path"
import * as XLSX from "xlsx"
import { Pool } from "pg"
import { v4 as uuidv4 } from "uuid"

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

const createPool = () =>
  new Pool({
    connectionString: databaseUrl,
    max: 6,
    connectionTimeoutMillis: 10000,
    query_timeout: 45000,
    statement_timeout: 45000,
    idle_in_transaction_session_timeout: 30000,
    keepAlive: true,
    idleTimeoutMillis: 10000,
    allowExitOnIdle: true,
  })

let pool = createPool()

async function resetPool() {
  try {
    await pool.end()
  } catch {
    // ignore pool close errors during reconnect attempts
  }
  pool = createPool()
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

function isTransientDbError(error: unknown): boolean {
  const message = error instanceof Error ? error.message.toLowerCase() : ""
  return (
    message.includes("timeout") ||
    message.includes("connection terminated unexpectedly") ||
    message.includes("server closed the connection") ||
    message.includes("socket hang up") ||
    message.includes("ecconnreset") ||
    message.includes("not queryable")
  )
}

function isDuplicatePrimaryKeyError(error: unknown): boolean {
  if (typeof error !== "object" || error === null) return false
  const maybeCode = "code" in error ? String((error as { code?: string }).code ?? "") : ""
  const maybeConstraint =
    "constraint" in error ? String((error as { constraint?: string }).constraint ?? "") : ""

  return maybeCode === "23505" && maybeConstraint === "words_pkey"
}

async function queryWithRetry<T = unknown>(
  text: string,
  params: unknown[] = [],
  attempts = 6,
): Promise<{ rows: T[]; rowCount: number }> {
  let lastError: unknown = null

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const result = await pool.query(text, params)
      return { rows: result.rows as T[], rowCount: result.rowCount ?? 0 }
    } catch (error) {
      lastError = error
      if (!isTransientDbError(error) || attempt === attempts) {
        throw error
      }
      console.warn(`DB retry ${attempt}/${attempts}: ${String((error as Error).message ?? error)}`)
      await resetPool()
      await sleep(150 * attempt)
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
    for (const row of rows) score += scorer(row[header])
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

  if (!englishColumn) throw new Error("Cannot detect English column in Excel sheet")

  const parsed = rows
    .filter((row) => isTruthyCell(row[englishColumn]) || (russianColumn ? isTruthyCell(row[russianColumn]) : false))
    .map((row) => {
      const english = toStringOrEmpty(row[englishColumn])
      const russian = russianColumn ? toStringOrEmpty(row[russianColumn]) : ""
      const definition = definitionColumn ? toStringOrEmpty(row[definitionColumn]) : ""
      const example = exampleColumn ? toStringOrEmpty(row[exampleColumn]) : ""
      const imageUrl = imageUrlColumn ? toStringOrEmpty(row[imageUrlColumn]) : ""
      return {
        english,
        russian: russian || null,
        definition: definition || null,
        example: example || null,
        imageUrl: imageUrl || null,
      }
    })
    .filter((word) => {
      if (!word.english) return false
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

function enrichWord(word: ParsedWord): Required<ParsedWord> {
  const english = word.english.trim()
  const russian = (word.russian ?? "").trim() || fallbackRussian(english)
  const definition = (word.definition ?? "").trim() || fallbackDefinition(english, russian)
  const example = (word.example ?? "").trim() || fallbackExample(english)
  const imageUrl = (word.imageUrl ?? "").trim() || fallbackImageUrl(english)
  return { english, russian, definition, example, imageUrl }
}

async function resolveUser(emailArg?: string): Promise<{ id: string; email: string }> {
  if (emailArg) {
    const byEmail = await queryWithRetry<{ id: string; email: string }>(
      'SELECT "id", "email" FROM "users" WHERE "email" = $1 LIMIT 1',
      [emailArg],
    )
    if (byEmail.rows.length === 0) throw new Error(`User not found: ${emailArg}`)
    return byEmail.rows[0]
  }

  const users = await queryWithRetry<{ id: string; email: string }>(
    'SELECT "id", "email" FROM "users" ORDER BY "createdAt" ASC',
  )

  if (users.rows.length === 0) throw new Error("No users found")
  if (users.rows.length === 1) return users.rows[0]

  const counts = await queryWithRetry<{ userId: string; wordsCount: string }>(
    'SELECT d."userId" as "userId", COUNT(w."id")::text as "wordsCount" FROM "dictionaries" d LEFT JOIN "words" w ON w."dictionaryId" = d."id" WHERE d."userId" IS NOT NULL GROUP BY d."userId"',
  )

  const scoreByUser = new Map<string, number>()
  for (const row of counts.rows) {
    scoreByUser.set(row.userId, Number(row.wordsCount) || 0)
  }

  const chosen = [...users.rows].sort((a, b) => (scoreByUser.get(b.id) ?? 0) - (scoreByUser.get(a.id) ?? 0))[0]
  console.warn(`Multiple users found, auto-selected: ${chosen.email}`)
  return chosen
}

async function getOrCreateDictionary(userId: string, name: string): Promise<{ id: string; name: string }> {
  const existing = await queryWithRetry<{ id: string; name: string }>(
    'SELECT "id", "name" FROM "dictionaries" WHERE "userId" = $1 AND "name" = $2 LIMIT 1',
    [userId, name],
  )

  if (existing.rows.length > 0) return existing.rows[0]

  const id = uuidv4()
  const now = new Date()

  await queryWithRetry(
    'INSERT INTO "dictionaries" ("id", "name", "userId", "createdAt", "updatedAt") VALUES ($1, $2, $3, $4, $5)',
    [id, name, userId, now, now],
  )

  return { id, name }
}

async function insertWordsBulk(dictionaryId: string, words: Required<ParsedWord>[]): Promise<number> {
  if (words.length === 0) return 0

  let inserted = 0
  for (const w of words) {
    const now = new Date()
    try {
      await queryWithRetry(
        'INSERT INTO "words" ("id", "english", "russian", "imageUrl", "example", "definition", "dictionaryId", "createdAt", "updatedAt") VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)',
        [uuidv4(), w.english, w.russian, w.imageUrl, w.example, w.definition, dictionaryId, now, now],
        20,
      )
    } catch (error) {
      if (!isDuplicatePrimaryKeyError(error)) {
        throw error
      }
    }
    inserted += 1
  }

  return inserted
}

async function fillMissingFieldsForUser(userId: string): Promise<{ scanned: number; updated: number }> {
  const batchSize = 60
  let scanned = 0
  let updated = 0

  while (true) {
    const wordsResult = await queryWithRetry<{
      id: string
      english: string
      russian: string
      definition: string | null
      example: string | null
      imageUrl: string | null
    }>(
      `SELECT w."id", w."english", w."russian", w."definition", w."example", w."imageUrl"
       FROM "words" w
       INNER JOIN "dictionaries" d ON d."id" = w."dictionaryId"
       WHERE d."userId" = $1
         AND (
           trim(coalesce(w."russian", '')) = ''
           OR trim(coalesce(w."definition", '')) = ''
           OR trim(coalesce(w."example", '')) = ''
           OR trim(coalesce(w."imageUrl", '')) = ''
         )
       LIMIT $2`,
      [userId, batchSize],
    )

    if (wordsResult.rows.length === 0) {
      break
    }

    scanned += wordsResult.rows.length

    for (const word of wordsResult.rows) {
      const english = word.english.trim()
      if (!english) continue

      const currentRussian = (word.russian ?? "").trim()
      const currentDefinition = (word.definition ?? "").trim()
      const currentExample = (word.example ?? "").trim()
      const currentImage = (word.imageUrl ?? "").trim()

      const russian = currentRussian || fallbackRussian(english)
      const definition = currentDefinition || fallbackDefinition(english, russian)
      const example = currentExample || fallbackExample(english)
      const imageUrl = currentImage || fallbackImageUrl(english)

      await queryWithRetry(
        'UPDATE "words" SET "russian" = $1, "definition" = $2, "example" = $3, "imageUrl" = $4, "updatedAt" = $5 WHERE "id" = $6',
        [russian, definition, example, imageUrl, new Date(), word.id],
      )

      updated += 1
    }
  }

  return { scanned, updated }
}

async function run() {
  const fileArg = getArg("--file") ?? "1.xlsx"
  const emailArg = getArg("--email")
  const dictionaryName = getArg("--dictionary") ?? "Импорт из Excel"
  const sheetArg = getArg("--sheet")
  const limitArg = getArg("--limit")
  const offsetArg = getArg("--offset")
  const skipFill = process.argv.includes("--skip-fill")

  const parsedLimit = limitArg ? Number(limitArg) : null
  const parsedOffset = offsetArg ? Number(offsetArg) : 0

  const limit = parsedLimit && Number.isFinite(parsedLimit) && parsedLimit > 0
    ? Math.floor(parsedLimit)
    : null
  const offset = Number.isFinite(parsedOffset) && parsedOffset > 0
    ? Math.floor(parsedOffset)
    : 0

  const absoluteFilePath = path.isAbsolute(fileArg)
    ? fileArg
    : path.join(process.cwd(), fileArg)

  await fs.access(absoluteFilePath)

  const workbook = XLSX.readFile(absoluteFilePath)
  const sheetName = sheetArg ?? workbook.SheetNames[0]
  if (!sheetName || !workbook.Sheets[sheetName]) {
    throw new Error("Cannot find target sheet")
  }

  const rows = XLSX.utils.sheet_to_json<RawRow>(workbook.Sheets[sheetName], {
    defval: "",
    raw: false,
    blankrows: false,
  })

  const parsedAll = parseRows(rows)
  const parsed = limit ? parsedAll.slice(offset, offset + limit) : parsedAll.slice(offset)

  if (parsed.length === 0) throw new Error("No valid rows found in sheet")

  const user = await resolveUser(emailArg)
  const dictionary = await getOrCreateDictionary(user.id, dictionaryName)

  const existing = await queryWithRetry<{ english: string; russian: string }>(
    'SELECT "english", "russian" FROM "words" WHERE "dictionaryId" = $1',
    [dictionary.id],
  )

  const existingSet = new Set(existing.rows.map((w) => `${w.english.toLowerCase()}::${w.russian.toLowerCase()}`))

  const newWords: Required<ParsedWord>[] = []
  let skipped = 0

  for (const row of parsed) {
    const w = enrichWord(row)
    const key = `${w.english.toLowerCase()}::${w.russian.toLowerCase()}`
    if (existingSet.has(key)) {
      skipped += 1
      continue
    }
    existingSet.add(key)
    newWords.push(w)
  }

  const inserted = await insertWordsBulk(dictionary.id, newWords)
  const fillStats = skipFill
    ? { scanned: 0, updated: 0 }
    : await fillMissingFieldsForUser(user.id)

  console.log(`User: ${user.email}`)
  console.log(`Dictionary: ${dictionary.name}`)
  console.log(`Read rows: ${rows.length}`)
  console.log(`Parsed unique words total: ${parsedAll.length}`)
  console.log(`Chunk offset: ${offset}`)
  console.log(`Chunk size requested: ${limit ?? parsedAll.length - offset}`)
  console.log(`Chunk words processed: ${parsed.length}`)
  console.log(`Inserted: ${inserted}`)
  console.log(`Skipped duplicates: ${skipped}`)
  if (skipFill) {
    console.log("Fill step: skipped")
  } else {
    console.log(`Words scanned for fill: ${fillStats.scanned}`)
    console.log(`Words updated with missing fields: ${fillStats.updated}`)
  }
}

run()
  .catch((error) => {
    console.error("Import failed:", error)
    process.exitCode = 1
  })
  .finally(async () => {
    await pool.end()
  })
