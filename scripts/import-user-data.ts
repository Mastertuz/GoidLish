import { PrismaClient } from "@prisma/client"
import { withAccelerate } from "@prisma/extension-accelerate"
import fs from "fs/promises"

// Продакшен PostgreSQL база с Accelerate
const prodPrisma = new PrismaClient({
  datasources: {
    db: {
      url: "prisma+postgres://accelerate.prisma-data.net/?api_key=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqd3RfaWQiOjEsInNlY3VyZV9rZXkiOiJza19NRFpZUEs2MjNNeWhlaWJOclNIbmIiLCJhcGlfa2V5IjoiMDFLOVQ3Qk04WENTREtYWURDSkowU1k1SEYiLCJ0ZW5hbnRfaWQiOiI2NmMwYWQ1MTI5MjcxZDBhMGJmM2ViMmU0MjE3Y2EzOTNmOTM3YTExZGRmOTFiMTJkMzAxZTE1YzUwMGJhZTcwIiwiaW50ZXJuYWxfc2VjcmV0IjoiNjIzNjk0MmYtMWZkMy00NzY3LWE4NzYtMGMxMmFhMTVkNGUxIn0.Mdyc0M-uv8xeEjt0JXFB8GCM-uHwdIZ-ggrvF7RTDgw"
    }
  }
}).$extends(withAccelerate())

async function importUserData() {
  try {
    console.log('📖 Чтение данных из user-export.json...')
    
    const data = JSON.parse(await fs.readFile('user-export.json', 'utf8'))
    
    console.log(`👤 Импорт пользователя: ${data.user.email}`)
    console.log(`📚 Словарей: ${data.dictionaries.length}`)
    
    let totalWords = 0
    data.dictionaries.forEach((dict: any) => {
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