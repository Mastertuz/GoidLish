import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { auth } from '@/auth'
import { prisma } from '../../../lib/prisma'
import ModernTrainingMode from '@/components/shared/ModernTrainingMode'
import WordSelector from '@/components/shared/WordSelector'
import { Word } from '@/types'

interface TrainingPageProps {
  params: Promise<{ mode: string }>
  searchParams: Promise<{
    direction?: string
    currentIndex?: string
    answers?: string
    words?: string
    setup?: string
  }>
}

async function getUserWords(userId: string): Promise<Word[]> {
  try {
    // Получаем слова из всех словарей пользователя
    const words = await prisma.word.findMany({
      where: {
        dictionary: {
          userId,
        },
      },
      select: {
        id: true,
        english: true,
        russian: true,
        definition: true,
        example: true,
        imageUrl: true,
        createdAt: true
      },
      orderBy: { createdAt: 'desc' }
    });

    return Array.from(
      new Map(
        words.map((word) => [
          `${word.english.trim().toLowerCase()}||${word.russian.trim().toLowerCase()}`,
          word,
        ])
      ).values()
    );
  } catch (error) {
    console.error('Database error:', error)
    return []
  }
}

export default async function TrainingPage({
  params,
  searchParams
}: TrainingPageProps) {
  const resolvedParams = await params
  const resolvedSearchParams = await searchParams
  
  const mode = resolvedParams.mode
  
  // Проверяем авторизацию
  const session = await auth();
  
  if (!session?.user?.id) {
    redirect('/?auth=required');
  }

  const words = await getUserWords(session.user.id);

  // Валидация режима
  if (!['flashcard', 'definition', 'gapfill', 'image'].includes(mode)) {
    redirect('/')
  }

  // Фильтрация слов в зависимости от режима
  let filteredWords = words
  if (mode === 'definition') {
    filteredWords = words.filter((word: Word) => word.definition && word.definition.trim())
  } else if (mode === 'gapfill') {
    filteredWords = words.filter((word: Word) => word.example && word.example.trim())
  } else if (mode === 'image') {
    filteredWords = words.filter((word: Word) => word.imageUrl && word.imageUrl.trim())
  }

  // Если есть параметр words, фильтруем только выбранные слова
  if (resolvedSearchParams.words && resolvedSearchParams.setup !== 'true') {
    const selectedWordIds = resolvedSearchParams.words.split(',');
    filteredWords = filteredWords.filter((word: Word) => selectedWordIds.includes(word.id));
  }

  return (
    <div className="min-h-screen w-full bg-linear-to-br from-gray-900 via-black to-gray-800">
      <Suspense fallback={
        <div className="flex items-center justify-center h-screen w-full">
          <div className="text-white text-lg">Загрузка тренировки...</div>
        </div>
      }>
        {resolvedSearchParams.setup === 'true' ? (
          <WordSelector
            mode={mode}
            words={filteredWords}
          />
        ) : (
          <ModernTrainingMode
            mode={mode}
            words={filteredWords}
            searchParams={resolvedSearchParams}
          />
        )}
      </Suspense>
    </div>
  )
}

export async function generateMetadata({ params }: { params: Promise<{ mode: string }> }) {
  const resolvedParams = await params
  const modeNames = {
    flashcard: 'Карточки',
    definition: 'Определения',
    gapfill: 'Заполни пропуски',
    image: 'Картинки'
  }
  
  return {
    title: `Тренировка: ${modeNames[resolvedParams.mode as keyof typeof modeNames] || 'Обучение'}`
  }
}