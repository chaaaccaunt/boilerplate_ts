# Оценка проекта и план повышения качества

## Назначение документа

Документ фиксирует текущую оценку проекта после аудита backend, frontend, shared-контрактов, сборки, безопасности и архитектурных решений.

Цель документа: дать понятный порядок действий, чтобы постепенно довести boilerplate до более надежного состояния без хаотичных правок.

## Общая оценка

Текущий проект уже имеет хорошую основу:

- backend разделен на `httpServer`, `controller`, `service`;
- API использует единый response envelope;
- frontend и backend связаны через shared DTO contracts;
- Vuex store вынесен в namespaced modules;
- базовая авторизация и cookie-based flow уже заведены;
- инструкции и conventions начинают формировать устойчивые правила развития проекта.

Главные слабые места сейчас:

- безопасность авторизации;
- production-сборка backend;
- отсутствие полноценной frontend-защиты маршрутов;
- отсутствие миграционной стратегии;
- не до конца определенная модель ролей;
- устаревающий frontend tooling на базе Vue CLI;
- отсутствие тестов.

## Оценки по направлениям

| Направление | Оценка | Комментарий |
| --- | ---: | --- |
| Backend HTTP и слои | 7/10 | Хорошая граница `httpServer -> controller -> service`, единый envelope, централизованная обработка ошибок. Нужно усилить обработку крупных payload, CORS/cookie policy и логирование. |
| Безопасность | 4/10 | Есть httpOnly cookie и базовый JWT flow, но пароли хранятся как строки, тестовый admin имеет фиксированный пароль, JWT без TTL, CSRF-стратегия не оформлена. |
| База данных и модели | 6/10 | Sequelize models подключены и ассоциации работают. Но `RoleModel` сейчас фактически похожа на `UserRole`, нет миграций и нет отдельной стратегии справочника ролей. |
| Авторизация и роли | 5/10 | Роли возвращаются в DTO и попадают в `claims`, но политика ролей еще смешана с boilerplate-ядром и требует более ясной архитектуры. |
| Frontend API и Vuex | 6/10 | API client понятный, ошибки централизованы, store разнесен по модулям. Нет session bootstrap, route guard и нормального сценария logout на frontend. |
| Shared contracts | 8/10 | Хорошее направление: DTO живут отдельно и синхронизируют frontend/backend. Нужно аккуратнее отделять public DTO от внутренних runtime-моделей. |
| Сборка и DevOps | 3/10 | `typecheck` проходит, но backend build падает из-за неверной webpack-конфигурации для Node.js. Frontend build в текущей среде уперся в `EPERM` при создании `dist`. |
| Производительность | 6/10 | Для текущего размера нормально. Есть точки роста: сбор request body через `Buffer.concat` на каждый chunk, линейный route matching, синхронный `console.log`. |
| Документация | 8/10 | Документы уже полезны и на русском. Нужно добавить правила по security, migrations, cookies/CSRF и build strategy. |
| Тестируемость | 2/10 | Автотестов пока нет. Есть только typecheck. Для boilerplate нужен минимальный тестовый контур. |

## Критичные риски

### 1. Пароли хранятся без хеширования

Файл: `back/src/database/models/users/UserModel.ts`

Сейчас поле `password` является строкой, а `AuthService` сравнивает пароль напрямую через `timingSafeEqual`.

Почему это плохо:

- утечка БД сразу раскрывает пароли;
- тестовый seed закрепляет плохую практику;
- boilerplate может быть скопирован в реальный проект без замены механизма.

Нужно:

- хранить `passwordHash`, а не `password`;
- использовать `argon2id` или `bcrypt`;
- запретить возврат password/passwordHash через DTO;
- обновить seed на создание hash.

### 2. Тестовый пользователь имеет фиксированный пароль

Файл: `back/src/database/seeds/authorization.ts`

Сейчас seed создает пользователя:

```text
admin@example.com / password
```

Почему это плохо:

- дефолтные учетные данные легко забыть в окружении;
- при ошибочной настройке dev seed может попасть в общую базу;
- это один из самых частых источников компрометации boilerplate-проектов.

Нужно:

- брать пароль seed-пользователя из env;
- не запускать seed без явного флага;
- логировать факт создания тестового пользователя без вывода пароля;
- в production полностью запрещать seed.

### 3. JWT не имеет срока жизни

Файл: `back/src/services/AuthService.ts`

Сейчас `sign()` вызывается без `expiresIn`.

Почему это плохо:

- украденная cookie остается рабочей до смены секрета;
- logout на сервере фактически не инвалидирует уже выданный токен;
- невозможно управлять жизненным циклом сессии.

Нужно:

- добавить `VAR_HTTP_JWT_EXPIRES_IN`;
- подписывать access token с TTL;
- решить, нужен ли refresh token;
- добавить endpoint для проверки текущей сессии.

