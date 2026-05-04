# Архитектурные правила backend

## Правила обработки HTTP

- nginx не входит в приложение и не участвует в application logging.
- nginx обрабатывает только свои технические сценарии:
  - static request
  - OPTIONS request
  - method denied for nginx location
- CORS preflight headers `Access-Control-Allow-Methods` и `Access-Control-Allow-Headers` должны отправляться только на `OPTIONS` response на уровне nginx.
- Actual API responses от `httpServer` должны отправлять только CORS headers, необходимые браузеру для чтения ответа: `Access-Control-Allow-Origin`, `Access-Control-Allow-Credentials` и `Vary: Origin`.
- nginx использует `access_log` только для ответов с HTTP 405.
- Все API requests должны передаваться через `proxy_pass` в `httpServer`.

## Режим работы базы данных

Backend использует только один переключатель режима работы с БД: `NODE_ENV`.

При `NODE_ENV=production` приложение должно:

- выполнять только `database.sequelize.authenticate()`;
- не вызывать `database.sequelize.sync()`;
- не запускать seed;
- падать с ошибкой, если production schema не подготовлена заранее.

При любом другом значении `NODE_ENV` приложение должно:

- выполнять `database.sequelize.authenticate()`;
- затем обязательно выполнять `database.sequelize.sync()`;
- затем обязательно запускать dev seed.

Отдельный env-флаг для включения или отключения `sync()` не используется.

Разделение production и development БД должно обеспечиваться разными env-файлами:

- `.prod.env` должен указывать production database и production database user;
- `.dev.env` должен указывать development database и development database user.

Production database user по возможности не должен иметь прав на изменение структуры таблиц.

## Cookie, CORS и CSRF

Actual API responses от `httpServer` должны отправлять только CORS headers, необходимые браузеру для чтения ответа:

- `Access-Control-Allow-Origin`;
- `Access-Control-Allow-Credentials`;
- `Vary: Origin`.

Preflight headers `Access-Control-Allow-Methods` и `Access-Control-Allow-Headers` должны отправляться только на `OPTIONS` response на уровне nginx.

Cookie policy должна быть явно описана и не должна подбираться fallback-значениями.

Для cookie-based authentication необходимо отдельно определить CSRF-стратегию. Минимальная стратегия для boilerplate:

- проверять `Origin` для state-changing requests: `POST`, `PATCH`, `DELETE`;
- разрешать только `config.http.origin`;
- при несовпадении origin возвращать `403 Forbidden`;
- не раскрывать клиенту внутренние детали access policy.

## Проверка состояния авторизации

Frontend route guard должен проверять состояние авторизации через API endpoint:

```text
GET /v1/gateway/authorization/state
```

Backend route `/authorization/state` должен использовать `requireAuthorization: true`, а `httpServer` должен выполнить `httpTokenValidator` на pre-controller этапе.

Если authorization cookie и JWT валидны, endpoint должен вернуть `200 OK` и стандартный response envelope:

```json
{
  "ok": true,
  "result": {
    "authenticated": true
  },
  "error": null
}
```

Если authorization cookie отсутствует, просрочена или невалидна, endpoint должен вернуть ошибочный response и очистить все cookies, связанные с авторизацией:

- authorization cookie;
- profile cookie.

Очистка cookies на pre-controller этапе должна выполняться через transport instructions middleware/httpServer, а не через controller.

Frontend route guard должен принимать решение по HTTP status:

- `200` -> сессия валидна, переход разрешен;
- любой статус, отличный от `200` -> frontend очищает локальный authorization state/profile cache и перенаправляет пользователя на `/login`.

## Публичная profile cookie

После успешной авторизации backend может установить дополнительную публичную profile cookie для frontend bootstrap.

Profile cookie:

- не должна быть `httpOnly`;
- должна содержать только безопасный JSON profile для отображения интерфейса;
- не должна содержать пароль, password hash, authorization token, internal identifiers и иные чувствительные данные;
- не должна использоваться для принятия access decisions.

authorization cookie остается единственным источником подтверждения сессии.

Profile cookie является только UI-cache. Backend access decisions должны опираться на валидный authorization cookie/JWT и server-side проверки.

## Миграции

Production schema changes не должны выполняться через runtime `sequelize.sync()`.

Production database schema должна подготавливаться отдельным migration process до запуска приложения.

