# Правила backend-кода

## Работа с Sequelize и DB tools

Агент не должен импортировать ORM helpers напрямую в services, controllers и иной прикладной код:

```ts
import { Op, fn } from "sequelize"
```

Вместо этого services, которые работают с БД, должны получать `DatabaseServiceTools` из `@/libs`.
Этот класс хранит разрешенные Sequelize helpers и фабрику логирования SQL-запросов:

```ts
private readonly databaseTools: iLibs.DatabaseServiceTools
```

`database.sequelize` используется как live Sequelize connection instance.
`database.Sequelize` используется как доступ к статическим Sequelize helpers/runtime utilities, например `Op`, `fn`, `col`, `literal`, `where`.

Service не должен принимать весь `database` instance как зависимость.
Service должен получать только явно необходимые зависимости: конкретные models, набор models и `DatabaseServiceTools`, если нужны ORM helpers или SQL logging.

Bootstrap package создает helper один раз и передает его в service:

```ts
const databaseTools = new DatabaseServiceTools(database.Sequelize, logger)
const service = new UsersService(database.models.User, database.models.Role, database.models.UserRole, databaseTools)
```

В service нужно обращаться к helpers через `databaseTools.Op`, `databaseTools.fn`, `databaseTools.col`, `databaseTools.literal`.
Это оставляет ORM-зависимости внутри общего infrastructure слоя и не размазывает прямые импорты Sequelize по прикладному коду.

Это ограничение нужно для будущей изоляции services: каждый service может быть вынесен в отдельный микросервис и подключаться к БД под отдельным логином с правами только на необходимые таблицы.

## Логирование SQL-запросов

Глобальное Sequelize logging должно быть выключено в `AppConfiguration.getDatabaseConfig()`.
Иначе SQL-запросы появляются там, где нет `requestId`, service context и политики очистки чувствительных данных.

Для runtime-запросов, которые меняют данные, service должен передавать в Sequelize option `logging` через `DatabaseServiceTools.createDatabaseQueryLogger`.
Такие запросы логируются как `info` с событием `DB mutation`.

```ts
return this.userModel.create({
  login: payload.login,
  password: hashSync(payload.password, 10)
}, {
  logging: this.databaseTools.createDatabaseQueryLogger({
    requestId,
    serviceName: "UsersService",
    serviceMethod: "create",
    event: "users insert query",
    mutation: true
  })
})
```

Read-only SQL-запросы можно логировать тем же helper только для локальной диагностики и debug-сценариев.
Обычный production runtime не должен превращать каждый read-запрос в application log.

`sanitizeSql` внутри `DatabaseServiceTools` обязан скрывать пароль перед записью SQL в лог.
Сейчас в boilerplate чувствительным SQL-полем является `password`; если в schema появятся `token`, `cookie`, `secret` или другие секреты, правила очистки должны быть расширены в `sanitizeSql` до включения SQL logging для этих полей.

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

Gateway-to-service clients должны отправлять internal requests только методом `POST` с JSON body.
Business payload не должен передаваться через query string.
Опция `method: "GET"` во внутренних клиентах gateway-to-service не используется.

`MicroServiceHTTPServer` не должен использовать `HTTPMiddlewares`, `PayloadValidator`, `TraceContext` или `MethodTracer`.

`requestId` передается между gateway и микросервисом через header `x-request-id`. Не добавлять `requestId` в shared DTO как domain field.

Gateway controllers должны наследоваться от `HTTPController` из `@/libs`.
`HTTPController` используется как общий базовый класс для `getRoutes`, `addRoutes`, проверки ролей через `access` и общего `handle`, который преобразует service errors в controller errors.

Service controllers должны наследоваться от `MicroServiceController` из `@/libs`.
`MicroServiceController` должен использоваться как общий базовый класс для `getRoutes`, `addRoutes` и metadata wrapper route callback.
Папка `routes` внутри `services/<service-name>/src` не используется.

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

Основной результат сборки backend-сервиса должен находиться в `./services/<service-name>/dist/app.js` и запускаться командой:

```bash
npm run project -- start-dist service <service-name>
```

Backend bundle должен быть рассчитан на запуск без локальной папки `node_modules` рядом с `dist`.
Runtime-зависимости, необходимые приложению, должны попадать в bundle.

Webpack-конфигурация backend должна:

- использовать `target: "node"`;
- отключать browser polyfills для Node.js core modules;
- собирать единый server entrypoint без frontend-oriented code splitting;
- не включать optional database drivers, которые не используются проектом;
- оставлять runtime совместимым с выбранным Sequelize dialect и соответствующим driver package;
- учитывать `dialectModule` из Sequelize config, чтобы выбранный driver попадал в bundle предсказуемо;
- использовать production-оптимизации, подходящие для крупных production-приложений.

Если проект меняет основной database dialect, список ignored optional database drivers в `./services/<service-name>/webpack.config.ts` должен быть пересмотрен явно.
Одновременно нужно пересмотреть `AppConfiguration.getDatabaseConfig()`, package dependencies и migration/setup SQL, потому что Sequelize dialect меняет driver, синтаксис подключения и допустимые DDL/GRANT операции.
В текущей конфигурации production bundle должен сохранять `mysql2`, `pg`, Sequelize dialects `mysql` и `postgres`, но игнорировать optional `pg-native`, если проект не принимает отдельное решение использовать native PostgreSQL driver.

## WebSocket gateways

WebSocket gateways должны располагаться в package того gateway, который владеет realtime boundary, например `./gateways/chat-realtime/src/realtime`.

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
