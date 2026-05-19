# Boilerplate TS

Fullstack boilerplate для проектов, где frontend остается единым Vue-монолитом, а backend разделен на самостоятельные gateway и service packages с подготовкой к микросервисной архитектуре.

README описывает проект на уровне понятий. Детальные правила, conventions, checklist и сценарии разработки находятся в `./docs`.

## Базовые требования

- Node.js и npm;
- MySQL-compatible database server;
- установленные npm dependencies;
- nginx для полного edge-flow;
- FFmpeg LGPL binary для preview proxy файлов, если нужны превью изображений и видео.

## Идея проекта

Проект задает базовую архитектуру приложения, в котором:

- frontend развивается как один монолитный пользовательский интерфейс;
- публичные backend boundary вынесены в отдельные gateway packages;
- бизнес-логика backend размещается в service packages;
- frontend и backend синхронизируются через shared JSON contracts;
- база данных подготавливается отдельным migration/setup process;
- локальная разработка управляется единым root runner.

Главная цель boilerplate — дать стартовую структуру, где границы frontend, gateway, service, database и shared contracts уже разведены и могут масштабироваться без хаотичного смешивания слоев.

## Основные понятия

### Frontend-монолит

`monolith` — единое Vue-приложение.

Frontend не импортирует backend runtime code. Он работает с backend только через API-клиенты и `shared/@types`.

Основные frontend-слои:

- `application` — сборка приложения, router, store, API/realtime providers;
- `entities` — доменные frontend-сущности, API methods и Vuex modules;
- `features` — переиспользуемые пользовательские сценарии;
- `views` — экраны приложения;
- `layouts` — оболочки приложения;
- `shared` — низкоуровневые UI/API/realtime primitives.

### Shared contracts

`shared/@types` содержит JSON-safe DTO/API/state contracts между frontend и backend.

Shared contracts описывают только данные, которые действительно пересекают HTTP или realtime boundary. Они не должны зависеть от Sequelize models, backend services, controllers или Node-only types.

### Gateway

`gateways/*` — публичные или realtime boundary приложения.

Gateway отвечает за транспортный слой:

- HTTP или WebSocket boundary;
- authentication;
- endpoint-level access checks;
- payload validation;
- вызовы backend services;
- преобразование service errors в HTTP/WebSocket response.

Gateway может быть:

- автономной публичной boundary, например authorization или files;
- агрегатором backend-сервисов, например public gateway;
- realtime boundary, например chat realtime gateway.

### Backend service

`services/*` — backend-сервисы с бизнес-логикой и доступом к данным.

Service package не является публичной boundary. Internal HTTP transport между gateway и service строится через `MicroServiceHTTPServer`.

Service layer не знает HTTP status codes и не формирует HTTP responses. Он выполняет бизнес-логику, работает с БД и выбрасывает доменные или внутренние ошибки.

### Backend infrastructure

`libs` содержит общую backend infrastructure:

- HTTP server;
- HTTP controller base;
- microservice HTTP server;
- WebSocket server;
- configuration;
- logging;
- database service tools;
- validation;
- exceptions;
- runtime metrics;
- file preview helpers.

Прикладной backend-код использует публичную поверхность `@/libs`, а не внутренние файлы infrastructure напрямую.

### Models

`models` содержит общие Sequelize model declarations и model factories.

Изменение модели не заменяет миграцию. Если меняется schema, соответствующая SQL migration добавляется в `services/database-migration`.

### Database migration

`services/database-migration` — отдельный utility package для подготовки БД.

Runtime services и gateways:

- не вызывают `sequelize.sync()`;
- не создают schema;
- не выполняют seed;
- работают под package-specific database user с минимальными runtime grants.

Schema, grants и development seed готовятся отдельным migration/setup flow.

### Root runner

Корневой `index.js` — тонкая CLI-точка входа для разработки и сборки.

Основная логика root runner находится в `scripts/project-runner`. Она обнаруживает workspaces, запускает package-local scripts, генерирует localhost env и собирает package-local runtime database grants из `package.config.json`.

## Структура

```text
@types/       backend/runtime global declarations
docs/         архитектура, conventions, checklist, runtime requirements
libs/         общая backend infrastructure
models/       общие Sequelize models и factories
shared/       JSON-safe contracts между frontend и backend
gateways/     публичные HTTP/WebSocket boundary
services/     backend-сервисы и utility packages
monolith/     Vue frontend-монолит
nginx/        edge-конфигурация
scripts/      root runner modules
index.js      root runner entrypoint
```

## Реализованные области

В boilerplate уже есть базовая end-to-end функциональность:

- аутентификация и восстановление frontend authorization state;
- управление пользователями и ролями;
- чат с комнатами, сообщениями, вложениями и realtime notifications;
- загрузка файлов, download/view endpoints и preview proxy;
- fullscreen media viewer;
- тема интерфейса;
- сбор application logs через `log-collector`;
- runtime metrics через `log-collector`;
- development orchestration, migrations, grants и localhost flow.

Актуальный список реализованных фич находится в `docs/implemented-features.md`.

## Development

Установка зависимостей:

```bash
npm install
```

Полный localhost-flow:

```bash
npm run project -- localhost root password
```

Development без локального nginx:

```bash
npm run project -- localhost noNginx root password
```

Обычный запуск разработки:

```bash
npm run project -- dev all
```

Проверка типов:

```bash
npm run project -- typecheck all
```

## Production

Production flow строится вокруг заранее подготовленной БД и package-local `.prod.env`.

Базовые команды:

```bash
npm run project -- build all
npm run project -- migrate dist
npm run project -- start-dist service users
npm run project -- start-dist gateway public
```

Runtime backend в production должен работать под отдельными database users с минимальными правами и не должен выполнять schema changes или seed.

## Root CLI

Все команды идут через:

```bash
npm run project -- <command>
```

Основные команды:

```text
help        показать справку
install     установить зависимости
dev         запустить development
build       собрать packages
typecheck   проверить типы
migrate     применить миграции
localhost   подготовить localhost env, БД, grants, seed и запустить dev
start-dist  запустить production bundle backend package
workspace   запустить package-local script
```

## Где читать подробнее

- `AGENTS.md` — правила работы агента и высокоуровневые ограничения.
- `docs/repository-architecture-conventions.md` — структура репозитория и границы packages.
- `docs/backend-architecture-conventions.md` — backend, HTTP, DB, cookies, logging, realtime.
- `docs/backend-code-conventions.md` — правила backend-кода.
- `docs/frontend-code-conventions.md` — frontend layers, UI, API, store.
- `docs/shared-contracts-conventions.md` — shared DTO/API contracts.
- `docs/sequelize-model-conventions.md` — Sequelize models.
- `docs/runtime-requirements.md` — требования development и production.
- `docs/project-checklist.md` — проверки перед запуском и завершением задач.
- `docs/implemented-features.md` — реализованные фичи.
- `docs/chat-room-lifecycle-policy.md` — lifecycle chat rooms.

Вся проектная документация ведется на русском языке.
