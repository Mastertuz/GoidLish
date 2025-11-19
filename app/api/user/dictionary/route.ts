import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const createWordSchema = z.object({
  english: z.string().min(1, "Английское слово обязательно"),
  russian: z.string().min(1, "Перевод обязателен"),
  definition: z.string().optional(),
  example: z.string().optional(),
  imageUrl: z.string().optional(),
});

// Получить все слова пользователя
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Необходима авторизация" },
        { status: 401 }
      );
    }

    // Получаем или создаем словарь пользователя
    let dictionary = await prisma.dictionary.findFirst({
      where: {
        userId: session.user.id,
      }
    });

    if (!dictionary) {
      dictionary = await prisma.dictionary.create({
        data: {
          userId: session.user.id,
          name: `Словарь пользователя ${session.user.name || session.user.email}`
        }
      });
    }

    // Получаем слова из словаря пользователя
    const words = await prisma.word.findMany({
      where: {
        dictionaryId: dictionary.id,
      },
      orderBy: {
        createdAt: 'desc'
      },
      select: {
        id: true,
        english: true,
        russian: true,
        definition: true,
        example: true,
        createdAt: true
      }
    });

    return NextResponse.json(words);
  } catch (error) {
    console.error("Error fetching user dictionary:", error);
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

    // Получаем или создаем словарь пользователя
    let dictionary = await prisma.dictionary.findFirst({
      where: {
        userId: session.user.id,
      }
    });

    if (!dictionary) {
      dictionary = await prisma.dictionary.create({
        data: {
          userId: session.user.id,
          name: `Словарь пользователя ${session.user.name || session.user.email}`
        }
      });
    }

    // Создаем новое слово
    const word = await prisma.word.create({
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
        createdAt: true
      }
    });

    return NextResponse.json(word, { status: 201 });
  } catch (error) {
    console.error("Error adding word:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0].message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Ошибка при добавлении слова" },
      { status: 500 }
    );
  }
}