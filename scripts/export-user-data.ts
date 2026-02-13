import "dotenv/config"
import { PrismaClient } from "@prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"
import fs from "fs/promises"

const exportDatabaseUrl = process.env.EXPORT_DATABASE_URL ?? process.env.DATABASE_URL

if (!exportDatabaseUrl) {
  throw new Error("Set EXPORT_DATABASE_URL or DATABASE_URL to export user data")
}

const localPrisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: exportDatabaseUrl }),
})

async function exportUserData() {
  try {
    console.log('🔍 Поиск пользователя goida@goida.com в локальной базе...')
    
    // Найти пользователя
    const user = await localPrisma.user.findUnique({
      where: { email: "goida@goida.com" },
      include: {
        dictionaries: {
          include: {
            words: true
          }
        }
      }
    })

    if (!user) {
      console.log('❌ Пользователь goida@goida.com не найден в локальной базе')
      return
    }

    console.log(`✅ Найден пользователь: ${user.name || user.email}`)
    console.log(`📚 Количество словарей: ${user.dictionaries.length}`)
    
    let totalWords = 0
    user.dictionaries.forEach(dict => {
      totalWords += dict.words.length
      console.log(`📖 Словарь "${dict.name}": ${dict.words.length} слов`)
    })
    
    console.log(`📝 Общее количество слов: ${totalWords}`)

    // Подготовить данные для экспорта
    const exportData = {
      user: {
        email: user.email,
        name: user.name,
        password: user.password, // Хешированный пароль
        role: user.role
      },
      dictionaries: user.dictionaries.map(dict => ({
        name: dict.name,
        words: dict.words.map(word => ({
          english: word.english,
          russian: word.russian,
          definition: word.definition,
          example: word.example,
          imageUrl: word.imageUrl
        }))
      }))
    }

    // Сохранить в файл
    await fs.writeFile('user-export.json', JSON.stringify(exportData, null, 2))
    console.log('💾 Данные экспортированы в user-export.json')

    // Показать некоторые слова
    console.log('\n📋 Примеры слов:')
    user.dictionaries.forEach(dict => {
      dict.words.slice(0, 5).forEach(word => {
        console.log(`  • ${word.english} - ${word.russian}`)
      })
    })

  } catch (error) {
    console.error('❌ Ошибка при экспорте:', error)
  } finally {
    await localPrisma.$disconnect()
  }
}

exportUserData()