// Типы для компонентов словаря пользователя
export interface Word {
  id: string;
  english: string;
  russian: string;
  definition?: string | null;
  example?: string | null;
  imageUrl?: string | null;
  createdAt: Date;
}

export interface WordFormData {
  english: string;
  russian: string;
  definition: string;
  example: string;
  imageUrl: string;
}

// Типы для аутентификации
export interface User {
  id: string;
  name?: string;
  email?: string;
  role?: string;
}

export interface Session {
  user?: User;
}

// Типы для API ответов
export interface ApiResponse<T = any> {
  data?: T;
  error?: string;
  message?: string;
}

// Типы для форм
export interface FormState {
  isSubmitting: boolean;
  error: string;
  success: string;
}