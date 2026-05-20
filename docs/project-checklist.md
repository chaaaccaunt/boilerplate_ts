# Чеклист проекта

## Перед запуском backend

- Проверить, что создан нужный env-файл:
  - `.dev.env` для разработки;
  - `.prod.env` для production.
- Проверить, что `.dev.env` и `.prod.env` указывают разные базы данных.
- Проверить, что production database user не используется в `.dev.env`.
- Проверить обязательные переменные:
  - `VAR_DB_DIALECT`;
  - `VAR_DB_HOST`;
  - `VAR_DB_PORT`;
  - `VAR_DB_NAME`;
  - `VAR_DB_USER`;
  - `VAR_DB_PASSWORD`;
  - `VAR_HTTP_PORT`;
  - `VAR_HTTP_ORIGIN`;
  - `VAR_HTTP_COOKIE_NAME`;
  - `VAR_HTTP_PUBLIC_USER_COOKIE_NAME`;
  - `VAR_HTTP_PUBLIC_USER_COOKIE_DOMAIN`;
  - `VAR_HTTP_JWT_SECRET`.
  - `VAR_HTTP_JWT_AUDIENCE`;
  - `VAR_HTTP_JWT_ISSUER`.
- Проверить, что обязательные переменные не равны placeholder/default-значениям вроде `УкажитеЗначение`.
- Проверить, что `VAR_DB_DIALECT` равен поддерживаемому Sequelize dialect для проекта, например `mysql` или `postgres`.
- Проверить, что `VAR_DB_PORT` соответствует выбранной СУБД.
- Если менялась schema, проверить миграции для всех поддерживаемых dialects: корневой MySQL/MariaDB-compatible набор и `migrations/postgres`.
- Проверить, что `VAR_HTTP_ORIGIN` содержит hostname, из которого runtime может вычислить cookie domain второго уровня с ведущей точкой, например `.gtrktuva.local`.
- Для стандартного init-flow проверить, что `VAR_HTTP_PUBLIC_USER_COOKIE_DOMAIN` равен `.gtrktuva.local`, если используются hostnames `test.gtrktuva.local` и `testapi.gtrktuva.local`.
- Для режима `localhost.noNginx: true` проверить, что `VAR_HTTP_ENABLE_PREFLIGHT=true` и `VAR_HTTP_ALLOW_HOST_ONLY_COOKIES=true` заданы только в development `.dev.env`.
- Проверить, что `VAR_APP_LOG_LEVEL` соответствует `localhost.debug` из `development.config.json`: `debug` при `true`, `info` при `false`.
- Проверить matrix прав database users для каждого backend-сервиса и gateway, который ходит в БД:
  - `package -> table -> allowed operations`;
  - runtime-пользователь не имеет прав на таблицы, которые package не использует;
  - runtime-пользователь не имеет `CREATE`, `ALTER`, `DROP`, если package не является migration/setup process;
  - read-only package имеет только `SELECT`;
  - seed/setup данные не требуют расширения runtime-прав package сверх его реальных runtime-сценариев.

## Перед первичной настройкой БД

- Проверить обязательные переменные migration package:
  - `VAR_DB_ADMIN_USER`;
  - `VAR_DB_ADMIN_PASSWORD`;
  - `VAR_DB_SERVICE_HOST`;
  - `VAR_DB_SERVICE_GRANTS`.
- Проверить, что grants выдаются минимально необходимому service user и не используют `<database>.*`, если package работает только с частью таблиц.
- Для каждого нового package зафиксировать grants по конкретным таблицам до запуска setup.
- Выполнить настройку БД и пользователя сервиса через `npm run project -- workspace service:database-migration setup`.
- После настройки выполнить миграции через `npm run project -- migrate`.
- Если нужно полностью пересоздать development database, использовать `npm run project -- init <db-host> <db-admin-user> <db-admin-password>`: команда обновит development env, удалит базу, заново выполнит setup, применит миграции, выдаст runtime grants, выполнит development seed и запустит development окружение.

## Режим работы БД

