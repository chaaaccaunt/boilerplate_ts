# Boilerplate TS

Fullstack boilerplate для проектов, где frontend остается единым Vue-монолитом, а backend уже разделен на самостоятельные gateway и service packages с подготовкой к микросервисной архитектуре.

Проект содержит готовый пользовательский интерфейс, backend boundary, shared DTO contracts, database migration flow, package-local env, runtime database grants, realtime, загрузку файлов, логирование и root CLI для повседневной разработки.

## Что уже реализовано

### Аутентификация

- вход по логину и паролю;
- защищенная authorization cookie с JWT;
- публичная user cookie для восстановления frontend-состояния после refresh;
- проверка сессии через `GET /v1/gateway/authorization/state`;
- route guard для защищенных страниц;
- logout через confirmation modal;
- очистка authorization state и realtime connection при logout;
- cookie domain для subdomain-сценариев, например `.gtrktuva.local`.

Основные зоны:

- `gateways/authorization`;
- `monolith/src/entities/authorization`;
- `monolith/src/views/login`;
- `monolith/src/application/router`;
- `monolith/src/layouts/main`.

### Пользователи и роли

- административный CRUD пользователей;
- просмотр пользователей и ролей;
- создание, редактирование и soft delete пользователя;
- создание, переименование и удаление пользовательских ролей;
- защита системных ролей `administrator` и `user`;
- запрет удаления последнего администратора;
- bcrypt hash для паролей;
- доступ к управлению пользователями только для `administrator`.

Основные зоны:

- `shared/@types/users.d.ts`;
- `services/users`;
- `gateways/public/src/controllers/UsersGatewayController.ts`;
- `monolith/src/entities/users`;
- `monolith/src/views/users`.

### Чат

- список доступных комнат;
- обязательная public room без fallback на случайную комнату;
- восстановление последней активной комнаты;
- создание private/group room;
- редактирование названия и состава group room владельцем;
- пользовательское удаление group room через soft-archive `archived_by_owner`;
- выход из group/private room;
- перевод private room в `orphaned`, если вышли все участники;
- загрузка сообщений комнаты;
- отправка текстового сообщения;
- отправка сообщения с вложениями;
- редактирование и удаление собственного сообщения;
- удаление отдельного вложения из собственного сообщения;
- realtime notification для новых, обновленных и удаленных сообщений.

Основные зоны:

- `shared/@types/chat.d.ts`;
- `services/chat`;
- `gateways/public/src/controllers/ChatHTTPGatewayController.ts`;
- `gateways/chat-realtime`;
- `monolith/src/entities/chat`;
- `monolith/src/views/chat`;
- `docs/chat-room-lifecycle-policy.md`.

### Файлы и media viewer

- upload нескольких файлов;
- progress по каждому файлу;
- backend upload/download/view/preview boundary;
- inline-просмотр изображений и видео;
- preview proxy для изображений и видео через локальный FFmpeg LGPL build;
- переиспользуемая frontend feature загрузки файлов;
- переиспользуемый fullscreen media viewer;
- передача загруженных файлов в пользовательские сценарии, например вложения чата.

Основные зоны:

- `gateways/files`;
- `shared/@types/files.d.ts`;
- `monolith/src/entities/files`;
- `monolith/src/features/file-upload`;
- `monolith/src/features/media-viewer`;
- `libs/FilePreviewProxy`;
- `models/files/StoredFileModel.ts`.

### Логи

- `services/log-collector` принимает логи через TCP socket;
- TCP-соединение с `log-collector` двустороннее: collector может запросить runtime metrics у подключенных packages;
- frontend view `/logs` с фильтрами по уровню, типу, источнику и поиском;
- пагинация логов через `limit` и `offset`;
- отдельный `kind` для типа записи:
  - `application`;
  - `collector_connection`;
  - `collector_disconnection`;
- `debug` не отправляется в `log-collector`;
- обычные `GET` и read-only `list*` calls не отправляются в `log-collector`;
- CRUD/mutation логируется на gateway boundary и как результат mutating service method;
- отключение сервиса или gateway от `log-collector` фиксируется как тревога `level: error`;
- `log-collector` не подключается сам к себе как client.

Основные зоны:

- `services/log-collector`;
- `models/logs/LogRecordModel.ts`;
- `shared/@types/logs.d.ts`;
- `monolith/src/views/logs/LogsView.vue`;
- `libs/Logger`;
- `docs/backend-architecture-conventions.md`.

### Runtime metrics

