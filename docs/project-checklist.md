# Чеклист проекта

## Перед запуском backend

- Проверить, что создан нужный env-файл:
  - `.dev.env` для разработки;
  - `.prod.env` для production.
- Проверить, что `.dev.env` и `.prod.env` указывают разные базы данных.
- Проверить, что production database user не используется в `.dev.env`.
- Проверить обязательные переменные:
  - `VAR_DB_HOST`;
  - `VAR_DB_NAME`;
  - `VAR_DB_USER`;
  - `VAR_DB_PASSWORD`;
  - `VAR_HTTP_PORT`;
  - `VAR_HTTP_ORIGIN`;
  - `VAR_HTTP_COOKIE_NAME`;
  - `VAR_HTTP_JWT_SECRET`.
- Проверить, что обязательные переменные не равны placeholder/default-значениям вроде `УкажитеЗначение`.

## Режим работы БД

- При `NODE_ENV=production` backend выполняет только `authenticate()`.
- При любом другом `NODE_ENV` backend выполняет `sync()` и seed.
- Production schema должна быть подготовлена до запуска backend.
- Runtime backend не должен менять production schema.

## Перед запуском frontend

- Проверить обязательную переменную `VUE_APP_BASE_URL`.
- Если frontend доступен через внешний development hostname, указать `VUE_APP_HOSTNAME`.
- Не использовать fallback для обязательных env-переменных.
- Проверить, что обязательные frontend env-переменные не равны placeholder/default-значениям.

## Пользователи и роли

- Базовые роли `administrator` и `user` должны существовать в справочнике `roles`.
- Development seed должен сохранять пароль администратора как bcrypt hash.
- Создание пользователей должно быть доступно только пользователю с ролью `administrator`.
- Frontend должен получать пользователей и роли через `monolith/src/entities/users/api`.

## Проверки перед завершением задачи

- Запустить `npm run typecheck:all`, если задача меняла TypeScript-код, shared contracts, backend/frontend contracts или runtime-логику, и зависимости проекта доступны.
- Если менялись shared contracts, убедиться, что проходят:
  - shared typecheck;
  - backend typecheck;
  - frontend typecheck.
- Если менялись пользовательские сообщения или верстка, проверить русский язык.
- Если менялись текстовые файлы, сохранить их в UTF-8.

## Проверки перед production

- Backend build должен проходить.
- Frontend build должен проходить.
- `sequelize.sync()` не должен запускаться при `NODE_ENV=production`.
- Seed не должен запускаться при `NODE_ENV=production`.
- Cookie/CORS policy приложения должна быть явно настроена.
- CSRF/Origin policy должна быть явно настроена на уровне nginx.
- Не должно быть фиксированных production-паролей или тестовых учетных данных.