Допустимые варианты migration runner:

- Umzug;
- sequelize-cli;
- собственный минимальный migration runner.

Для boilerplate предпочтителен Umzug, если нет отдельного требования к другому инструменту.

Runtime backend в production отвечает за подключение к БД и проверку готовности schema через реальные запросы, но не изменяет schema самостоятельно.

`httpServer` является входной точкой обработки API request и обязан:

- parse request
- resolve route
- extract token/cookie
- authenticate
- validate payload

`httpServer` должен возвращать:

- `400 Bad Request` при некорректном формате запроса или невозможности корректно обработать входные данные на уровне HTTP/parsing.
- `401 Unauthorized` при отсутствии токена, невалидном токене или ошибке аутентификации.
- `404 Not Found` при отсутствии route.
- `422 Unprocessable Content` при ошибке валидации payload.

Если pre-controller этап завершен успешно, `httpServer` обязан передать управление в controller через `return controller.callback(request, response)`.

Controller обязан:

- check access
- call service
- map service errors to HTTP response

Controller должен возвращать:

- `403 Forbidden` при access denied.
- `404 Not Found` при `NotFoundError`.
- `409 Conflict` при `ConflictError`.
- `500 Internal Server Error` при `InternalError` или иной необработанной внутренней ошибке.

Service обязан:

- execute business logic
- access DB
- throw domain/internal errors

Service не должен знать о HTTP status codes напрямую.
Service не должен возвращать HTTP response и не должен принимать архитектурные решения уровня transport/protocol.
Controller является слоем, который преобразует ошибки service в HTTP response.

## Формат API-ответа

Все API responses должны возвращаться как JSON с `Content-Type: application/json; charset=utf-8`.

Исключение: download endpoints, которые явно возвращают содержимое файла, могут отдавать бинарный response с корректными `Content-Type` и `Content-Disposition`.

Upload/download файлов должны корректно поддерживать UTF-8 и кириллицу в именах файлов:

- multipart parser должен читать filename-параметры как UTF-8;
- metadata файла должна хранить оригинальное имя файла без потери кириллицы;
- download response должен отдавать `Content-Disposition` с `filename*` в UTF-8;
- для совместимости можно дополнительно отдавать ASCII-safe `filename`, но он не должен заменять оригинальное UTF-8 имя.

`httpServer` обязан использовать единый response envelope.

Успешный response:

- `ok: true`
- `result: <response payload>`
- `error: null`

Ошибочный response:

- `ok: false`
- `result: null`
- `error.code: string`
- `error.message: string`

Данные успешного ответа должны передаваться в поле `result`, чтобы не создавать `response.data.data` на frontend.

Controller не должен формировать response envelope вручную.
Service не должен формировать response envelope вручную.

Controller может вернуть transport instructions через controller result, например `setCookies` или `clearCookies`, но `httpServer` обязан применить их и самостоятельно сформировать итоговый JSON response.

## Аутентификация и авторизация

- Boilerplate не должен зашивать конкретную role-based access policy в ядро.
- Базовый token payload должен быть project-neutral: `uid` и optional `claims`.
- Конкретные роли, permissions, ownership rules, tenant rules и endpoint access policy определяются проектом, а не boilerplate.
- Подробные правила для агентов описаны в `./docs/agent-authorization-policy.md`.

## WebSocket transport

WebSocket transport является базовой частью boilerplate и запускается по умолчанию вместе с HTTP server.

Базовая инфраструктура WebSocket находится в:

```text
back/src/libs/WebSocketServer
```

Доменные realtime gateways должны находиться в:

```text
back/src/realtime
```

`WebSocketServer` подключается в `back/src/bin/index.ts` к тому же native HTTP server.
Новые gateways подключаются явно через `webSocketServer.use(...)`.

WebSocket архитектура:

```text
WebSocketServer
  принимает подключение
  извлекает authorization cookie/JWT
  валидирует пользователя
  валидирует payload события
  вызывает gateway

Gateway
  описывает события домена
  проверяет доступ к событию
  вызывает service

Service
  выполняет бизнес-логику
  работает с данными
  не знает про socket.io, socket instance или WebSocket protocol
```

Payload события должен валидироваться по схеме конкретного события.
Один общий payload validator на весь socket не используется.

