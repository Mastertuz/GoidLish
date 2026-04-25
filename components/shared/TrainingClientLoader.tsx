"use client";

import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import ModernTrainingMode from "@/components/shared/ModernTrainingMode";
import WordSelector from "@/components/shared/WordSelector";
import { Word } from "@/types";

type TrainingMode = "flashcard" | "definition" | "gapfill" | "image";

interface TrainingClientLoaderProps {
  mode: TrainingMode;
  searchParams: {
    direction?: string;
    currentIndex?: string;
    answers?: string;
    words?: string;
    setup?: string;
  };
}

const filterWordsByMode = (words: Word[], mode: TrainingMode) => {
  if (mode === "definition") {
    return words.filter((word) => Boolean(word.definition?.trim()));
  }

  if (mode === "gapfill") {
    return words.filter((word) => Boolean(word.example?.trim()));
  }

  if (mode === "image") {
    return words.filter((word) => Boolean(word.imageUrl?.trim()));
  }

  return words;
};

const dedupeWords = (words: Word[]) => {
  const uniqueByKey = new Map<string, Word>();

  for (const word of words) {
    const englishKey = word.english.trim().toLowerCase();
    const fallbackKey = `${englishKey}::${word.russian.trim().toLowerCase()}`;
    const key = englishKey || word.id?.trim() || fallbackKey;

    if (!uniqueByKey.has(key)) {
      uniqueByKey.set(key, word);
    }
  }

  return Array.from(uniqueByKey.values());
};

export default function TrainingClientLoader({ mode, searchParams }: TrainingClientLoaderProps) {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [words, setWords] = useState<Word[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/?auth=required");
      return;
    }

    if (status !== "authenticated" || !session?.user?.id) {
      return;
    }

    const cacheKey = `dictionary-cache:${session.user.id}`;

    const cachedWords = localStorage.getItem(cacheKey);
    if (cachedWords) {
      try {
        const parsed = JSON.parse(cachedWords) as Word[];
        if (Array.isArray(parsed) && parsed.length > 0) {
          setWords(parsed);
          setIsLoading(false);
        }
      } catch {
        // Ignore malformed cache and continue with network fetch.
      }
    }

    const loadWords = async () => {
      try {
        const response = await fetch("/api/user/dictionary", {
          cache: "no-store",
          credentials: "include",
        });

        if (!response.ok) {
          const payload = await response.json().catch(() => null);
          setError(payload?.error || "Ошибка при загрузке слов для тренировки");
          setIsLoading(false);
          return;
        }

        const data = (await response.json()) as Word[];
        setWords(data);
        localStorage.setItem(cacheKey, JSON.stringify(data));
        setError("");
      } catch {
        setError("Ошибка при загрузке слов для тренировки");
      } finally {
        setIsLoading(false);
      }
    };

    loadWords();
  }, [router, session?.user?.id, status]);

  const preparedWords = useMemo(() => {
    const selectedWordIds =
      searchParams.words && searchParams.setup !== "true"
        ? new Set(searchParams.words.split(",").filter(Boolean))
        : null;

    const byMode = filterWordsByMode(dedupeWords(words), mode);

    if (!selectedWordIds) {
      return byMode;
    }

    return byMode.filter((word) => selectedWordIds.has(word.id));
  }, [mode, searchParams.setup, searchParams.words, words]);

  if (status === "loading" || (isLoading && preparedWords.length === 0)) {
    return (
      <div className="flex items-center justify-center h-screen w-full">
        <div className="text-white text-lg">Загрузка тренировки...</div>
      </div>
    );
  }

  if (error && preparedWords.length === 0) {
    return (
      <div className="flex items-center justify-center h-screen w-full px-4">
        <div className="text-red-300 text-center">{error}</div>
      </div>
    );
  }

  if (searchParams.setup === "true") {
    return <WordSelector mode={mode} words={preparedWords} />;
  }

  return <ModernTrainingMode mode={mode} words={preparedWords} searchParams={searchParams} />;
}
