import { z } from "zod";

export const schema = {
  login: z.object({
    email: z.string().email("Некорректный email"),
    password: z.string().min(6, "Пароль должен содержать минимум 6 символов"),
  }),
  
  register: z.object({
    name: z.string().min(2, "Имя должно содержать минимум 2 символа"),
    email: z.string().email("Некорректный email"),
    password: z.string().min(6, "Пароль должен содержать минимум 6 символов"),
  }),
  
  word: z.object({
    english: z.string().min(1, "Английское слово обязательно"),
    russian: z.string().min(1, "Перевод обязателен"),
    definition: z.string().optional(),
    example: z.string().optional(),
    imageUrl: z.string().optional(),
  })
};