- Runtime backend при любом `NODE_ENV` выполняет только `authenticate()`.
- Runtime backend не выполняет `sync()` и seed.
- Schema и начальные данные должны быть подготовлены до запуска backend через `services/database-migration`.
- Runtime backend не должен менять schema.

## Перед запуском frontend

- Проверить обязательную переменную `VUE_APP_BASE_URL`.
- Проверить обязательную переменную `VUE_APP_AUTHORIZATION_PUBLIC_USER_COOKIE_NAME`.
- Для режима `localhost.noNginx: true` проверить direct gateway env: `VUE_APP_AUTHORIZATION_BASE_URL`, `VUE_APP_FILES_BASE_URL`, `VUE_APP_WEBSOCKET_BASE_URL`.
- Если frontend доступен через внешний development hostname, указать `VUE_APP_HOSTNAME`.
- Не использовать fallback для обязательных env-переменных.
- Проверить, что обязательные frontend env-переменные не равны placeholder/default-значениям.

## Пользователи и роли

- Базовые роли `administrator` и `user` должны существовать в справочнике `roles`.
- Development seed должен сохранять пароль администратора как bcrypt hash.
- Создание пользователей должно быть доступно только пользователю с ролью `administrator`.
- Frontend должен получать пользователей и роли через `monolith/src/entities/users/api`.

## Проверки перед завершением задачи

- Если задача меняла backend/gateway/service поведение, проверить политику `log-collector`:
  - CRUD/mutation операции логируются на gateway boundary и как результат mutating service method;
  - SQL-запросы, которые меняют данные, логируются точечно через `DatabaseServiceTools.createDatabaseQueryLogger` с `mutation: true`;
  - SQL перед записью в лог проходит через `sanitizeSql`, пароль не попадает в context в открытом виде;
  - обычные `GET`, read-only `list*` calls и `debug`-логи не отправляются в `log-collector`;
  - collector lifecycle использует `kind: collector_connection` и `kind: collector_disconnection`;
  - disconnect от `log-collector` фиксируется как тревога `level: error`;
  - чувствительные данные не попадают в context.
- Если задача меняла runtime metrics:
  - metrics доступны только администратору через `/system`;
  - public gateway обращается только к `services/log-collector`;
  - services/gateways не получают отдельные публичные metrics endpoints;
  - metrics DTO не содержит secrets, env values, tokens, cookies или database credentials;
  - регулярные metrics snapshots не пишутся в `log_records`;
  - `services/log-collector` не подключается к собственному socket-server как client.
- Запустить `npm run project -- typecheck all`, если задача меняла TypeScript-код, shared contracts, backend/frontend contracts или runtime-логику, и зависимости проекта доступны.
- Если менялся internal gateway-to-service transport, проверить, что backend-сервисы используют controllers в `src/controllers`, не содержат `src/routes`, а internal route regex имеет формат `^POST:/...$`.
- Если менялись shared contracts, убедиться, что проходят:
  - shared typecheck;
  - backend typecheck;
  - frontend typecheck.
- Если менялись пользовательские сообщения или верстка, проверить русский язык.
- Если менялись текстовые файлы, сохранить их в UTF-8.

## Проверки перед production

- Проверить, что nginx-конфиги в `./nginx` соответствуют текущим публичным gateway, WebSocket gateway, frontend origin и package-local `VAR_HTTP_PORT`.
- Выполнить миграции базы данных через `npm run project -- migrate` или `npm run project -- migrate dist`.
- Backend build должен проходить.
- Frontend build должен проходить.
- `sequelize.sync()` не должен запускаться runtime backend-сервисами и gateway.
- Seed не должен запускаться runtime backend-сервисами и gateway.
- Cookie/CORS policy приложения должна быть явно настроена.
- CSRF/Origin policy должна быть явно настроена на уровне nginx.
- `VAR_HTTP_ENABLE_PREFLIGHT` и `VAR_HTTP_ALLOW_HOST_ONLY_COOKIES` не должны использоваться как production-замена nginx edge policy.
- Не должно быть фиксированных production-паролей или тестовых учетных данных.
