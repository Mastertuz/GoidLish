import "dotenv/config"
import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

async function main() {
  const totalWords = await prisma.word.count()
  const dictionaries = await prisma.dictionary.findMany({
    select: {
      id: true,
      name: true,
      userId: true,
      _count: { select: { words: true } },
    },
    orderBy: { createdAt: "asc" },
  })

  console.log("totalWords:", totalWords)
  console.log(JSON.stringify(dictionaries, null, 2))
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
