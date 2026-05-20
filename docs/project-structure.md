# Структура проекта

Документ описывает практическую карту репозитория: какие директории существуют, за что они отвечают и где искать основные части приложения.

Архитектурные правила и ограничения для этих директорий описаны отдельно в `docs/repository-architecture-conventions.md`.

## Корневая структура

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

## Frontend-монолит

`monolith` содержит единое Vue-приложение.

Frontend не импортирует backend runtime code. Он работает с backend через API-клиенты, realtime-клиент и contracts из `shared/@types`.

Основные frontend-слои:

- `application` — сборка приложения, router, store, API/realtime providers;
- `entities` — доменные frontend-сущности, API methods и Vuex modules;
- `features` — переиспользуемые пользовательские сценарии;
- `views` — экраны приложения;
- `layouts` — оболочки приложения;
- `shared` — низкоуровневые UI/API/realtime primitives.

## Shared contracts

`shared/@types` содержит JSON-safe DTO/API/state contracts между frontend и backend.

Shared contracts описывают только данные, которые пересекают HTTP или realtime boundary. Они не должны зависеть от Sequelize models, backend services, controllers или Node-only runtime values.

## Gateway packages

`gateways/*` содержит публичные или realtime boundary приложения.

Gateway отвечает за транспортный слой:

- HTTP или WebSocket boundary;
- authentication;
- endpoint-level access checks;
- payload validation;
- вызовы backend services;
- преобразование service errors в HTTP/WebSocket response.

Gateway может быть:

- автономной публичной boundary, например `gateways/authorization` или `gateways/files`;
- агрегатором backend-сервисов, например `gateways/public`;
- realtime boundary, например `gateways/chat-realtime`.

## Backend service packages

`services/*` содержит backend-сервисы с бизнес-логикой и доступом к данным.

Service package не является публичной boundary. Internal HTTP transport между gateway и service строится через `MicroServiceHTTPServer`.

Service layer не знает HTTP status codes и не формирует HTTP responses. Он выполняет бизнес-логику, работает с БД и выбрасывает доменные или внутренние ошибки.

`services/database-migration` является utility package для подготовки БД, миграций, начальных данных и прав доступа.

## Backend infrastructure

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

## Database

`models` содержит общие Sequelize model declarations и model factories.

Runtime packages работают с уже подготовленной schema. Schema, начальные данные и runtime database grants подготавливаются через `services/database-migration`.

## Root runner

Корневой `index.js` — тонкая CLI-точка входа для разработки и сборки.

Основная логика root runner находится в `scripts/project-runner`. Runner обнаруживает workspaces, запускает package-local scripts и готовит development окружение.

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
- development orchestration и init-flow.

Актуальный список реализованных фич находится в `docs/implemented-features.md`.