WebSocket errors должны возвращаться в event callback в формате, совместимом с API envelope:

- `ok: true`, `result`, `error: null`;
- `ok: false`, `result: null`, `error.code`, `error.message`.

WebSocket transport не должен раскрывать клиенту внутренние детали service/controller ошибок.

Boilerplate содержит базовый chat gateway с поддержкой:

- публичного чата;
- групповых чатов;
- приватных чатов;
- сообщений с файлами.

Chat gateway является realtime-аналогом controller boundary:

- проверяет доступ к событию или вызывает service-level access check без загрузки лишних данных;
- вызывает service для бизнес-логики;
- не раскрывает frontend внутренние ошибки service/database.

Событие `chat:room:join` должно только проверить доступ к комнате и подписать socket на room channel.
Загрузка сообщений должна выполняться отдельным событием `chat:messages:list`.

## Семантика логирования

nginx не включается в logging map.

Логирование выполняется только на уровнях:

- `httpServer`
- `webSocketServer`
- `controller`
- `gateway`
- `service`

### httpServer

- `info` -> route resolved
- `info` -> route not found
- `warn` -> token validation error
- `warn` -> payload parse error
- `warn` -> payload validation failed
- `debug` -> controller call:
  - controller name
  - controller method
  - sanitized payload
- `error` -> unhandled server error

### webSocketServer

- `info` -> WebSocket подключение установлено
- `info` -> WebSocket подключение закрыто
- `warn` -> token validation error
- `warn` -> payload validation failed
- `debug` -> WebSocket событие получено:
  - event name
  - sanitized payload
- `error` -> unhandled WebSocket transport error

### controller

- `info` -> controller name, controller method name
- `debug` -> service call:
  - service name
  - service method
  - request context
- `warn` -> access denied
- `error` -> controller exception

### gateway

- `info` -> gateway name, event name
- `debug` -> service call
- `warn` -> access denied
- `error` -> gateway exception

### service

- `info` -> service name, service method name
- `debug` -> method start
- `debug` -> DB call
- `debug` -> method success
- `info` -> entity not found
- `warn` -> conflict / business rule failed
- `error` -> DB error / internal exception

## Ограничения

- Не смешивать HTTP handling rules и logging semantics в одной логике принятия решений.
- Не включать nginx в logging map.
- Не логировать пароль, токен, cookie, персональные данные и иные чувствительные данные в открытом виде.
- Использовать только sanitized payload, если логирование payload действительно необходимо.
- Не логировать payload повторно на уровнях controller и service.
- Не дублировать одинаковые логи без необходимости.
- Не менять уровень логирования без явной причины.
- Не переносить HTTP status mapping в service.
- Не использовать service как слой HTTP-ответов.
- Проверка access на уровне endpoint должна выполняться в controller.
- Бизнес-логика и работа с данными должны выполняться в service.
- Ошибки service должны преобразовываться в HTTP status codes только на уровне controller.
- Каждый лог должен содержать достаточно контекста для понимания источника события.
- Payload разрешено логировать только в очищенном виде как sanitized payload.
- Payload должен логироваться только один раз на запрос и только на уровне `httpServer` в событии `controller call`.

## Справочная архитектура

```text
user
|
v
nginx
├─ static request   -> 200 / 404
├─ OPTIONS request  -> 204
├─ method denied    -> 405
└─ API request      -> proxy_pass
                          |
                          v
                          httpServer
                          ├─ parse request
                          ├─ resolve route
                          ├─ extract token/cookie
                          ├─ authenticate
                          ├─ validate payload
                          └─ fail -> 400 / 401 / 404 / 422
                          |
                          v
                          controller
                          ├─ check access
                          ├─ call service
                          ├─ map NotFoundError -> 404
                          ├─ map ConflictError -> 409
                          ├─ map InternalError -> 500
                          └─ fail -> 403
                          |
                          v
                          service
                          ├─ execute business logic
                          ├─ access DB
                          └─ throw domain/internal errors
```

## Политика логирования при разработке

- Во время разработки агент обязан соблюдать logging map по месту возникновения события и его уровню.
- Формат вывода и расширенный контекст логов определяются DevDebugger.
- Агент не должен вручную дублировать расширенный контекст в сообщении лога без необходимости.
- Временные диагностические логи, не соответствующие logging map, должны удаляться перед завершением задачи.

