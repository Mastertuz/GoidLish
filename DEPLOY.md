# 🚀 Инструкция по деплою на Vercel

## ✅ У вас уже есть Prisma Accelerate!

Ваша база данных уже настроена через Prisma Accelerate. Просто добавьте переменные в Vercel:

## Настройка переменных окружения в Vercel

В дашборде вашего проекта на Vercel добавьте эти переменные:

### Обязательные:
```
DATABASE_URL=prisma+postgres://accelerate.prisma-data.net/?api_key=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqd3RfaWQiOjEsInNlY3VyZV9rZXkiOiJza19NRFpZUEs2MjNNeWhlaWJOclNIbmIiLCJhcGlfa2V5IjoiMDFLOVQ3Qk04WENTREtYWURDSkowU1k1SEYiLCJ0ZW5hbnRfaWQiOiI2NmMwYWQ1MTI5MjcxZDBhMGJmM2ViMmU0MjE3Y2EzOTNmOTM3YTExZGRmOTFiMTJkMzAxZTE1YzUwMGJhZTcwIiwiaW50ZXJuYWxfc2VjcmV0IjoiNjIzNjk0MmYtMWZkMy00NzY3LWE4NzYtMGMxMmFhMTVkNGUxIn0.Mdyc0M-uv8xeEjt0JXFB8GCM-uHwdIZ-ggrvF7RTDgw

AUTH_SECRET=z8caE2DMhkEoxtcsbJUdWQShErvU1Heirox17iz4ufo=

NEXTAUTH_URL=https://your-project-name.vercel.app
```

### Дополнительные (UploadThing):
```
UPLOADTHING_TOKEN=eyJhcGlLZXkiOiJza19saXZlXzlmNmE0OGJkOWRlMDFlMmFhNmI3NzFlMjU1Y2Y2Njc5ZjdkYzY5ZGQyYmI2NDgzNTE4NTYyZThiNGNhYzE0YjQiLCJhcHBJZCI6ImQ4YWE0NGxuY3MiLCJyZWdpb25zIjpbInNlYTEiXX0=
```

## Команды для деплоя

```bash
# 1. Установите Vercel CLI (если еще не установлен)
npm i -g vercel

# 2. Войдите в аккаунт
vercel login

# 3. Деплой
vercel --prod

# 4. Миграции БД (выполнить после деплоя)
vercel env pull .env.local
npm run db:migrate:deploy
```

## Важно! 

⚠️ **Обязательно обновите NEXTAUTH_URL** после деплоя:
- Перейдите в Settings → Environment Variables в Vercel
- Замените `your-project-name.vercel.app` на ваш реальный домен

## Проверка после деплоя

- ✅ Главная страница загружается корректно
- ✅ Регистрация работает
- ✅ Авторизация работает  
- ✅ Добавление слов в словарь
- ✅ Все режимы тренировок запускаются
- ✅ Нет горизонтального скролла на мобильных

## Troubleshooting

### Ошибки авторизации:
- Проверьте AUTH_SECRET и NEXTAUTH_URL
- Убедитесь, что домен указан правильно (без trailing slash)

### Ошибки БД:
- Prisma Accelerate уже настроен, дополнительных действий не требуется
- Проверьте правильность DATABASE_URL