'use client'

import React from 'react'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { Home } from 'lucide-react'
import { Word } from '@/types'

interface FlashcardModeProps {
  words: Word[]
}

export default function FlashcardMode({ words }: FlashcardModeProps) {
  return (
    <div className="min-h-screen bg-linear-to-br from-blue-50 to-purple-50 p-4">
      <div className="max-w-2xl mx-auto text-center pt-20">
        <h1 className="text-3xl font-bold text-gray-800 mb-4">Флэшкарты</h1>
        <p className="text-lg text-gray-600 mb-8">
          Режим флэшкарт временно недоступен.
        </p>
        <div className="space-y-4">
          <p className="text-gray-600">Найдено слов: {words.length}</p>
          <Link href="/training">
            <Button variant="outline">
              <Home className="w-4 h-4 mr-2" />
              К режимам тренировки
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
}