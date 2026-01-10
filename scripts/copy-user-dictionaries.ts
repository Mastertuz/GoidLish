import { PrismaClient } from "@prisma/client"

// Получаем DATABASE_URL из переменной окружения
const databaseUrl = process.env.DATABASE_URL

if (!databaseUrl) {
  console.error("❌ Ошибка: переменная окружения DATABASE_URL не установлена")
  console.error("")
  console.error("Как это исправить:")
  console.error("1. Откройте https://console.prisma.io")
  console.error("2. Найдите вашу базу данных GoidEng")
  console.error("3. Скопируйте CONNECTION_STRING (DATABASE_URL)")
  console.error("4. Запустите скрипт с переменной окружения:")
  console.error("")
  console.error('   DATABASE_URL="<ваш_postgresql_url>" npx tsx scripts/copy-user-dictionaries.ts')
  console.error("")
  process.exit(1)
}

console.log(`🗄️  Подключение к базе данных...`)

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: databaseUrl
    }
  }
})

async function copyUserDictionaries() {
  try {
    const sourceUserId = "cmiafbpse0000aiezw6kpkiko"
    const targetUserId = "cmk8q2ori000099e56j4kaufr"

    console.log(`🔍 Поиск пользователей...`)
    console.log(`   Исходный пользователь: ${sourceUserId}`)
    console.log(`   Целевой пользователь: ${targetUserId}`)

    // Получаем исходного пользователя со всеми его словарями и словами
    const sourceUser = await prisma.user.findUnique({
      where: { id: sourceUserId },
      include: {
        dictionaries: {
          include: {
            words: true
          }
        }
      }
    })

    if (!sourceUser) {
      console.log(`❌ Исходный пользователь не найден (ID: ${sourceUserId})`)
      process.exit(1)
    }

    // Получаем целевого пользователя
    const targetUser = await prisma.user.findUnique({
      where: { id: targetUserId }
    })

    if (!targetUser) {
      console.log(`❌ Целевой пользователь не найден (ID: ${targetUserId})`)
      process.exit(1)
    }

    console.log(`✅ Найден исходный пользователь: ${sourceUser.name || sourceUser.email}`)
    console.log(`   Словарей: ${sourceUser.dictionaries.length}`)

    let totalWords = 0
    sourceUser.dictionaries.forEach(dict => {
      totalWords += dict.words.length
      console.log(`   📖 "${dict.name}": ${dict.words.length} слов`)
    })
    console.log(`   📝 Всего слов: ${totalWords}`)

    console.log(`✅ Найден целевой пользователь: ${targetUser.name || targetUser.email}`)

    if (sourceUser.dictionaries.length === 0) {
      console.log(`⚠️  У исходного пользователя нет словарей для копирования`)
      process.exit(0)
    }

    console.log(`\n📋 Начинаем копирование словарей...\n`)

    let totalDictsCopied = 0
    let totalWordsCopied = 0

    // Копируем каждый словарь
    for (const sourceDictionary of sourceUser.dictionaries) {
      console.log(
        `📚 Копирование словаря: "${sourceDictionary.name}" (${sourceDictionary.words.length} слов)`
      )

      // Проверяем, существует ли уже такой словарь у целевого пользователя
      const existingDict = await prisma.dictionary.findFirst({
        where: {
          userId: targetUserId,
          name: sourceDictionary.name
        }
      })

      let targetDictionary
      if (existingDict) {
        console.log(`   ⚠️  Словарь с таким именем уже существует, используем его`)
        targetDictionary = existingDict
      } else {
        // Создаем новый словарь для целевого пользователя
        targetDictionary = await prisma.dictionary.create({
          data: {
            name: sourceDictionary.name,
            description: sourceDictionary.description,
            userId: targetUserId
          }
        })
        console.log(`   ✅ Создан новый словарь`)
        totalDictsCopied++
      }

      // Копируем все слова из исходного словаря в целевой
      let dictWordsCopied = 0
      let dictWordsSkipped = 0

      for (const word of sourceDictionary.words) {
        try {
          // Проверяем, существует ли уже такое слово
          const existingWord = await prisma.word.findFirst({
            where: {
              dictionaryId: targetDictionary.id,
              english: word.english,
              russian: word.russian
            }
          })

          if (existingWord) {
            dictWordsSkipped++
            continue
          }

          // Создаем копию слова
          await prisma.word.create({
            data: {
              english: word.english,
              russian: word.russian,
              definition: word.definition,
              example: word.example,
              imageUrl: word.imageUrl,
              dictionaryId: targetDictionary.id
            }
          })

          dictWordsCopied++
        } catch (error) {
          console.log(`   ❌ Ошибка при копировании слова "${word.english}":`, error)
        }
      }

      console.log(
        `   📊 Результат: скопировано ${dictWordsCopied}, пропущено ${dictWordsSkipped}`
      )
      totalWordsCopied += dictWordsCopied
    }

    console.log(`\n✅ Копирование завершено!`)
    console.log(`📊 Итоговая статистика:`)
    console.log(`   📚 Словарей скопировано: ${totalDictsCopied}`)
    console.log(`   📝 Слов скопировано: ${totalWordsCopied}`)
  } catch (error) {
    console.error("❌ Ошибка:", error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

copyUserDictionaries()
