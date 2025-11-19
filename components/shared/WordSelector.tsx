"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Play, CheckSquare, Square } from "lucide-react";
import { Word } from "@/types";

interface WordSelectorProps {
  mode: string;
  words: Word[];
}

const modeNames = {
  flashcard: 'Карточки',
  definition: 'Определения',
  gapfill: 'Заполни пропуски',
  image: 'Картинки'
};

export default function WordSelector({ mode, words }: WordSelectorProps) {
  const [selectedWords, setSelectedWords] = useState<string[]>(words.map(word => word.id));
  const [selectAll, setSelectAll] = useState(true);
  const router = useRouter();

  const toggleWord = (wordId: string) => {
    setSelectedWords(prev => 
      prev.includes(wordId) 
        ? prev.filter(id => id !== wordId)
        : [...prev, wordId]
    );
  };

  const toggleSelectAll = () => {
    if (selectAll) {
      setSelectedWords([]);
    } else {
      setSelectedWords(words.map(word => word.id));
    }
    setSelectAll(!selectAll);
  };

  const handleStart = () => {
    // Создаем URL с выбранными словами
    const wordIds = selectedWords.join(',');
    const params = new URLSearchParams();
    params.set('words', wordIds);
    
    // Переходим к тренировке без setup параметра
    router.push(`/training/${mode}?${params.toString()}`);
  };

  return (
    <div className="h-screen w-full bg-linear-to-br from-slate-950 via-slate-900 to-slate-950 overflow-y-auto">
      <div className="min-h-full flex flex-col justify-center p-4">
        <div className="w-full max-w-4xl mx-auto">
          {/* Заголовок */}
          <div className="text-center mb-8">
            <div className="flex justify-between items-center mb-6">
              <Link href="/">
                <Button variant="outline" size="sm" className="border-slate-600 text-slate-300 hover:bg-slate-700">
                  <ArrowLeft className="w-4 h-4 mr-1" />
                  Назад
                </Button>
              </Link>
              <h1 className="text-3xl font-bold text-white">
                Выбор слов для тренировки
              </h1>
              <div className="w-20"></div>
            </div>
            <p className="text-slate-400 text-lg mb-4">
              Режим: {modeNames[mode as keyof typeof modeNames]}
            </p>
            <p className="text-slate-500 text-sm">
              Выберите слова, которые хотите тренировать
            </p>
          </div>

          <Card className="bg-slate-800 border-slate-700 shadow-2xl">
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle className="text-xl text-white">
                  Доступные слова ({words.length})
                </CardTitle>
                <div className="flex items-center space-x-4">
                  <Button
                    onClick={toggleSelectAll}
                    variant="outline"
                    size="sm"
                    className="border-slate-600 text-slate-300 hover:bg-slate-700"
                  >
                    {selectAll ? (
                      <>
                        <Square className="w-4 h-4 mr-2" />
                        Снять все
                      </>
                    ) : (
                      <>
                        <CheckSquare className="w-4 h-4 mr-2" />
                        Выбрать все
                      </>
                    )}
                  </Button>
                  <span className="text-slate-400 text-sm">
                    Выбрано: {selectedWords.length}
                  </span>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {/* Список слов */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6 max-h-96 overflow-y-auto">
                {words.map((word) => (
                  <div 
                    key={word.id} 
                    className={`p-4 rounded-lg border cursor-pointer transition-all duration-200 ${
                      selectedWords.includes(word.id)
                        ? 'bg-blue-500/20 border-blue-500/50'
                        : 'bg-slate-900/50 border-slate-700 hover:bg-slate-900/80'
                    }`}
                    onClick={() => toggleWord(word.id)}
                  >
                    <div className="flex items-start space-x-3">
                      <input
                        type="checkbox"
                        checked={selectedWords.includes(word.id)}
                        onChange={() => toggleWord(word.id)}
                        className="mt-1 w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start mb-1">
                          <span className="font-medium text-white text-sm">
                            {word.english}
                          </span>
                        </div>
                        <span className="text-slate-400 text-xs">
                          {word.russian}
                        </span>
                        {mode === 'definition' && word.definition && (
                          <p className="text-slate-500 text-xs mt-1 line-clamp-2">
                            {word.definition}
                          </p>
                        )}
                        {mode === 'gapfill' && word.example && (
                          <p className="text-slate-500 text-xs mt-1 line-clamp-2">
                            {word.example}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Кнопка запуска */}
              <div className="flex justify-center pt-4 border-t border-slate-700">
                <Button
                  onClick={handleStart}
                  disabled={selectedWords.length === 0}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Play className="w-4 h-4 mr-2" />
                  Начать тренировку ({selectedWords.length} {selectedWords.length === 1 ? 'слово' : selectedWords.length < 5 ? 'слова' : 'слов'})
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}