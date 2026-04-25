import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getCachedUserWords, invalidateCachedUserWords, setCachedUserWords } from "@/lib/user-words-cache";
import { z } from "zod";
import fs from "fs/promises";
import path from "path";

const createWordSchema = z.object({
  english: z.string().min(1, "Английское слово обязательно"),
  russian: z.string().min(1, "Перевод обязателен"),
  definition: z.string().optional(),
  example: z.string().optional(),
  imageUrl: z.string().optional(),
});

const getErrorMessage = (error: unknown) =>
  error instanceof Error ? error.message.toLowerCase() : "";

const isTransientConnectionError = (error: unknown) => {
  const message = getErrorMessage(error);
  return (
    message.includes("connection terminated unexpectedly") ||
    message.includes("server closed the connection") ||
    message.includes("terminating connection") ||
    message.includes("socket hang up") ||
    message.includes("query read timeout") ||
    message.includes("timeout exceeded")
  );
};

const isConnectionLimitError = (error: unknown) =>
  isTransientConnectionError(error) ||
  (typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (["P2037", "P2024"] as const).includes((error as { code?: string }).code as "P2037" | "P2024"));

const isDatabaseUnavailableError = (error: unknown) =>
  isTransientConnectionError(error) ||
  (typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (["P2037", "P2024", "P1001", "P1002", "P1017"] as const).includes(
      (error as { code?: string }).code as "P2037" | "P2024" | "P1001" | "P1002" | "P1017"
    ));

const looksLikeDatabaseConnectorError = (error: unknown) => {
  const message = getErrorMessage(error);
  return (
    message.includes("error querying the database") ||
    message.includes("connector error") ||
    message.includes("connection") ||
    message.includes("query read timeout") ||
    message.includes("timeout")
  );
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

type DictionaryWord = {
  id: string;
  english: string;
  russian: string;
  definition: string | null;
  example: string | null;
  imageUrl: string | null;
  createdAt: Date;
};

type BackupExport = {
  user?: {
    email?: string;
  };
  dictionaries?: Array<{
    words?: Array<{
      english?: string;
      russian?: string;
      definition?: string | null;
      example?: string | null;
      imageUrl?: string | null;
    }>;
  }>;
};

async function loadWordsFromBackupFile(userEmail?: string | null) {
  try {
    const backupPath = path.join(process.cwd(), "user-export.json");
    const raw = await fs.readFile(backupPath, "utf8");
    const parsed = JSON.parse(raw) as BackupExport;

    const hasMatchingEmail =
      Boolean(userEmail) &&
      Boolean(parsed?.user?.email) &&
      parsed.user!.email!.toLowerCase() === userEmail!.toLowerCase();

    const backupWords = (parsed.dictionaries ?? []).flatMap((dictionary) => dictionary.words ?? []);

    if (!hasMatchingEmail) {
      console.warn("Dictionary fallback: using backup words without strict email match");
    }

    return backupWords
      .filter((word) => typeof word.english === "string" && typeof word.russian === "string")
      .map((word, index) => ({
        id: `backup-${index + 1}`,
        english: word.english ?? "",
        russian: word.russian ?? "",
        definition: word.definition ?? null,
        example: word.example ?? null,
        imageUrl: word.imageUrl ?? null,
        createdAt: new Date(0).toISOString(),
      }));
  } catch (backupError) {
    console.error("Backup dictionary read error:", backupError);
    return [];
  }
}

async function findUserWordsWithRetry(userId: string) {
  const maxAttempts = 2;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      const dictionaries = await prisma.dictionary.findMany({
        where: { userId },
        select: { id: true },
      });

      const dictionaryIds = dictionaries.map((dictionary) => dictionary.id);
      if (dictionaryIds.length === 0) {
        return [];
      }

      return await prisma.word.findMany({
        where: {
          dictionaryId: { in: dictionaryIds },
        },
        select: {
          id: true,
          english: true,
          russian: true,
          definition: true,
          example: true,
          imageUrl: true,
          createdAt: true,
        },
      });
    } catch (error) {
      if (!isConnectionLimitError(error) || attempt === maxAttempts) {
        throw error;
      }
      await sleep(100 * attempt);
    }
  }

  return [];
}

async function withDbRetry<T>(operation: () => Promise<T>, maxAttempts = 3): Promise<T> {
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      if (!isDatabaseUnavailableError(error) || attempt === maxAttempts) {
        throw error;
      }
      await sleep(120 * attempt);
    }
  }

  throw new Error("Database retry failed");
}

// Получить все слова пользователя
export async function GET() {
  let session: { user?: { id?: string; email?: string | null } } | null = null;

  try {
    session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Необходима авторизация" },
        { status: 401 }
      );
    }

    const cachedWords = getCachedUserWords<DictionaryWord[]>(session.user.id);
    if (cachedWords) {
      return NextResponse.json(cachedWords);
    }

    // Основной источник: Prisma (из БД) с увеличенным timeout и ретраями
    const words = await findUserWordsWithRetry(session.user.id);

    const uniqueWords = words;

    setCachedUserWords(session.user.id, uniqueWords);

    return NextResponse.json(uniqueWords);
  } catch (error) {
    console.error("Error fetching user dictionary:", error);

    if (isDatabaseUnavailableError(error) || looksLikeDatabaseConnectorError(error)) {
      const userId = session?.user?.id;

      if (userId) {
        const cached = getCachedUserWords<DictionaryWord[]>(userId);
        if (cached) {
          console.warn(`Dictionary fallback: returning ${cached.length} cached words`);
          return NextResponse.json(cached);
        }
      }

      const backupWords = await loadWordsFromBackupFile(session?.user?.email);

      if (backupWords.length > 0) {
        console.warn(`Dictionary fallback: returning ${backupWords.length} words from user-export.json`);
        return NextResponse.json(backupWords);
      }

      return NextResponse.json(
        { error: "Проблема подключения к базе данных. Повторите попытку через несколько секунд" },
        { status: 503 }
      );
    }

    return NextResponse.json(
      { error: "Ошибка при загрузке словаря" },
      { status: 500 }
    );
  }
}

// Добавить новое слово
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Необходима авторизация" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const validatedData = createWordSchema.parse(body);

    const word = await withDbRetry(async () => {
      // Получаем самый новый словарь пользователя или создаем новый
      let dictionary = await prisma.dictionary.findFirst({
        where: {
          userId: session.user.id,
        },
        orderBy: {
          createdAt: "desc",
        },
      });

      if (!dictionary) {
        dictionary = await prisma.dictionary.create({
          data: {
            userId: session.user.id,
            name: `Словарь пользователя ${session.user.name || session.user.email}`,
          },
        });
      }

      // Создаем новое слово
      return prisma.word.create({
        data: {
          english: validatedData.english,
          russian: validatedData.russian,
          definition: validatedData.definition || null,
          example: validatedData.example || null,
          imageUrl: validatedData.imageUrl || null,
          dictionaryId: dictionary.id,
        },
        select: {
          id: true,
          english: true,
          russian: true,
          definition: true,
          example: true,
          imageUrl: true,
          createdAt: true,
        },
      });
    });

    invalidateCachedUserWords(session.user.id);

    return NextResponse.json(word, { status: 201 });
  } catch (error) {
    console.error("Error adding word:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0].message },
        { status: 400 }
      );
    }

    if (isDatabaseUnavailableError(error)) {
      return NextResponse.json(
        { error: "База данных временно недоступна. Попробуйте добавить слово еще раз через несколько секунд" },
        { status: 503 }
      );
    }

    return NextResponse.json(
      { error: "Ошибка при добавлении слова" },
      { status: 500 }
    );
  }
}