import "dotenv/config"
import { PrismaClient } from "@prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"
import fs from "fs/promises"

const importDatabaseUrl = process.env.IMPORT_DATABASE_URL ?? process.env.DATABASE_URL

if (!importDatabaseUrl) {
  throw new Error("Set IMPORT_DATABASE_URL or DATABASE_URL to import user data")
}

const prodPrisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: importDatabaseUrl }),
})

interface ExportWord {
  english: string
  russian?: string | null
  definition?: string | null
  example?: string | null
  imageUrl?: string | null
}

interface ExportDictionary {
  name: string
  words: ExportWord[]
}

interface ExportUser {
  email: string
  name?: string | null
  password?: string | null
  role?: string | null
}

interface UserExport {
  user: ExportUser
  dictionaries: ExportDictionary[]
}

async function importUserData() {
  try {
    console.log('📖 Чтение данных из user-export.json...')
    
    const data = JSON.parse(await fs.readFile('user-export.json', 'utf8')) as UserExport
    
    console.log(`👤 Импорт пользователя: ${data.user.email}`)
    console.log(`📚 Словарей: ${data.dictionaries.length}`)
    
    let totalWords = 0
    data.dictionaries.forEach((dict) => {
      totalWords += dict.words.length
    })
    console.log(`📝 Всего слов: ${totalWords}`)

    // Проверить существует ли пользователь
    const existingUser = await prodPrisma.user.findUnique({
      where: { email: data.user.email }
    })

    let user
    if (existingUser) {
      console.log('ℹ️ Пользователь уже существует, обновляем данные...')
      user = existingUser
    } else {
      console.log('➕ Создаем нового пользователя...')
      user = await prodPrisma.user.create({
        data: {
          email: data.user.email,
          name: data.user.name,
          password: data.user.password,
          role: data.user.role || 'user'
        }
      })
    }

    // Импорт словарей и слов
    for (const dictData of data.dictionaries) {
      console.log(`📖 Создаем словарь: ${dictData.name}`)
      
      // Проверить существует ли словарь
      let dictionary = await prodPrisma.dictionary.findFirst({
        where: {
          userId: user.id,
          name: dictData.name
        }
      })

      if (!dictionary) {
        dictionary = await prodPrisma.dictionary.create({
          data: {
            name: dictData.name,
            userId: user.id
          }
        })
      }

      // Импорт слов
      for (const wordData of dictData.words) {
        // Проверить существует ли слово
        const existingWord = await prodPrisma.word.findFirst({
          where: {
            dictionaryId: dictionary.id,
            english: wordData.english
          }
        })

        if (!existingWord) {
          await prodPrisma.word.create({
            data: {
              english: wordData.english,
              russian: wordData.russian,
              definition: wordData.definition,
              example: wordData.example,
              imageUrl: wordData.imageUrl,
              dictionaryId: dictionary.id
            }
          })
          console.log(`  ✅ Добавлено: ${wordData.english} - ${wordData.russian}`)
        } else {
          console.log(`  ⏭️ Уже существует: ${wordData.english}`)
        }
      }
    }

    console.log('\n🎉 Импорт завершен успешно!')

  } catch (error) {
    console.error('❌ Ошибка при импорте:', error)
  } finally {
    await prodPrisma.$disconnect()
  }
}

importUserData()
