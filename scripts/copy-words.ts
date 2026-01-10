import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

async function copyWords() {
  try {
    // Получаем аргументы из командной строки
    const sourceDictionaryId = process.argv[2]
    const targetDictionaryId = process.argv[3]

    // Валидация аргументов
    if (!sourceDictionaryId || !targetDictionaryId) {
      console.log(
        "❌ Требуются оба аргумента: исходный и целевой ID словаря"
      )
      console.log(
        "Использование: npx tsx scripts/copy-words.ts <SOURCE_DICT_ID> <TARGET_DICT_ID>"
      )
      process.exit(1)
    }

    if (sourceDictionaryId === targetDictionaryId) {
      console.log(
        "❌ Исходный и целевой словари не могут быть одинаковыми"
      )
      process.exit(1)
    }

    console.log(`🔍 Поиск словарей...`)
    console.log(`   Исходный: ${sourceDictionaryId}`)
    console.log(`   Целевой: ${targetDictionaryId}`)

    // Получаем исходный словарь с его словами
    const sourceDictionary = await prisma.dictionary.findUnique({
      where: { id: sourceDictionaryId },
      include: {
        words: true,
        user: {
          select: { email: true, name: true }
        }
      }
    })

    if (!sourceDictionary) {
      console.log(`❌ Исходный словарь не найден (ID: ${sourceDictionaryId})`)
      process.exit(1)
    }

    // Получаем целевой словарь
    const targetDictionary = await prisma.dictionary.findUnique({
      where: { id: targetDictionaryId },
      include: {
        user: {
          select: { email: true, name: true }
        }
      }
    })

    if (!targetDictionary) {
      console.log(`❌ Целевой словарь не найден (ID: ${targetDictionaryId})`)
      process.exit(1)
    }

    console.log(
      `✅ Найден исходный словарь: "${sourceDictionary.name}" (${sourceDictionary.words.length} слов)`
    )
    console.log(
      `   Владелец: ${sourceDictionary.user?.name || sourceDictionary.user?.email}`
    )
    console.log(
      `✅ Найден целевой словарь: "${targetDictionary.name}"`
    )
    console.log(
      `   Владелец: ${targetDictionary.user?.name || targetDictionary.user?.email}`
    )

    if (sourceDictionary.words.length === 0) {
      console.log(`⚠️  В исходном словаре нет слов для копирования`)
      process.exit(0)
    }

    // Копируем слова
    console.log(`\n📋 Копирование слов...`)

    let copiedCount = 0
    let skippedCount = 0

    for (const word of sourceDictionary.words) {
      try {
        // Проверяем, существует ли уже такое слово в целевом словаре
        const existingWord = await prisma.word.findFirst({
          where: {
            dictionaryId: targetDictionaryId,
            english: word.english,
            russian: word.russian
          }
        })

        if (existingWord) {
          console.log(
            `  ⏭️  Пропущено: "${word.english}" - уже существует в целевом словаре`
          )
          skippedCount++
          continue
        }

        // Создаем копию слова в целевом словаре
        await prisma.word.create({
          data: {
            english: word.english,
            russian: word.russian,
            definition: word.definition,
            example: word.example,
            imageUrl: word.imageUrl,
            dictionaryId: targetDictionaryId
          }
        })

        console.log(`  ✅ Скопировано: "${word.english}"`)
        copiedCount++
      } catch (error) {
        console.log(`  ❌ Ошибка при копировании "${word.english}":`, error)
      }
    }

    console.log(`\n📊 Результат:`)
    console.log(`  ✅ Успешно скопировано: ${copiedCount} слов`)
    console.log(`  ⏭️  Пропущено (дубликаты): ${skippedCount} слов`)
    console.log(`  📝 Всего обработано: ${copiedCount + skippedCount} слов`)
  } catch (error) {
    console.error("❌ Ошибка:", error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

copyWords()