- админская страница состояния системы;
- `log-collector` опрашивает подключенные services/gateways по уже открытому TCP-соединению;
- наружу не открываются отдельные metrics endpoints каждого service/gateway;
- public gateway обращается только к `log-collector` и требует администратора;
- собираются CPU процесса, память процесса и хоста, диск, uptime, PID, hostname, platform и Node.js version.
- metrics собираются по запросу администратора, а не по таймеру;
- metrics snapshots не сохраняются в `log_records`;
- если package не подключен к `log-collector`, он не отображается как online;
- если package не ответил на `metrics_request`, collector возвращает `status: unavailable`.

Основные зоны:

- `libs/RuntimeMetrics`;
- `services/log-collector/src/services/LogCollectorSocketServer.ts`;
- `services/log-collector/src/controllers/SystemMetricsController.ts`;
- `gateways/public/src/controllers/SystemMetricsGatewayController.ts`;
- `shared/@types/system.d.ts`;
- `monolith/src/entities/system`;
- `monolith/src/views/system/SystemMetricsView.vue`.

### Тема интерфейса

- страница `/settings`;
- режимы темы: авто, светлая, темная;
- чтение `prefers-color-scheme`;
- сохранение выбора в `localStorage`;
- Tailwind dark mode через class strategy.

Основные зоны:

- `monolith/src/features/theme`;
- `monolith/src/views/settings/SettingsView.vue`;
- `monolith/tailwind.config.js`.

### Development orchestration

- root runner `index.js`;
- npm workspaces для `services/*`, `gateways/*`, `monolith`;
- discovery packages по директориям;
- package-local `.dev.env`, `.prod.env`, `.env.example`;
- localhost env generation;
- runtime database grants из `database-grants.json`;
- database setup, migrations, reset и seed через `services/database-migration`;
- исключение utility packages из `dev all` через `boilerplate.runWithDevAll: false`;
- typecheck/build/start-dist orchestration.

## Технологии

- Node.js;
- TypeScript;
- Vue 3;
- Vue Router;
- Vuex;
- Tailwind CSS;
- Socket.IO;
- Sequelize;
- MySQL-compatible database;
- Webpack для backend bundles;
- nginx как внешний edge boundary;
- FFmpeg LGPL build для preview proxy файлов.

## Структура проекта

```text
@types/
  backend/runtime global declarations

docs/
  правила архитектуры, conventions, checklist и runtime requirements

libs/
  общая backend infrastructure: HTTPServer, MicroServiceHTTPServer,
  WebSocketServer, Logger, Config, Exceptions, Validator, FilePreviewProxy

models/
  общие Sequelize model declarations и model factories

shared/
  @types/
    JSON-safe DTO/API/state contracts между frontend и backend

gateways/
  authorization/
    автономный authorization gateway
  public/
    публичный агрегирующий HTTP gateway к backend-сервисам
  files/
    автономный file upload/download/view gateway
  chat-realtime/
    WebSocket gateway для realtime-чата

services/
  users/
    backend-сервис пользователей и ролей
  chat/
    backend-сервис чата
  log-collector/
    сервис сбора логов
  database-migration/
    setup/migration/reset/seed utility package

monolith/
  Vue frontend-монолит

nginx/
  edge-конфигурация для static, proxy, CORS preflight и CSRF/Origin checks

index.js
  root runner CLI
```

## Архитектурная идея

Frontend-монолит зависит только от `shared/@types` и не импортирует backend runtime code.

Gateway packages являются boundary:

- публичный HTTP boundary использует `HTTPServer`;
- realtime boundary использует `WebSocketServer`;
- gateway проверяет authentication/access и вызывает service.

Backend services используют `MicroServiceHTTPServer`:

- только internal `POST` requests;
- обязательный `x-request-id`;
- обязательный `x-internal-service-token`;
- response envelope;
- без authentication, authorization, middleware pipeline и tracing.

Service layer содержит бизнес-логику и работу с данными. Service не знает HTTP status codes и не формирует HTTP response.

Schema и seed не выполняются runtime backend. База готовится заранее через `services/database-migration`.

## Быстрый старт development

### Требования

- Node.js и npm;
- MySQL-compatible database server;
- установленные npm dependencies;
- доступный FFmpeg LGPL binary, если нужны preview proxy для изображений/видео:

```text
libs/ffmpeg/lgpl/bin/ffmpeg.exe
```

### Установка зависимостей

```bash
npm install
```

или через root runner:

```bash
npm run project -- install
```

### Подготовка localhost окружения

Команда `localhost` генерирует package-local `.dev.env`, создает development database flow и запускает localhost:

```bash
npm run project -- localhost root password
```

