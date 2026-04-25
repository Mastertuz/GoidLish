import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import TrainingClientLoader from '@/components/shared/TrainingClientLoader'

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

const validModes: TrainingMode[] = ['flashcard', 'definition', 'gapfill', 'image']

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

  return (
    <div className="min-h-screen w-full bg-linear-to-br from-gray-900 via-black to-gray-800">
      <Suspense fallback={
        <div className="flex items-center justify-center h-screen w-full">
          <div className="text-white text-lg">Загрузка тренировки...</div>
        </div>
      }>
        <TrainingClientLoader mode={validatedMode} searchParams={resolvedSearchParams} />
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