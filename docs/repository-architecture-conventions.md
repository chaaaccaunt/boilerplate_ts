# Архитектура репозитория

## Назначение

Репозиторий является boilerplate для fullstack-проектов, где frontend остается единым монолитным приложением, а backend постепенно подготавливается к микросервисной архитектуре.

## Корневая структура

Базовая структура репозитория:

```text
@types/
models/
libs/
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

## Временный backend-сервис

`services/monolith` является переходным backend-сервисом.

Агент не должен разбивать `services/monolith` на доменные микросервисы без отдельного явного запроса пользователя.

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