Где `root password` — credentials database admin user для локального setup.

Root runner генерирует:

- package-local `.dev.env`;
- runtime database users из `database-grants.json`;
- `VAR_DB_RUNTIME_GRANTS` для migration package;
- frontend `VUE_APP_BASE_URL`;
- cookie domain `.gtrktuva.local` для стандартных localhost hostnames.

### Полный reset development database

```bash
npm run project -- reset
```

Команда выполняет development reset-flow:

1. удаляет development database;
2. выполняет setup database и service user;
3. применяет migrations;
4. выдает runtime grants;
5. выполняет development seed.

`reset` нельзя использовать для production.

### Запуск development

```bash
npm run project -- dev all
```

Можно запускать отдельные части:

```bash
npm run project -- dev frontend
npm run project -- dev service users
npm run project -- dev service chat
npm run project -- dev service log-collector
npm run project -- dev gateway public
npm run project -- dev gateway authorization
npm run project -- dev gateway files
npm run project -- dev gateway chat-realtime
```

## Production flow

Собрать все packages:

```bash
npm run project -- build all
```

Применить production migrations:

```bash
npm run project -- migrate dist
```

Запустить production bundle package:

```bash
npm run project -- start-dist service users
npm run project -- start-dist gateway public
```

Runtime backend в production:

- использует `.prod.env` внутри своего package;
- выполняет только database authentication;
- не вызывает `sequelize.sync()`;
- не запускает seed;
- не должен работать под admin database user.

## Root CLI

Все команды идут через:

```bash
npm run project -- <command>
```

Доступные команды:

```text
help         Показать список команд
install      Установить зависимости: install [all|frontend|service <name>|gateway <name>]
dev          Запустить разработку: dev [all|frontend|service <name>|gateway <name>]
build        Собрать проект: build [all|frontend|service <name>|gateway <name>]
typecheck    Проверить типы: typecheck [all|shared|frontend|service <name>|gateway <name>]
migrate      Выполнить миграции базы данных: migrate [dev|dist]
reset        Пересоздать development database: reset
localhost    Инициализировать development env из database-grants.json, пересоздать БД и запустить localhost
start-dist   Запустить production bundle: start-dist [service <name>|gateway <name>]
workspace    Запустить workspace script: workspace <workspace|frontend|service:name|gateway:name> <script> [...args]
```

Примеры:

```bash
npm run project -- help
npm run project -- install all
npm run project -- typecheck all
npm run project -- typecheck shared
npm run project -- build frontend
npm run project -- build gateway public
npm run project -- workspace service:database-migration setup
npm run project -- workspace service:database-migration grant-runtime
```

## Workspaces и package scripts

Корневой `package.json` содержит только workspace globs и минимальные orchestration scripts.

Backend service/gateway package обычно содержит:

```json
{
  "scripts": {
    "start": "nodemon",
    "start:dist": "node dist/app.js",
    "typecheck": "tsc --noEmit",
    "build": "webpack --config webpack.config.ts"
  }
}
```

Frontend package содержит:

```json
{
  "scripts": {
    "serve": "vue-cli-service serve",
    "build": "vue-cli-service build",
    "typecheck": "tsc --noEmit"
  }
}
```

Root runner не должен знать внутренние команды конкретного package сверх стандартных script names.

## Env-файлы

Каждый backend service и gateway владеет своими env-файлами:

```text
services/<service-name>/.dev.env
services/<service-name>/.prod.env
services/<service-name>/.env.example

gateways/<gateway-name>/.dev.env
gateways/<gateway-name>/.prod.env
gateways/<gateway-name>/.env.example
```

Frontend env находится в `monolith`.

Backend env должен явно задавать HTTP config:

```text
VAR_HTTP_PORT
VAR_HTTP_ORIGIN
VAR_HTTP_COOKIE_NAME
VAR_HTTP_PUBLIC_USER_COOKIE_NAME
VAR_HTTP_PUBLIC_USER_COOKIE_DOMAIN
VAR_HTTP_JWT_SECRET
VAR_HTTP_JWT_AUDIENCE
VAR_HTTP_JWT_ISSUER
```

Internal transport использует:

```text
VAR_INTERNAL_SERVICE_TOKEN
```

Log collector client использует:

```text
VAR_LOG_COLLECTOR_CLIENT_ENABLED
VAR_LOG_COLLECTOR_SOCKET_HOST
VAR_LOG_COLLECTOR_SOCKET_PORT
VAR_LOG_SOURCE
```

Для `services/log-collector` collector-client должен быть отключен:

```text
VAR_LOG_COLLECTOR_CLIENT_ENABLED=false
```

