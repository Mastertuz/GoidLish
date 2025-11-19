import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const updateWordSchema = z.object({
  english: z.string().min(1, "Английское слово обязательно"),
  russian: z.string().min(1, "Перевод обязателен"),
  definition: z.string().optional(),
  example: z.string().optional(),
  imageUrl: z.string().optional(),
});

// Обновить слово
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Необходима авторизация" },
        { status: 401 }
      );
    }

    const resolvedParams = await params;
    const wordId = resolvedParams.id;
    const body = await request.json();
    const validatedData = updateWordSchema.parse(body);

    // Проверяем, принадлежит ли слово пользователю
    const existingWord = await prisma.word.findUnique({
      where: {
        id: wordId
      },
      include: {
        dictionary: {
          select: {
            userId: true
          }
        }
      }
    });

    if (!existingWord) {
      return NextResponse.json(
        { error: "Слово не найдено" },
        { status: 404 }
      );
    }

    if (existingWord.dictionary.userId !== session.user.id) {
      return NextResponse.json(
        { error: "У вас нет прав на редактирование этого слова" },
        { status: 403 }
      );
    }

    // Обновляем слово
    const updatedWord = await prisma.word.update({
      where: {
        id: wordId
      },
      data: {
        english: validatedData.english,
        russian: validatedData.russian,
        definition: validatedData.definition || null,
        example: validatedData.example || null,
        imageUrl: validatedData.imageUrl || null,
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

    return NextResponse.json(updatedWord);
  } catch (error) {
    console.error("Error updating word:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0].message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Ошибка при обновлении слова" },
      { status: 500 }
    );
  }
}

// Удалить слово из словаря пользователя
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Необходима авторизация" },
        { status: 401 }
      );
    }

    const resolvedParams = await params;
    const wordId = resolvedParams.id;

    // Проверяем, принадлежит ли слово пользователю
    const word = await prisma.word.findUnique({
      where: {
        id: wordId
      },
      include: {
        dictionary: {
          select: {
            userId: true
          }
        }
      }
    });

    if (!word) {
      return NextResponse.json(
        { error: "Слово не найдено" },
        { status: 404 }
      );
    }

    if (word.dictionary.userId !== session.user.id) {
      return NextResponse.json(
        { error: "У вас нет прав на удаление этого слова" },
        { status: 403 }
      );
    }

    // Удаляем слово
    await prisma.word.delete({
      where: {
        id: wordId
      }
    });

    return NextResponse.json({ message: "Слово удалено" }, { status: 200 });
  } catch (error) {
    console.error("Error deleting word:", error);
    return NextResponse.json(
      { error: "Ошибка при удалении слова" },
      { status: 500 }
    );
  }
}