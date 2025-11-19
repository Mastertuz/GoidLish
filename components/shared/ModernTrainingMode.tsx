"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { Home, BookOpen, ArrowLeft, ArrowRight, Volume2, RotateCcw, Trophy } from "lucide-react";
import { Word } from "@/types";

interface ModernTrainingModeProps {
  mode: string;
  words: Word[];
  searchParams: {
    direction?: string;
    currentIndex?: string;
    answers?: string;
    words?: string;
    setup?: string;
  };
}

interface Answer {
  wordId: string;
  userAnswer: string;
  correctAnswer: string;
  isCorrect: boolean;
}

const modeNames = {
  flashcard: 'Карточки',
  definition: 'Определения',
  gapfill: 'Заполни пропуски',
  image: 'Картинки'
};

const modeDescriptions = {
  flashcard: 'Изучайте слова с помощью карточек',
  definition: 'Угадывайте слова по их определениям',
  gapfill: 'Заполняйте пропуски в предложениях',
  image: 'Изучайте слова с помощью изображений'
};

export default function ModernTrainingMode({ mode, words, searchParams }: ModernTrainingModeProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userAnswer, setUserAnswer] = useState("");
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [isCompleted, setIsCompleted] = useState(false);
  const [showResult, setShowResult] = useState(false);

  // Если нет слов для выбранного режима
  if (!words || words.length === 0) {
    let emptyMessage = "В вашем словаре нет слов для этого режима тренировки.";
    
    if (mode === 'definition') {
      emptyMessage = "Для режима 'Определения' нужны слова с заполненным полем 'Определение'.";
    } else if (mode === 'gapfill') {
      emptyMessage = "Для режима 'Заполни пропуски' нужны слова с примерами предложений.";
    } else if (mode === 'image') {
      emptyMessage = "Для режима 'Картинки' нужны слова с загруженными изображениями.";
    } else {
      emptyMessage = "В вашем словаре нет слов для тренировки.";
    }

    return (
      <div className="min-h-screen bg-linear-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <Card className="bg-slate-800 border-slate-700 text-white shadow-2xl">
            <CardHeader className="text-center pb-4">
              <div className="mx-auto mb-6 w-16 h-16 bg-orange-500/20 rounded-full flex items-center justify-center">
                <BookOpen className="w-8 h-8 text-orange-400" />
              </div>
              <CardTitle className="text-2xl text-slate-100 mb-2">
                {modeNames[mode as keyof typeof modeNames] || 'Тренировка'}
              </CardTitle>
              <p className="text-slate-400 text-sm">
                {modeDescriptions[mode as keyof typeof modeDescriptions]}
              </p>
            </CardHeader>
            <CardContent className="text-center space-y-6 pt-2">
              <div className="bg-slate-900/50 rounded-lg p-4 border border-slate-700">
                <p className="text-slate-300 text-sm leading-relaxed mb-3">
                  {emptyMessage}
                </p>
                <p className="text-slate-500 text-xs">
                  Добавьте слова в свой словарь, чтобы начать тренировку.
                </p>
              </div>
              <div className="flex flex-col gap-3 pt-2">
                <Link href="/">
                  <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 transition-colors">
                    <Home className="w-4 h-4 mr-2" />
                    Перейти к словарю
                  </Button>
                </Link>
                <Link href="/">
                  <Button variant="outline" className="w-full border-slate-600 text-slate-300 hover:bg-slate-700 hover:text-white transition-colors">
                    Вернуться на главную
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Если нет слов для выбранного режима
  if (!words || words.length === 0) {
    let emptyMessage = "В вашем словаре нет слов для этого режима тренировки.";
    
    if (mode === 'definition') {
      emptyMessage = "Для режима 'Определения' нужны слова с заполненным полем 'Определение'.";
    } else if (mode === 'gapfill') {
      emptyMessage = "Для режима 'Заполни пропуски' нужны слова с примерами предложений.";
    } else if (mode === 'image') {
      emptyMessage = "Для режима 'Картинки' нужны слова с загруженными изображениями.";
    } else {
      emptyMessage = "В вашем словаре нет слов для тренировки.";
    }

    return (
      <div className="min-h-screen bg-linear-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <Card className="bg-slate-800 border-slate-700 text-white shadow-2xl">
            <CardHeader className="text-center pb-4">
              <div className="mx-auto mb-6 w-16 h-16 bg-orange-500/20 rounded-full flex items-center justify-center">
                <BookOpen className="w-8 h-8 text-orange-400" />
              </div>
              <CardTitle className="text-2xl text-slate-100 mb-2">
                {modeNames[mode as keyof typeof modeNames] || 'Тренировка'}
              </CardTitle>
              <p className="text-slate-400 text-sm">
                {modeDescriptions[mode as keyof typeof modeDescriptions]}
              </p>
            </CardHeader>
            <CardContent className="text-center space-y-6 pt-2">
              <div className="bg-slate-900/50 rounded-lg p-4 border border-slate-700">
                <p className="text-slate-300 text-sm leading-relaxed mb-3">
                  {emptyMessage}
                </p>
                <p className="text-slate-500 text-xs">
                  Добавьте слова в свой словарь, чтобы начать тренировку.
                </p>
              </div>
              <div className="flex flex-col gap-3 pt-2">
                <Link href="/">
                  <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 transition-colors">
                    <Home className="w-4 h-4 mr-2" />
                    Перейти к словарю
                  </Button>
                </Link>
                <Link href="/">
                  <Button variant="outline" className="w-full border-slate-600 text-slate-300 hover:bg-slate-700 hover:text-white transition-colors">
                    Вернуться на главную
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const currentWord = words[currentIndex];

  // Генерация вопроса в зависимости от режима
  const getQuestion = () => {
    switch (mode) {
      case 'definition':
        return currentWord.definition || 'Определение не найдено';
      case 'gapfill':
        // Создаем предложение с пропуском (заменяем английское слово на _____)
        if (currentWord.example) {
          return currentWord.example.replace(new RegExp(currentWord.english, 'gi'), '_____');
        }
        return 'Пример предложения не найден';
      case 'image':
        return currentWord.imageUrl || '';
      case 'flashcard':
      default:
        return currentWord.english;
    }
  };

  // Получение правильного ответа в зависимости от режима
  const getCorrectAnswer = () => {
    switch (mode) {
      case 'definition':
      case 'gapfill':
        return currentWord.english; // В режимах definition и gapfill отгадываем английское слово
      case 'image':
        return currentWord.english; // В режиме image тоже отгадываем английское слово
      case 'flashcard':
      default:
        return currentWord.russian; // В режиме flashcard переводим на русский
    }
  };

  // Получение плейсхолдера для поля ввода
  const getPlaceholder = () => {
    switch (mode) {
      case 'definition':
        return 'Введите английское слово...';
      case 'gapfill':
        return 'Введите пропущенное слово...';
      case 'image':
        return 'Введите английское слово...';
      case 'flashcard':
      default:
        return 'Введите перевод слова...';
    }
  };

  // Функция для озвучивания слова
  const speakWord = (text: string) => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'en-US';
      utterance.rate = 0.8;
      speechSynthesis.speak(utterance);
    }
  };

  // Проверка ответа
  const checkAnswer = () => {
    if (!userAnswer.trim()) return;

    const correctAnswer = getCorrectAnswer();
    const isCorrect = userAnswer.toLowerCase().trim() === correctAnswer.toLowerCase().trim();
    const answer: Answer = {
      wordId: currentWord.id,
      userAnswer: userAnswer,
      correctAnswer: correctAnswer,
      isCorrect
    };

    setAnswers([...answers, answer]);
    setShowResult(true);
  };

  // Переход к следующему слову
  const nextWord = () => {
    setShowResult(false);
    setUserAnswer("");
    
    if (currentIndex + 1 >= words.length) {
      setIsCompleted(true);
    } else {
      setCurrentIndex(currentIndex + 1);
    }
  };

  // Начать заново
  const restart = () => {
    setCurrentIndex(0);
    setUserAnswer("");
    setAnswers([]);
    setIsCompleted(false);
    setShowResult(false);
  };

  // Показ статистики
  if (isCompleted) {
    const correctAnswers = answers.filter(a => a.isCorrect).length;
    const percentage = Math.round((correctAnswers / answers.length) * 100);
    
    return (
      <div className="h-screen bg-linear-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center p-4">
        <div className="w-full max-w-2xl mx-auto">
          <Card className="bg-slate-800 border-slate-700 text-white shadow-2xl">
              <CardHeader className="text-center pb-4">
                <div className="mx-auto mb-6 w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center">
                  <Trophy className="w-10 h-10 text-green-400" />
                </div>
                <CardTitle className="text-3xl text-slate-100 mb-2">
                  Тренировка завершена!
                </CardTitle>
                <p className="text-slate-400">
                  Вы правильно ответили на {correctAnswers} из {answers.length} вопросов ({percentage}%)
                </p>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Результаты по каждому слову */}
                <div className="space-y-3 max-h-60 overflow-y-auto">
                  {answers.map((answer, index) => (
                    <div key={answer.wordId} className="flex items-center justify-between bg-slate-900/50 rounded-lg p-3 border border-slate-700">
                      <div className="flex items-center space-x-3">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center ${answer.isCorrect ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                          {index + 1}
                        </div>
                        <div>
                          <p className="text-slate-200 font-medium">{words[index].english}</p>
                          <p className="text-slate-400 text-sm">
                            {answer.isCorrect ? answer.userAnswer : `${answer.userAnswer} → ${answer.correctAnswer}`}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        {answer.isCorrect ? (
                          <span className="text-green-400 text-sm">✓</span>
                        ) : (
                          <span className="text-red-400 text-sm">✗</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                
                <div className="flex flex-col sm:flex-row gap-3 pt-4">
                  <Button onClick={restart} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white">
                    <RotateCcw className="w-4 h-4 mr-2" />
                    Начать заново
                  </Button>
                  <Link href="/" className="flex-1">
                    <Button variant="outline" className="w-full border-slate-600 text-slate-300 hover:bg-slate-700 hover:text-white">
                      <Home className="w-4 h-4 mr-2" />
                      На главную
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-full bg-linear-to-br from-slate-950 via-slate-900 to-slate-950 overflow-hidden">
      <div className="h-full w-full flex flex-col justify-center px-4">
        <div className="w-full max-w-2xl mx-auto">
          {/* Прогресс */}
          <div className="text-center mb-6">
            <div className="flex justify-between items-center mb-4">
              <Link href="/">
                <Button variant="outline" size="sm" className="border-slate-600 text-slate-300 hover:bg-slate-700">
                  <ArrowLeft className="w-4 h-4 mr-1" />
                  Назад
                </Button>
              </Link>
              <h1 className="text-2xl font-bold text-white">
                {modeNames[mode as keyof typeof modeNames]}
              </h1>
              <div className="w-20"></div>
            </div>
            <div className="bg-slate-800 rounded-full h-2 mb-2">
              <div 
                className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${((currentIndex + 1) / words.length) * 100}%` }}
              ></div>
            </div>
            <p className="text-slate-400 text-sm">
              Слово {currentIndex + 1} из {words.length}
            </p>
          </div>

          {/* Карточка со словом */}
          <Card className="bg-slate-800 border-slate-700 shadow-2xl">
            <CardContent className="p-6 text-center">
              <div className="mb-4">
                {mode === 'image' && currentWord.imageUrl ? (
                  <div className="mb-4">
                    <img 
                      src={currentWord.imageUrl} 
                      alt="Word image" 
                      className="max-w-full h-64 object-contain mx-auto rounded-lg"
                    />
                  </div>
                ) : (
                  <div className="text-4xl md:text-5xl font-bold text-white mb-4">
                    {getQuestion()}
                  </div>
                )}
                {mode === 'flashcard' && (
                  <Button
                    onClick={() => speakWord(currentWord.english)}
                    variant="outline"
                    size="sm"
                    className="border-slate-600 text-slate-300 hover:bg-slate-700"
                  >
                    <Volume2 className="w-4 h-4 mr-2" />
                    Озвучить
                  </Button>
                )}
              </div>

              {/* Поле для ввода ответа */}
              {!showResult && (
                <div className="space-y-4">
                  <Input
                    type="text"
                    placeholder={getPlaceholder()}
                    value={userAnswer}
                    onChange={(e) => setUserAnswer(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && checkAnswer()}
                    className="text-lg p-3 bg-slate-900 border-slate-600 text-white text-center"
                    autoFocus
                  />
                  <Button 
                    onClick={checkAnswer}
                    disabled={!userAnswer.trim()}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2.5"
                  >
                    Проверить
                  </Button>
                </div>
              )}

              {/* Результат */}
              {showResult && (
                <div className="space-y-4">
                  <div className={`p-4 rounded-lg border ${
                    answers[answers.length - 1]?.isCorrect 
                      ? 'bg-green-500/10 border-green-500/30 text-green-400'
                      : 'bg-red-500/10 border-red-500/30 text-red-400'
                  }`}>
                    <p className="text-lg font-medium mb-2">
                      {answers[answers.length - 1]?.isCorrect ? 'Правильно!' : 'Неправильно'}
                    </p>
                    <p className="text-white">
                      Правильный ответ: <strong>{getCorrectAnswer()}</strong>
                    </p>
                    {mode === 'flashcard' && currentWord.definition && (
                      <p className="text-slate-300 text-sm mt-2">
                        {currentWord.definition}
                      </p>
                    )}
                    {(mode === 'definition' || mode === 'gapfill' || mode === 'image') && (
                      <p className="text-slate-300 text-sm mt-2">
                        Перевод: {currentWord.russian}
                      </p>
                    )}
                  </div>
                  <Button 
                    onClick={nextWord}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3"
                  >
                    {currentIndex + 1 >= words.length ? 'Завершить тренировку' : 'Следующее слово'}
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}