## Database grants

Каждый backend service и gateway должен иметь package-local:

```text
database-grants.json
```

Если package не обращается к БД напрямую:

```json
{
  "grants": []
}
```

Если package обращается к БД:

```json
{
  "grants": [
    {
      "table": "users",
      "operations": ["SELECT"]
    }
  ]
}
```

Разрешенные runtime operations:

- `SELECT`;
- `INSERT`;
- `UPDATE`;
- `DELETE`;
- `INDEX`;
- `REFERENCES`.

Runtime database users не получают `CREATE`, `ALTER`, `DROP`.
Schema changes выполняет только migration/setup process.

Root runner генерирует development database users по имени package:

```text
services/users -> users_svc
gateways/public -> public_gw
gateways/chat-realtime -> chat_realtime_gw
```

## Миграции

Миграции находятся в:

```text
services/database-migration/src/database/migrations
```

Они применяются в лексикографическом порядке.

При изменении Sequelize model нужно добавить SQL migration в той же задаче.
Runtime services и gateways не вызывают `sequelize.sync()`.

Команды:

```bash
npm run project -- migrate
npm run project -- migrate dist
npm run project -- reset
```

## Логирование

`log-collector` собирает не все подряд, а только значимые события.

Логируются:

- CRUD/mutation request на gateway boundary: `POST`, `PATCH`, `DELETE`;
- результат mutating service method: `create*`, `update*`, `delete*`, `send*`, `leave*`;
- controlled/internal ошибки;
- подключение backend service/gateway к `log-collector`;
- потеря подключения backend service/gateway к `log-collector`.

Не логируются:

- обычные `GET`;
- read-only internal `list*`;
- `debug` в collector;
- штатные browser WebSocket connect/disconnect;
- sensitive data.

Тип записи задается через `kind`:

```text
application
collector_connection
collector_disconnection
```

`collector_disconnection` пишется как `level: error`, потому что потеря канала доставки логов является тревогой.

## Runtime metrics

Runtime metrics доступны в админской панели:

```text
/system
```

Путь запроса:

```text
frontend /system
  -> GET /v1/gateway/system/metrics
  -> gateways/public
  -> POST /system/metrics
  -> services/log-collector
  -> metrics_request по TCP к подключенным packages
  -> metrics_response от packages
```

Метрики не открываются наружу на каждом service/gateway.
Единственная HTTP-точка для UI находится за `gateways/public` и требует администратора.

Пакет отвечает на `metrics_request` через `LogCollectorClient`.
Collector получает ответ и возвращает агрегированный список:

- `status: online` — package ответил;
- `status: unavailable` — package не ответил за timeout.

Собираемые данные:

- CPU процесса;
- memory процесса;
- общая и свободная memory хоста;
- disk usage рабочей директории процесса;
- uptime;
- PID;
- hostname;
- platform;
- Node.js version.

В metrics DTO нельзя добавлять secrets, env values, tokens, cookies, database credentials и другие чувствительные данные.

## Frontend conventions

Frontend использует слои:

```text
monolith/src/shared/api
monolith/src/application/api
monolith/src/application/router
monolith/src/application/store
monolith/src/application/realtime
monolith/src/entities/<domain>
monolith/src/features/<feature-name>
monolith/src/views
monolith/src/layouts
```

Правила:

- components не вызывают `fetch` напрямую;
- API clients возвращают распакованный `result`;
- Vuex modules живут в `entities/<domain>/store`;
- reusable workflows живут в `features`;
- локальные сценарии одного экрана остаются рядом с view;
- тексты UI на русском языке;
- Tailwind CSS используется как основной стиль UI.

## Backend conventions

Gateway:

- использует `HTTPServer`;
- проверяет authentication/access;
- валидирует payload на boundary;
- вызывает backend service через internal client;
- мапит service errors в HTTP response.

Backend service:

- использует `MicroServiceHTTPServer`;
- принимает только internal `POST`;
- требует `x-request-id`;
- требует `x-internal-service-token`;
- описывает endpoints в `src/controllers`;
- не содержит `src/routes`;
- не знает HTTP status codes в service layer.

Shared contracts:

- находятся в `shared/@types`;
- должны быть JSON-safe;
- не импортируют runtime code;
- являются общей границей frontend/backend.

## Добавление backend-сервиса

Минимальная структура:

```text
services/<service-name>/
  package.json
  tsconfig.json
  webpack.config.ts
  nodemon.json
  database-grants.json
  .env.example
  .dev.env
  .prod.env
  src/
    bin/
      index.ts
    controllers/
    database/
    services/
```

