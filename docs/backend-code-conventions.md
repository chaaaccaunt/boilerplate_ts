# Правила backend-кода

## Использование Sequelize helpers

Агент не должен импортировать ORM helpers напрямую в services, controllers и иной прикладной код:

```ts
import { Op, fn } from "sequelize"
```

Вместо этого helpers должны браться от database instance:

```ts
const { Op, fn } = database.Sequelize
```

`database.sequelize` используется как live Sequelize connection instance.
`database.Sequelize` используется как доступ к статическим Sequelize helpers/runtime utilities, например `Op`, `fn`, `col`, `literal`, `where`.

Service не должен принимать весь `database` instance как зависимость.
Service должен получать только явно необходимые зависимости: конкретные models, набор models или Sequelize helpers.

Для типизации Sequelize helpers в service следует использовать глобальный namespace:

```ts
private readonly helpers: iDatabase.Database["Sequelize"]
```

Это ограничение нужно для будущей изоляции services: каждый service может быть вынесен в отдельный микросервис и подключаться к БД под отдельным логином с правами только на необходимые таблицы.

## Экспорты libs и глобальные типы

Все публичные exports общей backend infrastructure из `./libs` должны быть доступны через единый public barrel `@/libs`.

Прикладной код не должен импортировать напрямую из внутренних файлов libs:

```ts
import { Exceptions } from "@/libs/Exceptions"
import { Logger } from "@/libs/Logger"
import { iHTTPConfig } from "@/libs/HTTPServer"
```

Вместо этого runtime values должны импортироваться из `@/libs`:

```ts
import { Exceptions, Logger } from "@/libs"
```

Типы, экспортируемые из libs, должны быть объявлены в глобальном namespace `iLibs` в `./@types/libs.d.ts` и использоваться без локального импорта:

```ts
private readonly httpConfig: iLibs.iHTTPConfig
private readonly exceptions: iLibs.Exceptions
```

`AppConfiguration`, env helpers и готовый `config` относятся к libs и должны находиться внутри `./libs/Config`.
Отдельный bootstrap layer не используется.

## HTTP transport для gateway и микросервисов

Gateway и публичные API entrypoints используют `HTTPServer`.

`HTTPServer` отвечает за:

- генерацию `requestId`;
- trace request lifecycle через `TraceContext` / `MethodTracer`;
- authentication;
- payload validation;
- вызов controller boundary;
- передачу `requestId` в controller payload.

Backend-микросервисы используют `MicroServiceHTTPServer`.

`MicroServiceHTTPServer` отвечает только за internal HTTP transport между gateway и backend-сервисом:

- читает JSON payload без schema validation;
- требует header `x-request-id`;
- передает `requestId` в service-local callback payload;
- возвращает response envelope;
- логирует завершение internal request без trace.

`MicroServiceHTTPServer` не должен использовать `HTTPMiddlewares`, `PayloadValidator`, `TraceContext` или `MethodTracer`.

`requestId` передается между gateway и микросервисом через header `x-request-id`. Не добавлять `requestId` в shared DTO как domain field.

## Асинхронный код

Backend code не должен использовать `async/await` как стиль по умолчанию.

Для infrastructure, controllers и services предпочтителен обычный promise flow:

```ts
return service.find(payload.uid)
  .then((entity) => mapper.toDto(entity))
  .catch((error) => {
    throw new Exceptions.ControllerError.InternalError("Не удалось получить данные", { cause: error })
  })
```

`async/await` разрешен только там, где promise flow делает код менее читаемым из-за вложенности больше трех уровней или из-за необходимости явно выразить сложный последовательный сценарий.

Если используется `async/await`, ошибки должны быть явно обработаны на текущем слое или гарантированно проброшены в уже существующий mapper ошибок этого слоя. Нельзя оставлять неочевидные `await`-цепочки без понятной точки обработки ошибки.

В controller и service короткие методы, которые только вызывают один async dependency и мапят результат, должны писаться через `return dependency.method(...).then(...)`, а не через `async` + `await`.

## Production bundle backend

Production-сборка backend должна собираться как Node.js bundle.

Основной результат сборки временного backend-сервиса должен находиться в `./services/monolith/dist/app.js` и запускаться командой:

```bash
npm run start:service:monolith:dist
```

Backend bundle должен быть рассчитан на запуск без локальной папки `node_modules` рядом с `dist`.
Runtime-зависимости, необходимые приложению, должны попадать в bundle.

Webpack-конфигурация backend должна:

- использовать `target: "node"`;
- отключать browser polyfills для Node.js core modules;
- собирать единый server entrypoint без frontend-oriented code splitting;
- не включать optional database drivers, которые не используются проектом;
- оставлять MySQL runtime совместимым с `sequelize` и `mysql2`;
- использовать production-оптимизации, подходящие для крупных production-приложений.

Если проект меняет основной database dialect, список ignored optional database drivers в `./services/monolith/webpack.config.ts` должен быть пересмотрен явно.

## WebSocket gateways

WebSocket gateways текущего backend-сервиса должны располагаться в `./services/monolith/src/realtime`.

Gateway naming должен быть полным и доменным:

```text
UsersSocketGateway
NotificationsSocketGateway
AuthorizationSocketGateway
```

Сокращения вроде `AuthSocketGateway`, `WsGateway`, `MsgGateway` не используются.

Gateway должен описывать только transport-boundary события и не должен содержать бизнес-логику.
Бизнес-логика должна находиться в services.

WebSocket infrastructure находится в `./libs/WebSocketServer`.
Она подключается в service-local `bin/index.ts` по умолчанию.
Новые gateways должны подключаться явно через `webSocketServer.use(...)`.