### 4. Нет frontend route guard

Файл: `front/src/entities/router/index.ts`

Сейчас `requiresAuth` влияет на layout, но не защищает маршрут.

Почему это плохо:

- пользователь может открыть защищенный route напрямую;
- frontend state не восстанавливается после reload;
- нет единого сценария редиректа на login.

Нужно:

- добавить router guard;
- добавить bootstrap-проверку текущей сессии;
- редиректить неавторизованных пользователей на `/login`;
- авторизованных пользователей с `/login` отправлять на основной экран.

### 5. Backend production build не работает

Файл: `back/webpack.config.ts`

Сейчас `npm run build:back` падает на Node core modules и зависимости вроде `mysql2`, `jsonwebtoken`, `sequelize`.

Причина:

- webpack не настроен как Node.js backend build;
- нет `target: "node"`;
- node_modules пытаются бандлиться как browser-код;
- не настроены externals.

Нужно:

- настроить webpack для Node.js;
- либо заменить backend build на `tsc`;
- проверить запуск собранного backend artifact.

## Подробный план действий

## Этап 1. Закрепить безопасность авторизации

Цель: убрать самые опасные решения вокруг паролей и токенов.

### Шаг 1.1. Перейти с `password` на `passwordHash`

Действия:

1. Обновить shared/backend naming policy: пароль не является публичным DTO.
2. В `UserModel` заменить логическое поле хранения пароля на `passwordHash`.
3. Настроить колонку БД под длинный hash, например `STRING(255)`.
4. В `AuthService` сравнивать входящий пароль через `argon2.verify()` или `bcrypt.compare()`.
5. В seed генерировать hash перед сохранением.

Критерий готовности:

- в БД не хранится plain-text password;
- login работает через hash verification;
- typecheck проходит;
- в DTO нет password/passwordHash.

### Шаг 1.2. Убрать фиксированный пароль тестового пользователя

Действия:

1. Добавить env-переменные:
   - `VAR_SEED_AUTH_ENABLED`
   - `VAR_SEED_ADMIN_LOGIN`
   - `VAR_SEED_ADMIN_PASSWORD`
2. Запускать seed только если `NODE_ENV !== "production"` и `VAR_SEED_AUTH_ENABLED=true`.
3. Если seed включен, но пароль не задан, падать с понятной ошибкой.
4. Не логировать пароль.

Критерий готовности:

- дефолтного пароля `password` в коде больше нет;
- seed невозможно случайно запустить в production;
- seed явно управляется env.

### Шаг 1.3. Добавить срок жизни JWT

Действия:

1. Добавить env-переменную `VAR_HTTP_JWT_EXPIRES_IN`.
2. Пробросить ее в `iHTTPConfig`.
3. Передавать `expiresIn` в `sign()`.
4. Проверить, что expired token дает `401`.
5. Подумать, должен ли frontend показывать отдельное сообщение при истекшей сессии.

Критерий готовности:

- JWT имеет срок жизни;
- expired token не проходит middleware;
- frontend корректно реагирует на `401`.

## Этап 2. Оформить cookie, CORS и CSRF policy

Цель: сделать cookie-based auth безопасной и предсказуемой для разных окружений.

### Шаг 2.1. Вынести cookie policy в конфиг

Действия:

1. Добавить env-переменные:
   - `VAR_HTTP_COOKIE_SECURE`
   - `VAR_HTTP_COOKIE_SAME_SITE`
   - `VAR_HTTP_COOKIE_DOMAIN`
2. Валидировать значения при старте.
3. Использовать эти значения при `setCookies` и `clearCookies`.
4. Для production по умолчанию требовать `secure=true`.

Критерий готовности:

- cookie behavior не зашит в controller;
- dev/prod настройки задаются явно;
- clear cookie использует совместимые `path/domain/sameSite/secure`.

### Шаг 2.2. Выбрать CSRF-стратегию

Возможные варианты:

- строгий `Origin`/`Referer` check для всех state-changing requests;
- double-submit CSRF token;
- отдельный CSRF endpoint и header.

Рекомендуемый минимум для boilerplate:

1. Проверять `Origin` для `POST/PATCH/DELETE`.
2. Разрешать только `config.http.origin`.
3. Возвращать `403`, если origin не совпал.
4. Зафиксировать это в `docs/backend-architecture-conventions.md`.

Критерий готовности:

- cookie-auth не полагается только на `SameSite`;
- state-changing requests имеют базовую CSRF-защиту.

## Этап 3. Починить production build backend

Цель: сделать backend реально собираемым и запускаемым.

### Шаг 3.1. Выбрать стратегию сборки

Вариант A: `tsc`