Обязательные решения перед созданием:

- какие таблицы использует service;
- какие runtime grants нужны;
- какие internal endpoints нужны;
- нужен ли service в `dev all`;
- нужны ли SQL migrations.

Если service обращается к БД, заполнить `database-grants.json`.
Если не обращается, оставить `"grants": []`.

Если package является utility process и не должен запускаться в `dev all`, добавить:

```json
{
  "boilerplate": {
    "runWithDevAll": false
  }
}
```

Новый service автоматически попадает в root orchestration, если лежит в `services/*` и использует стандартные scripts.
Если добавляется новый тип package или новый общий script, нужно обновить `index.js`.

## Добавление gateway

Минимальная структура аналогична service:

```text
gateways/<gateway-name>/
  package.json
  tsconfig.json
  webpack.config.ts
  nodemon.json
  database-grants.json
  .env.example
  .dev.env
  .prod.env
  src/
    bin/
      index.ts
    controllers/
    database/
    services/
```

Gateway бывает двух типов:

- автономная public boundary, например `gateways/authorization` или `gateways/files`;
- агрегатор backend services, например `gateways/public`;
- realtime boundary, например `gateways/chat-realtime`.

При добавлении публичного gateway нужно проверить и при необходимости обновить `nginx`.

Создание gateway не означает автоматическое подключение к frontend, navigation, routes или другим services.
Подключение выполняется отдельной задачей.

## Удаление service или gateway

При удалении package нужно пройти чеклист:

- удалить package directory из `services/*` или `gateways/*`;
- удалить связанные references в gateway clients, controllers и frontend API;
- удалить package-local routes/subscriptions;
- проверить `index.js`, если удалялся особый target kind или нестандартная orchestration logic;
- проверить `nginx`, если удалялся публичный gateway;
- проверить `database-grants.json` больше не участвует в localhost grants;
- удалить или сохранить SQL migrations осознанно;
- проверить shared contracts, если удаляемый package был владельцем DTO;
- запустить `npm run project -- typecheck all`.

Исторические migrations обычно не удаляются, если база уже могла быть применена в окружениях.
Если это чистый boilerplate reset без внешних окружений, удаление migrations возможно только осознанно.

## Добавление frontend entity

Структура:

```text
monolith/src/entities/<domain>/
  api/
  store/
  index.ts
```

Правила:

- использовать shared DTO из `shared/@types`;
- API methods размещать в `entities/<domain>/api`;
- Vuex module размещать в `entities/<domain>/store`;
- подключать module в `application/store/modules/index.ts`, если создан state;
- не подключать entity к routes/views/navigation без отдельного решения.

## Добавление frontend feature

Feature создается только для переиспользуемого пользовательского сценария.

Структура:

```text
monolith/src/features/<feature-name>/
  ui/
  model/
  index.ts
```

Если сценарий используется только в одном view, он остается локальным:

```text
monolith/src/views/<domain>/components/
```

## Добавление Sequelize model

При изменении model:

- соблюдать порядок declarations из `docs/sequelize-model-conventions.md`;
- добавить model factory;
- подключать модель в service database instance только если это входит в задачу;
- добавить SQL migration;
- обновить shared DTO только если меняется API JSON shape;
- запустить typecheck.

## Проверки перед завершением задачи

Базовая команда:

```bash
npm run project -- typecheck all
```

Если менялись shared contracts, проверить весь backend/frontend.
Если менялись migrations/schema, применить migrations или выполнить development reset.
Если менялись scripts/package orchestration, проверить `index.js`.
Если менялся публичный gateway, проверить `nginx`.
Если менялось логирование, свериться с политикой `log-collector`.

## Документация

Основные документы:

- `AGENTS.md` — общие правила работы агента и высокоуровневые ограничения;
- `docs/repository-architecture-conventions.md` — структура репозитория и package boundaries;
- `docs/backend-architecture-conventions.md` — backend, HTTP, DB, cookie, logging, realtime;
- `docs/backend-code-conventions.md` — backend code style;
- `docs/frontend-code-conventions.md` — frontend layers, UI, API, store;
- `docs/shared-contracts-conventions.md` — shared DTO contracts;
- `docs/sequelize-model-conventions.md` — Sequelize models;
- `docs/runtime-requirements.md` — требования development/production;
- `docs/project-checklist.md` — проверки перед запуском и завершением задач;
- `docs/implemented-features.md` — актуальный список реализованных фич;
- `docs/chat-room-lifecycle-policy.md` — lifecycle chat rooms.

Вся проектная документация пишется на русском языке.
