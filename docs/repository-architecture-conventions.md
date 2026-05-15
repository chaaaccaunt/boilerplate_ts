# Архитектура репозитория

## Назначение

Репозиторий является boilerplate для fullstack-проектов, где frontend остается единым монолитным приложением, а backend постепенно подготавливается к микросервисной архитектуре.

## Корневая структура

Базовая структура репозитория:

```text
@types/
models/
libs/
gateways/
monolith/
shared/
  @types/
services/
  monolith/
    src/
      bin/
      database/
      controllers/
      services/
```

## Назначение директорий

- `monolith` содержит frontend-монолит.
- `gateways` содержит backend gateway-приложения, которые являются публичной HTTP/WebSocket boundary.
- `services` содержит backend-сервисы.
- `services/monolith` содержит текущий временный backend-сервис, который пока не разбит на доменные микросервисы.
- `libs` содержит общую backend infrastructure для сервисов.
- `models` содержит общие Sequelize model declarations и model factories, пока backend-сервисы используют общую схему данных.
- `@types` содержит backend/runtime global declarations для backend-сервисов.
- `shared/@types` содержит только сериализованные JSON DTO/API/state contracts между frontend и backend.

## Границы зависимостей

`shared/@types` не должен импортировать runtime code из `libs`, `models`, `services` или `monolith`.

Frontend-монолит может использовать только `shared/@types` как контракт с backend. Frontend не должен зависеть от backend runtime code, Sequelize models, controllers, services или infrastructure libraries.

Backend-сервисы могут использовать:

- `libs` для общей infrastructure;
- `models` для общих Sequelize models, если сервис работает с общей схемой;
- `@types` для backend global declarations;
- `shared/@types` для JSON DTO/API contracts.

`libs` не должен зависеть от конкретных backend-сервисов, controllers, domain services или project-specific authorization policy.

`libs/HTTPServer` используется gateway и публичными API boundary.
`libs/MicroServiceHTTPServer` используется backend-микросервисами для internal requests от gateway.

## Самостоятельные packages

Frontend-монолит, каждый gateway и каждый backend-сервис должны быть самостоятельными npm workspace packages.

Каждый package должен владеть своими:

- `package.json`;
- npm dependencies/devDependencies;
- scripts;
- TypeScript/build/dev-server config;
- runtime env/config contract.

Runtime-среда backend-сервиса или gateway должна настраиваться через `AppConfiguration` из `./libs/Config`.
Env helpers и готовый `config` также должны использоваться из `./libs/Config`; отдельный bootstrap layer для конфигурации не используется.

Каждый backend-сервис и каждый gateway должны иметь собственные env-файлы внутри своей package-директории:

```text
services/<service-name>/.dev.env
services/<service-name>/.prod.env
services/<service-name>/.env.example

gateways/<gateway-name>/.dev.env
gateways/<gateway-name>/.prod.env
gateways/<gateway-name>/.env.example
```

Env-файлы backend-сервисов и gateway не должны быть общими на уровне корня репозитория, потому что параллельно запущенные packages должны иметь независимые `VAR_HTTP_PORT`, database settings и другие runtime-параметры.
Файл `.env.example` должен находиться рядом с package-local env-файлами и описывать все переменные, необходимые этому конкретному backend-сервису или gateway.
Root runner должен запускать package-local scripts с рабочей директорией соответствующего package, чтобы `AppConfiguration` читал env-файлы из директории конкретного backend-сервиса или gateway.
`AppConfiguration` не должен искать env-файлы выше текущей package-директории и не должен использовать root-level env как fallback для backend-сервисов или gateway.

Корневой `package.json` должен содержать только workspace globs и минимальные orchestration scripts.
Корневой `index.js` должен запускать package-local scripts, но не должен знать внутренние команды конкретного сервиса сверх стандартных script names: `start`, `build`, `typecheck`, `start:dist`.

Новый package подключается к корневому orchestration через расположение:

```text
gateways/<gateway-name>/package.json
services/<service-name>/package.json
monolith/package.json
```

Добавление нового package не должно требовать добавления отдельного script в корневой `package.json`.

## Нейминг

Нейминги в коде, документации, URL, routes, API endpoints, DTO, переменных, методах, файлах и директориях не должны сокращаться без явной причины и отдельного согласования.

URL, routes и API endpoints должны иметь полные, читаемые и однозначные названия. Сокращения вроде `auth`, `cfg`, `usr`, `pwd`, `msg` не используются, если пользователь явно не попросил такой формат.

## Временный backend-сервис

`services/monolith` является переходным backend-сервисом.

Агент не должен разбивать `services/monolith` на доменные микросервисы без отдельного явного запроса пользователя.

Агент не должен переносить код из `services/monolith` в `gateways/*` без отдельного явного запроса пользователя.

При создании нового backend-сервиса структура должна быть service-local:

```text
services/
  authorization/
    src/
      bin/
      database/
      controllers/
      services/
```

Создание нового сервиса не означает автоматическое подключение его к root scripts, gateway, frontend или другим сервисам. Подключение выполняется только по отдельному явному запросу.