- проще;
- лучше подходит для Node.js backend;
- не требует бандлить `sequelize`, `mysql2`, `jsonwebtoken`.

Вариант B: webpack для Node.js

- можно собрать один artifact;
- нужна аккуратная настройка externals;
- выше риск проблем с dynamic imports и native/node modules.

Рекомендация: для boilerplate выбрать `tsc`, если нет явного требования single-file bundle.

### Шаг 3.2. Если остается webpack

Действия:

1. Добавить `target: "node"`.
2. Добавить `externalsPresets: { node: true }`.
3. Не бандлить `node_modules`.
4. Проверить alias `@/*`.
5. Проверить запуск результата из `dist`.

Критерий готовности:

- `npm run build:back` проходит;
- собранный backend стартует;
- Node core modules не пытаются полифиллиться как browser code.

## Этап 4. Определить модель ролей и прав

Цель: убрать неоднозначность между role dictionary и user-role association.

### Шаг 4.1. Принять решение по модели

Сейчас `RoleModel` содержит `userUid`, поэтому фактически это роль пользователя.

Вариант A: оставить простую схему

- переименовать `RoleModel` в `UserRoleModel`;
- таблицу назвать `user_roles`;
- DTO назвать `UserRoleDto`;
- использовать как простой список ролей пользователя.

Вариант B: сделать нормальную many-to-many схему

- `roles`: справочник ролей;
- `users`: пользователи;
- `user_roles`: связь пользователей и ролей;
- в будущем можно добавить permissions.

Рекомендация: если boilerplate должен быть расширяемым, выбрать вариант B.

### Шаг 4.2. Не зашивать project-specific policy в ядро

Действия:

1. Оставить JWT claims расширяемыми.
2. Не считать, что `claims.roles` всегда существует во всех проектах.
3. Для конкретного проекта добавить отдельный access layer.
4. Controller может вызывать access layer, service не должен знать HTTP/access status.

Критерий готовности:

- boilerplate дает инфраструктуру;
- конкретные роли и permissions можно заменить без переписывания ядра.

## Этап 5. Добавить frontend route guard и session bootstrap

Цель: сделать авторизацию на frontend предсказуемой.

### Шаг 5.1. Добавить endpoint текущей сессии

Backend:

1. Добавить `GET /authorization/me` или `/profile/me`.
2. Проверять cookie через `httpTokenValidator`.
3. Возвращать `PublicUserDto`.

Frontend:

1. Добавить метод `api.auth.me()`.
2. При старте приложения пытаться восстановить пользователя.
3. Сохранять пользователя в `auth` module.

Критерий готовности:

- reload страницы не сбрасывает авторизацию;
- frontend знает текущего пользователя после старта.

### Шаг 5.2. Добавить router guard

Действия:

1. В `front/src/entities/router/index.ts` добавить `beforeEach`.
2. Если route требует auth и пользователь не авторизован, редиректить на `/login`.
3. Если пользователь авторизован и идет на `/login`, редиректить на home.
4. Учесть состояние `authChecked`, чтобы не было мигания страниц.

Критерий готовности:

- защищенные маршруты реально закрыты на frontend;
- пользовательский flow после reload работает понятно.

### Шаг 5.3. Доделать logout flow

Действия:

1. После успешного logout коммитить `auth/clearUser`.
2. Редиректить на `/login`.
3. Обрабатывать ошибку logout без зависания UI.

Критерий готовности:

- logout очищает frontend state;
- cookie очищается backend-ом;
- пользователь уходит на login.

## Этап 6. Ввести миграции

Цель: убрать зависимость production от `sequelize.sync()`.

### Шаг 6.1. Выбрать migration runner

Варианты:

- Umzug;
- sequelize-cli;
- собственный минимальный runner.

Рекомендация: Umzug, потому что он хорошо стыкуется с Sequelize и TypeScript.

### Шаг 6.2. Перенести создание таблиц в миграции

Действия:

1. Создать миграцию `users`.
2. Создать миграцию `roles/user_roles`.
3. Добавить scripts:
   - `db:migrate`
   - `db:migrate:undo`
   - `db:seed`
4. В production запускать миграции отдельно от runtime-приложения.

Критерий готовности:

- runtime backend не меняет schema production database;
- структура БД воспроизводится командами;
- onboarding разработчика остается простым.

## Этап 7. Усилить HTTPServer

Цель: сделать HTTP слой стабильнее и дешевле по ресурсам.

### Шаг 7.1. Нормальная обработка больших body

Действия:

1. Заменить постоянный `Buffer.concat` на массив chunks.
2. Считать общий размер body.
3. При превышении лимита вернуть `413 Payload Too Large`.
4. Отправлять response envelope, а не просто уничтожать socket.

Критерий готовности:

- клиент получает понятную ошибку;
- сервер не делает лишние копирования памяти на каждый chunk.

