# Boilerplate TS

Fullstack boilerplate для проектов, где frontend остается единым Vue-монолитом, а backend разделен на самостоятельные gateway и service packages с подготовкой к микросервисной архитектуре.

README описывает только общие понятия и основные команды. Подробная структура проекта, правила, conventions, checklist и сценарии разработки находятся в `./docs`.

## Требования

- Node.js и npm;
- MySQL/MariaDB или PostgreSQL для готового init-flow;
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

Ключевые части проекта:

- `monolith` — единый frontend-монолит на Vue.
- `gateways/*` — публичные HTTP/WebSocket boundary.
- `services/*` — backend-сервисы и utility packages.
- `shared/@types` — JSON-safe contracts между frontend и backend.
- `libs` — общая backend infrastructure.
- `models` — общие Sequelize model declarations и factories.
- `scripts/project-runner` — root runner для разработки, сборки и инициализации development-окружения.

Подробная карта директорий и реализованных областей находится в `docs/project-structure.md`.

## Development

Установка зависимостей:

```bash
npm install
```

`development.config.json` хранит локальные настройки development-flow и не коммитится.
Пример находится в `development.config.example.json`.

Полный init-flow готовит локальное окружение разработки и запускает dev-режим.
Аргументы команды — host локальной СУБД и admin credentials локальной СУБД, а не пользователь приложения.
Режим прямого запуска без nginx задается в `development.config.json` через `localhost.noNginx`, debug-логирование — через `localhost.debug`.

```bash
npm run project -- init <db-host> <db-admin-user> <db-admin-password>
```

Примеры:

```bash
npm run project -- init localhost root <db-admin-password>
npm run project -- init localhost postgres <db-admin-password>
```

Готовый init-flow поддерживает `mysql` и `postgres`.
Sequelize runtime может работать с другими dialects, но для них нужно отдельно добавить development init-flow.
Подробнее: `docs/runtime-requirements.md`.

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

Runtime backend в production должен запускаться поверх заранее подготовленной database schema.

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
init        подготовить development окружение и запустить dev
start-dist  запустить production bundle backend package
workspace   запустить package-local script
```

## Где читать подробнее

- `AGENTS.md` — правила работы агента и высокоуровневые ограничения.
- `docs/project-structure.md` — структура проекта и назначение основных директорий.
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
