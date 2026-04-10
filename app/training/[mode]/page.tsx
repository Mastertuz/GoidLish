import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { auth } from '@/auth'
import { prisma } from '../../../lib/prisma'
import ModernTrainingMode from '@/components/shared/ModernTrainingMode'
import WordSelector from '@/components/shared/WordSelector'
import { Word } from '@/types'
import fs from 'fs/promises'
import path from 'path'

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

type TrainingMode = 'flashcard' | 'definition' | 'gapfill' | 'image'
type SelectedWord = Pick<Word, 'id' | 'english' | 'russian' | 'definition' | 'example' | 'imageUrl' | 'createdAt'>
type BackupWord = Pick<Word, 'english' | 'russian' | 'definition' | 'example' | 'imageUrl'>

const validModes: TrainingMode[] = ['flashcard', 'definition', 'gapfill', 'image']

const normalizeWordKeyPart = (value: unknown) =>
  typeof value === 'string' ? value.trim().toLowerCase() : ''

const getErrorMessage = (error: unknown) =>
  error instanceof Error ? error.message.toLowerCase() : ''

const isTransientConnectionError = (error: unknown) => {
  const message = getErrorMessage(error)
  return (
    message.includes('connection terminated unexpectedly') ||
    message.includes('server closed the connection') ||
    message.includes('terminating connection') ||
    message.includes('socket hang up')
  )
}

const isConnectionLimitError = (error: unknown) =>
  isTransientConnectionError(error) ||
  (typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (['P2037', 'P2024', 'P1017'] as const).includes((error as { code?: string }).code as 'P2037' | 'P2024' | 'P1017'))

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

const filterWordsByMode = (words: SelectedWord[]) => words

async function getBackupWordsForUser(userEmail?: string | null): Promise<SelectedWord[]> {
  if (!userEmail) {
    return []
  }

  try {
    const backupPath = path.join(process.cwd(), 'user-export.json')
    const raw = await fs.readFile(backupPath, 'utf8')
    const parsed = JSON.parse(raw) as {
      user?: { email?: string }
      dictionaries?: Array<{ words?: BackupWord[] }>
    }

    if (!parsed.user?.email || parsed.user.email.toLowerCase() !== userEmail.toLowerCase()) {
      return []
    }

    const backupWords = (parsed.dictionaries ?? []).flatMap((dictionary) => dictionary.words ?? [])

    return backupWords
      .filter((word) => typeof word.english === 'string' && typeof word.russian === 'string')
      .map((word, index) => ({
        id: `backup-${index + 1}`,
        english: word.english,
        russian: word.russian,
        definition: word.definition ?? null,
        example: word.example ?? null,
        imageUrl: word.imageUrl ?? null,
        createdAt: new Date(0),
      }))
  } catch {
    return []
  }
}

async function getUserWords(userId: string, userEmail: string | null | undefined, mode: TrainingMode, selectedWordIds: string[]): Promise<Word[]> {
  try {
    const selectedIdsSet = new Set(selectedWordIds)
    const shouldFilterBySelectedIds = selectedIdsSet.size > 0

    const maxAttempts = 3
    let words: SelectedWord[] = []
    let lastError: unknown = null

    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      try {
        const dictionaries = await prisma.dictionary.findMany({
          where: { userId },
          select: { id: true },
        })

        const dictionaryIds = dictionaries.map((dictionary) => dictionary.id)
        if (dictionaryIds.length === 0) {
          return []
        }

        // Двухшаговый запрос оказался стабильнее на текущем Postgres.
        const wordsResult = await prisma.word.findMany({
          where: {
            dictionaryId: { in: dictionaryIds },
            ...(shouldFilterBySelectedIds ? { id: { in: Array.from(selectedIdsSet) } } : {}),
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
        })
        words = wordsResult
        break
      } catch (error) {
        lastError = error
        if (!isConnectionLimitError(error) || attempt === maxAttempts) {
          break
        }
        await sleep(100 * attempt)
      }
    }

    if (words.length === 0 && lastError) {
      const backupWords = await getBackupWordsForUser(userEmail)
      words = backupWords
    }

    const filteredByMode = filterWordsByMode(words)

    return Array.from(
      new Map(
        filteredByMode.map((word) => [
          `${normalizeWordKeyPart(word.english)}||${normalizeWordKeyPart(word.russian)}`,
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

  // Валидация режима до обращения к БД
  if (!validModes.includes(mode as TrainingMode)) {
    redirect('/')
  }
  const validatedMode = mode as TrainingMode

  const selectedWordIds =
    resolvedSearchParams.words && resolvedSearchParams.setup !== 'true'
      ? resolvedSearchParams.words.split(',').filter(Boolean)
      : []
  
  // Проверяем авторизацию
  const session = await auth();
  
  if (!session?.user?.id) {
    redirect('/?auth=required');
  }

  const filteredWords = await getUserWords(session.user.id, session.user.email, validatedMode, selectedWordIds);

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