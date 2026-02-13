import "dotenv/config"
import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

async function main() {
  const dryRun = process.argv.includes("--dry-run")
  const userArg = process.argv.slice(2).find((arg) => !arg.startsWith("--"))
  const userId = userArg || "cmk8q2ori000099e56j4kaufr"

  const words = await prisma.word.findMany({
    where: { dictionary: { userId } },
    select: {
      id: true,
      english: true,
      russian: true,
      createdAt: true,
      dictionaryId: true,
    },
    orderBy: { createdAt: "asc" },
  })

  if (words.length === 0) {
    console.log("Слова не найдены")
    return
  }

  const groups = new Map<string, typeof words>()

  for (const word of words) {
    const key = `${word.english.trim().toLowerCase()}||${word.russian
      .trim()
      .toLowerCase()}`

    if (!groups.has(key)) groups.set(key, [])
    groups.get(key)!.push(word)
  }

  const idsToDelete: string[] = []

  for (const arr of groups.values()) {
    if (arr.length > 1) {
      const [, ...duplicates] = arr
      idsToDelete.push(...duplicates.map((d) => d.id))
    }
  }

  console.log(`Пользователь: ${userId}`)
  console.log(`Всего слов: ${words.length}`)
  console.log(`Уникальных пар english+russian: ${groups.size}`)
  console.log(`Дублей к удалению: ${idsToDelete.length}`)

  if (idsToDelete.length === 0) {
    console.log("Дубликатов нет")
    return
  }

  if (dryRun) {
    console.log("DRY RUN: удаление не выполнялось")
    return
  }

  const result = await prisma.word.deleteMany({
    where: { id: { in: idsToDelete } },
  })

  console.log(`Удалено дублей: ${result.count}`)

  const finalCount = await prisma.word.count({
    where: { dictionary: { userId } },
  })

  console.log(`Итоговое количество слов: ${finalCount}`)
}

main()
  .catch((e) => {
    console.error("Ошибка:", e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
