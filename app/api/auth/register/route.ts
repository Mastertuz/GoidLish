import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const registerSchema = z.object({
  name: z.string().min(1, "Имя обязательно"),
  email: z.string().email("Неверный формат email"),
  password: z.string().min(6, "Пароль должен содержать минимум 6 символов"),
});

export async function POST(request: NextRequest) {
  try {
    console.log('=== Registration attempt ===');
    
    const body = await request.json();
    console.log('Request body received:', { ...body, password: '[HIDDEN]' });
    
    const validatedData = registerSchema.parse(body);
    console.log('Data validated successfully');

    // Проверяем подключение к БД
    await prisma.$connect();
    console.log('Database connected successfully');

    // Проверяем, существует ли пользователь
    const existingUser = await prisma.user.findUnique({
      where: {
        email: validatedData.email,
      },
    });
    console.log('Existing user check:', existingUser ? 'User exists' : 'User not found');

    if (existingUser) {
      return NextResponse.json(
        { error: "Пользователь с таким email уже существует" },
        { status: 400 }
      );
    }

    // Хешируем пароль
    const hashedPassword = await bcrypt.hash(validatedData.password, 12);

    // Создаем пользователя
    const user = await prisma.user.create({
      data: {
        name: validatedData.name,
        email: validatedData.email,
        password: hashedPassword,
        role: "user", // По умолчанию обычный пользователь
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
      },
    });

    return NextResponse.json(
      { message: "Пользователь успешно зарегистрирован", user },
      { status: 201 }
    );
  } catch (error) {
    console.error("Registration error:", error);
    
    // Закрываем соединение при ошибке
    await prisma.$disconnect();

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0].message },
        { status: 400 }
      );
    }

    // Детальная обработка ошибок Prisma
    if (error && typeof error === 'object' && 'code' in error) {
      const prismaError = error as any;
      if (prismaError.code === 'P2002') {
        return NextResponse.json(
          { error: "Пользователь с таким email уже существует" },
          { status: 400 }
        );
      }
      if (prismaError.code === 'P1001') {
        return NextResponse.json(
          { error: "Не удается подключиться к базе данных" },
          { status: 500 }
        );
      }
    }

    return NextResponse.json(
      { error: "Произошла ошибка при регистрации. Попробуйте позже." },
      { status: 500 }
    );
  }
}