### Шаг 7.2. Привести GET и POST payload к единой модели

Действия:

1. Решить, как route callback получает данные:
   - `data` всегда объект;
   - query отдельно;
   - params отдельно.
2. Обновить `iRouteCallback` и middleware.
3. Не мутировать `request.body` неожиданно.

Критерий готовности:

- controller получает предсказуемый request context;
- валидация не зависит от HTTP method неожиданным образом.

### Шаг 7.3. Подготовить route registry

Действия:

1. Хранить routes по HTTP method.
2. Для каждого method искать только его routes.
3. Позже можно заменить regexp-list на path matcher.

Критерий готовности:

- route matching остается простым;
- рост количества routes меньше влияет на каждый запрос.

## Этап 8. Улучшить логирование

Цель: сохранить контекст, но не раскрывать чувствительные данные.

### Шаг 8.1. Привести logger к production-friendly формату

Действия:

1. Оставить JSON logs.
2. Рассмотреть `pino` как быстрый production logger.
3. Проверить, что sanitizer закрывает:
   - password;
   - token;
   - cookie;
   - secret;
   - authorization;
   - jwt.
4. Не логировать payload повторно на controller/service.

Критерий готовности:

- логи пригодны для агрегатора;
- чувствительные данные не попадают в stdout.

### Шаг 8.2. Проверить кодировку сообщений

Действия:

1. Убедиться, что все файлы сохранены в UTF-8.
2. Проверить вывод логов в Windows terminal и production окружении.
3. При необходимости настроить editorconfig.

Критерий готовности:

- кириллица не превращается в mojibake;
- все сообщения читаются корректно.

## Этап 9. Обновить frontend tooling

Цель: снизить dependency risk и упростить сборку.

### Шаг 9.1. Разобраться с audit

Текущий результат:

- production audit: 2 moderate vulnerability через `sequelize -> uuid`;
- полный audit: 19 vulnerabilities, включая high severity в dev/tooling цепочке Vue CLI.

Действия:

1. Не запускать `npm audit fix --force` вслепую.
2. Проверить, какие версии зависимостей реально можно поднять без downgrade.
3. Для frontend рассмотреть переход с Vue CLI на Vite.
4. Обновить lockfile контролируемо.

Критерий готовности:

- production vulnerabilities закрыты или осознанно приняты;
- dev vulnerabilities снижены через обновление tooling;
- сборка продолжает проходить.

### Шаг 9.2. Проверить frontend production build

Текущий результат:

- build frontend в текущем окружении упал на `EPERM` при создании `front/dist`.

Действия:

1. Проверить права на `front/dist`.
2. Убедиться, что папка не занята процессом.
3. Повторить build в чистом окружении.
4. Если проблема повторяется, настроить outputDir или права.

Критерий готовности:

- `npm run build:front` стабильно проходит;
- dist воспроизводим.

## Этап 10. Добавить тесты

Цель: сделать boilerplate устойчивым к регрессиям.

### Шаг 10.1. Минимальные backend tests

Покрыть:

1. Validator:
   - missing field;
   - unexpected field;
   - invalid email;
   - string length.
2. AuthService:
   - successful login;
   - invalid password;
   - missing user;
   - roles mapping.
3. HTTPServer envelope:
   - success envelope;
   - error envelope;
   - internal error masking.

### Шаг 10.2. Минимальные frontend tests

Покрыть:

1. `HttpClient`:
   - successful envelope;
   - backend error envelope;
   - invalid JSON;
   - network error.
2. `ApiClient`:
   - default error dispatch;
   - `reportError: false`;
   - commit on success.
3. Auth store:
   - `setUser`;
   - `clearUser`.

Критерий готовности:

- ключевые контракты закреплены тестами;
- будущие изменения API client/auth не ломают приложение незаметно.

## Рекомендуемый порядок выполнения

1. Исправить хранение паролей и seed.
2. Добавить TTL для JWT.
3. Починить backend build.
4. Добавить route guard и session bootstrap.
5. Определить финальную схему ролей.
6. Добавить cookie/CSRF policy.
7. Ввести миграции.
8. Улучшить HTTPServer body handling.
9. Обновить tooling/dependencies.
10. Добавить минимальные тесты.

## Быстрый набор критериев production-ready

Проект можно считать заметно ближе к production-ready, когда:

- пароли хешируются;
- JWT имеет срок жизни;
- нет фиксированных тестовых учетных данных;
- backend build проходит;
- frontend build проходит;
- есть route guard и восстановление сессии;
- `sequelize.sync()` не нужен для production;
- есть миграции;
- cookie/CSRF policy описана и реализована;
- production audit не содержит нерешенных high vulnerabilities;
- есть минимальные тесты backend и frontend.
