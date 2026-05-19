# Архитектурные правила backend

## Правила обработки HTTP

- nginx не входит в Node.js-приложение и не участвует в application logging.
- nginx обрабатывает edge-сценарии до передачи запроса в `httpServer`:
  - static request
  - OPTIONS request
  - method denied for nginx location
  - CSRF/Origin check для state-changing API requests
- CORS preflight headers `Access-Control-Allow-Methods` и `Access-Control-Allow-Headers` должны отправляться только на `OPTIONS` response на уровне nginx.
- Actual API responses от `httpServer` должны отправлять только CORS headers, необходимые браузеру для чтения ответа: `Access-Control-Allow-Origin`, `Access-Control-Allow-Credentials` и `Vary: Origin`.
- nginx использует `access_log` только для ответов с HTTP 405.
- Все API requests, прошедшие edge-проверки nginx, должны передаваться через `proxy_pass` в `httpServer`.
- Исключение допускается только для development-only режима `localhost noNginx`: если package-local env содержит `VAR_HTTP_ENABLE_PREFLIGHT=true`, `httpServer` может отвечать на browser preflight `OPTIONS` самостоятельно.

## Режим работы базы данных

Runtime backend-сервисы и gateway не управляют schema и начальными данными базы данных.

При любом значении `NODE_ENV` runtime приложение должно:

- выполнять только `database.sequelize.authenticate()`;
- не вызывать `database.sequelize.sync()`;
- не запускать seed;
- падать с ошибкой, если schema не подготовлена заранее.

Schema, системные роли, development seed и другие начальные данные должны подготавливаться отдельным package `services/database-migration` через setup, migrations, runtime grants и seed scripts.

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
Исключение — режим `localhost noNginx`, где эти headers отправляет `httpServer` при `VAR_HTTP_ENABLE_PREFLIGHT=true`.

Cookie policy должна быть явно описана и не должна подбираться fallback-значениями.

HTTP config contract должен быть строгим: все поля `iHTTPConfig` обязательны во всех backend packages, включая gateways, services, migration utility process и realtime gateway.
Package-local env-файлы должны явно задавать:

- `VAR_HTTP_PORT`;
- `VAR_HTTP_ORIGIN`;
- `VAR_HTTP_COOKIE_NAME`;
- `VAR_HTTP_PUBLIC_USER_COOKIE_NAME`;
- `VAR_HTTP_PUBLIC_USER_COOKIE_DOMAIN`;
- `VAR_HTTP_JWT_SECRET`;
- `VAR_HTTP_JWT_AUDIENCE`;
- `VAR_HTTP_JWT_ISSUER`.

Все authorization cookies должны выставляться с атрибутом `Domain`, равным домену второго уровня с ведущей точкой.
Например, для `testapi.gtrktuva.local` и `test.gtrktuva.local` cookie domain должен быть `.gtrktuva.local`.
Host-only cookies для authorization flow запрещены, потому что они ломают восстановление frontend-сессии и ролей между subdomain.
Runtime должен вычислять cookie domain из `VAR_HTTP_ORIGIN`; `VAR_HTTP_PUBLIC_USER_COOKIE_DOMAIN` остается частью env contract для совместимости, но не должен использоваться как sentinel `none` для отключения `Domain`.
Для стандартного localhost-flow root runner генерирует `VAR_HTTP_PUBLIC_USER_COOKIE_DOMAIN=.gtrktuva.local`, потому что `VAR_HTTP_ORIGIN` и `VUE_APP_BASE_URL` по умолчанию используют development hostnames `test.gtrktuva.local` и `testapi.gtrktuva.local`.
Исключение допускается только для development-only режима `localhost noNginx`: для `localhost` разрешены host-only cookies через `VAR_HTTP_ALLOW_HOST_ONLY_COOKIES=true`.
Пустые значения для HTTP config запрещены.

Authorization gateway должен выставлять две разные cookie:

- защищенную authorization cookie с JWT, имя которой задается обязательной переменной `VAR_HTTP_COOKIE_NAME`;
- публичную информативную user cookie, имя которой задается обязательной для authorization gateway переменной `VAR_HTTP_PUBLIC_USER_COOKIE_NAME`.

Authorization cookie с JWT и публичная user cookie должны получать одинаковый cookie domain второго уровня с ведущей точкой.
Эта настройка нужна не только для публичной user cookie, но и для защищенной authorization cookie, чтобы `/authorization/state`, WebSocket connection и frontend state restoration работали одинаково на subdomain одного site.

Публичная user cookie используется только frontend для восстановления отображаемого authorization state после обновления страницы.
Она должна содержать только JSON-safe публичные данные пользователя из shared contract, включая публичные роли, и не должна содержать password, password hash, authorization token, JWT claims, server-only metadata или ORM/runtime данные.
Публичная user cookie не является источником access decisions: backend и route guard должны доверять только защищенной authorization cookie/JWT и endpoint `/authorization/state`.
При logout и при невалидной authorization cookie backend должен очищать обе cookie.

Для cookie-based authentication CSRF/Origin-проверка выполняется на уровне nginx до `proxy_pass`.

- nginx должен проверять `Origin` для state-changing requests: `POST`, `PATCH`, `DELETE`;
- nginx должен разрешать только настроенный публичный frontend origin;
- при несовпадении origin nginx должен возвращать `403 Forbidden`;
- не раскрывать клиенту внутренние детали access policy.

`httpServer` не должен дублировать CSRF/Origin-проверку, если запросы проходят через настроенный nginx boundary.

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

Если authorization cookie отсутствует, просрочена или невалидна, endpoint должен вернуть ошибочный response и очистить authorization cookie.

Очистка cookies на pre-controller этапе должна выполняться через transport instructions middleware/httpServer, а не через controller.

Frontend route guard должен принимать решение по HTTP status:

- `200` -> сессия валидна, переход разрешен;
- любой статус, отличный от `200` -> frontend очищает локальный authorization state и перенаправляет пользователя на `/login`.

## Production schema

Production schema changes не должны выполняться через runtime `sequelize.sync()`.

Production database schema должна подготавливаться до запуска приложения отдельным процессом, выбранным конкретным проектом.
В этом boilerplate для такого процесса используется package `services/database-migration`, который применяет SQL-миграции и фиксирует их в таблице `database_migrations`.
Первичная настройка database и service user выполняется через `services/database-migration` script `setup`.
Setup-скрипт должен использовать admin credentials только для создания database, создания service user и выдачи явно указанных прав.
Runtime backend не должен запускаться под admin database user.
Runtime backend-сервис или gateway должен использовать service database user с минимальными правами на конкретные таблицы.
Права должны соответствовать runtime-сценариям package, а не удобству dev seed или миграций.
Если package только читает таблицы, например authorization gateway читает `users`, `roles` и `user_roles`, его database user должен иметь только `SELECT` на эти таблицы.

Runtime backend в production отвечает за подключение к БД и проверку готовности schema через реальные запросы, но не изменяет schema самостоятельно.

`httpServer` является входной точкой обработки API request и обязан:

- parse request
- resolve route
- generate request id
- extract token/cookie
- authenticate
- validate payload

`httpServer` должен возвращать:

- `400 Bad Request` при некорректном формате запроса или невозможности корректно обработать входные данные на уровне HTTP/parsing.
- `401 Unauthorized` при отсутствии токена, невалидном токене или ошибке аутентификации.
- `404 Not Found` при отсутствии route.
- `422 Unprocessable Content` при ошибке валидации payload.

Если pre-controller этап завершен успешно, `httpServer` обязан передать управление в controller через `return controller.callback(request, response)`.

Для gateway-сценариев `httpServer` передает controller payload с `requestId`.
Если controller вызывает backend-сервис, `requestId` должен быть передан в сервисный запрос через header:

```text
x-request-id
```

`requestId` относится к transport/request context и не должен становиться частью domain DTO.

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
- log business events with request id, если request id был передан transport boundary

Service не должен знать о HTTP status codes напрямую.
Service не должен возвращать HTTP response и не должен принимать архитектурные решения уровня transport/protocol.
Controller является слоем, который преобразует ошибки service в HTTP response.

## Backend microservice HTTP transport

Backend-микросервисы должны использовать `MicroServiceHTTPServer` из `./libs/MicroServiceHTTPServer`.

`MicroServiceHTTPServer` предназначен только для internal requests от gateway и не является публичным HTTP boundary.

`MicroServiceHTTPServer` обязан:

- принимать обязательный header `x-request-id`;
- принимать только `POST` requests с JSON payload;
- передавать `requestId` в service-local callback payload;
- возвращать JSON response envelope;
- логировать завершение internal request с `requestId`;
- логировать ошибку internal request с `requestId`.

`MicroServiceHTTPServer` не должен:

- генерировать новый `requestId`;
- выполнять authentication или authorization;
- запускать middleware pipeline;
- валидировать payload по schema;
- принимать business payload через query string;
- использовать `GET`, `PATCH` или `DELETE` для internal gateway-to-service transport;
- использовать `TraceContext`, `TraceStep` или `MethodTracer`;
- логировать request trace.

Если `x-request-id` отсутствует, `MicroServiceHTTPServer` должен вернуть controlled `400 Bad Request`.
Если internal request использует метод, отличный от `POST`, `MicroServiceHTTPServer` должен вернуть controlled `400 Bad Request`.

Backend-сервисы должны описывать internal endpoints через service-local controllers в `services/<service-name>/src/controllers`.
Папка `routes` внутри backend-сервисов не используется.
Service controllers должны наследоваться от общего `MicroServiceController` из `./libs/MicroServiceController`.
`MicroServiceController` является владельцем общей логики `getRoutes`, `addRoutes` и wrapping route callback metadata.
Service-local controllers не должны заново объявлять собственные реализации `getRoutes`, `addRoutes` или общего `handle`, если достаточно базового поведения `MicroServiceController`.

Gateway controllers должны наследоваться от общего `HTTPController` из `./libs/HTTPController`.
`HTTPController` является владельцем общей логики `getRoutes`, `addRoutes`, role-based access helper и преобразования service errors в controller errors.
Package-local `BaseController` в gateway packages не используется, чтобы правила HTTP boundary не расходились между authorization, public и files gateway.

Internal route regex в service controllers должен соответствовать фактическому формату matcher в `MicroServiceHTTPServer`: `<METHOD>:<path>`.
Так как internal transport разрешает только `POST`, route должен объявляться с префиксом `POST:`.

Пример:

```ts
const listRoute: iContracts.iMicroServiceRoute<iContracts.iPayload, iSharedUser.ListUsersResponseDto> = {
  url: /^POST:\/users\/list\/?$/,
  method: "POST",
  callback: this.handle(this.service.constructor.name, "list", this.list.bind(this))
}
```

Route regex вида `/^\/users\/list\/?$/` для `MicroServiceHTTPServer` недопустим, потому что он не совпадет с проверяемой строкой `POST:/users/list`.

Gateway остается владельцем внешней authentication, authorization, request tracing и payload validation.
Микросервис может проверять только business invariants внутри service layer и логировать бизнес-логику через единый `Logger`.

Если gateway создан как самостоятельная публичная boundary в обход `gateways/public`, он должен быть автономным и не должен проксировать базовую domain logic в одноименный backend-микросервис.
Такой gateway использует `HTTPServer`, собственный service layer и собственный database bootstrap внутри package.
Отдельный backend-микросервис для него создается только по явному архитектурному решению проекта, а не как обязательное продолжение факта существования gateway.

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
- Базовая инфраструктура пользователей и системных ролей описана в `./docs/users-and-roles-conventions.md`.

## WebSocket transport

WebSocket transport является опциональным модулем boilerplate и используется только в проектах, которым нужен realtime.

Базовая инфраструктура WebSocket находится в:

```text
libs/WebSocketServer
```

Доменные realtime gateways должны находиться в package того gateway, который владеет realtime boundary, например:

```text
gateways/chat-realtime/src/realtime
```

Если проект использует realtime, `WebSocketServer` подключается в `gateways/<gateway-name>/src/bin/index.ts` к тому же native HTTP server.
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

## CRUD realtime notifications

Если проект использует realtime CRUD notifications, backend отправляет подключенным клиентам WebSocket server соответствующее realtime-событие с JSON-safe payload.

По умолчанию CRUD notification отправляется всем авторизованным клиентам, кроме инициатора операции. Инициатор получает результат операции через HTTP response envelope.

Если доменный сценарий требует уведомить также инициатора или ограничить аудиторию конкретными пользователями/room, это должно быть явно описано в project-specific policy.

Событие должно описывать уже выполненное изменение, а не намерение выполнить действие:

- create -> `<domain>:created`;
- update -> `<domain>:updated`;
- delete -> `<domain>:deleted`.

Payload события должен быть описан в shared DTO contracts и не должен содержать password, password hash, authorization token, server-only metadata, ORM instances или Node-only types.

HTTP response на CRUD request остается обычным response envelope. Realtime-событие является отдельным broadcast side effect после успешного выполнения service operation.

Если операция завершилась ошибкой, WebSocket notification отправлять нельзя.

Backend boundary для CRUD notification:

```text
controller
  check access
  call service
  after successful service result -> emit realtime event except actor
  return HTTP response
```

Service не должен знать про socket.io, WebSocket server instance или transport event names.

Для универсальных CRUD notifications следует использовать infrastructure method WebSocket server, а не обращаться к native socket.io server напрямую из controller.

Если событие должно быть доступно не всем пользователям, фильтрация аудитории выполняется на gateway/transport boundary или через явно описанную project-specific access policy. Boilerplate не должен молча зашивать такие правила.

Доменные realtime gateways являются аналогом controller boundary:

- проверяют доступ к событию или вызывают service-level access check без загрузки лишних данных;
- вызывают service для бизнес-логики;
- не раскрывают frontend внутренние ошибки service/database.

## Межсервисные realtime-события

Если CRUD operation выполняется внутри backend-сервиса, который не владеет WebSocket boundary, сервис не должен обращаться к socket.io, `WebSocketServer` или конкретному realtime gateway напрямую.

Для таких сценариев проекту необходимо реализовать отдельный процесс доставки domain events:

```text
backend service
  выполняет CRUD
  публикует domain event

event delivery layer
  outbox / message broker / другой явно выбранный механизм

realtime gateway
  читает domain event
  проверяет аудиторию
  отправляет WebSocket event онлайн-клиентам
```

В boilerplate этот процесс не реализован намеренно, чтобы не добавлять обязательную инфраструктуру уровня outbox или message broker.
Если проекту нужны realtime notifications о CRUD операциях внутренних сервисов, нужно сначала выбрать и описать механизм доставки событий, формат domain event, retry/ack policy и границы ответственности realtime gateway.

## Семантика логирования

nginx не включается в logging map.

### Критически важная политика log-collector

`log-collector` не является request trace viewer и не должен собирать все подряд.
В `log-collector` отправляются только события, которые помогают понять изменение состояния системы, результат пользовательской mutation или проблему доставки логов.

Обязательно логировать в `log-collector`:

- CRUD/mutation request на gateway boundary: `POST`, `PATCH`, `DELETE`;
- результат работы backend-сервиса для mutating methods, например `create*`, `update*`, `delete*`, `send*`, `leave*`;
- controlled и internal ошибки gateway/service, даже если они произошли на read-only request;
- подключение backend-сервиса или gateway к `log-collector`;
- потерю подключения backend-сервиса или gateway к `log-collector`.

Не логировать в `log-collector`:

- обычные `GET` requests;
- read-only internal service calls, например `list*`;
- `debug`-логи;
- штатные WebSocket connect/disconnect пользовательских browser-сокетов;
- payload повторно на нескольких слоях;
- password, token, cookie, secret, authorization headers и другие чувствительные данные;
- временные диагностические логи после завершения задачи.

`debug`-логи используются только как локальная диагностическая детализация runtime и не отправляются в `log-collector`.

Записи `log-collector` должны иметь отдельный `kind`, который описывает тип события независимо от severity `level`:

- `application` — прикладные runtime-события, включая CRUD gateway request и service result;
- `collector_connection` — backend-сервис или gateway подключился к `log-collector`;
- `collector_disconnection` — backend-сервис или gateway потерял подключение к `log-collector`.

Для package `services/log-collector` collector-client должен быть отключен через `VAR_LOG_COLLECTOR_CLIENT_ENABLED=false`, чтобы сервис не подключался к собственному socket-серверу и не создавал ложные тревоги о self-disconnect.

Подключение backend-сервиса или gateway к `log-collector` выделяется записью `kind: collector_connection`, `level: info`, `message: Подключение к log collector установлено`.
Отключение backend-сервиса или gateway от `log-collector` фиксируется самим `log-collector` как `kind: collector_disconnection`, `level: error`, `message: Потеряно подключение к log collector`, потому что потеря канала доставки логов является тревожным событием.

`log-collector` использует двусторонний TCP protocol с подключенными backend-сервисами и gateway.
По этому соединению разрешены только:

- доставка log records от package к `log-collector`;
- внутренний запрос `metrics_request` от `log-collector` к package;
- ответ `metrics_response` от package к `log-collector`.

Метрики CPU, памяти, диска и runtime-информации не открываются отдельными публичными endpoints на каждом service/gateway.
Админская панель запрашивает метрики только у `log-collector` через защищенный admin endpoint public gateway, а `log-collector` опрашивает уже подключенные internal clients по TCP.

## Runtime metrics

Runtime metrics являются operational/admin diagnostic data и не должны становиться публичной API-поверхностью каждого backend-сервиса или gateway.

Цель фичи:

- быстро увидеть, какие backend packages подключены к `log-collector`;
- получить текущий runtime snapshot package по запросу администратора;
- не создавать отдельные внешние metrics endpoints на services/gateways;
- не писать регулярные metrics snapshots в `log_records`;
- не превращать `log-collector` в шумный time-series storage.

Сбор runtime metrics выполняется только по запросу:

```text
admin UI
  -> GET /v1/gateway/system/metrics
  -> gateways/public
  -> POST /system/metrics
  -> services/log-collector
  -> metrics_request по TCP к подключенным packages
  -> metrics_response по TCP от packages
```

`GET /v1/gateway/system/metrics` должен:

- требовать authorization;
- проверять роль `administrator` на уровне controller;
- обращаться только к `services/log-collector`;
- не проксировать запросы напрямую к остальным services/gateways.

`services/log-collector` должен:

- хранить только активные TCP connections clients, которые уже подключились для доставки логов;
- отправлять `metrics_request` только по этим existing internal connections;
- возвращать `status: online` для ответивших packages;
- возвращать `status: unavailable` при timeout ответа package;
- не выполнять сетевой scan портов и не открывать отдельные public/internal HTTP endpoints для metrics на каждом package.

Package, получивший `metrics_request`, отвечает `metrics_response` с JSON-safe DTO из `shared/@types/system.d.ts`.

Runtime metrics DTO содержит:

- `source`;
- `packageKind`;
- `pid`;
- `hostname`;
- `platform`;
- `nodeVersion`;
- `uptimeSeconds`;
- `checkedAt`;
- CPU процесса;
- memory процесса и host memory;
- disk usage для рабочей директории процесса.

CPU percentage вычисляется по delta между текущим и предыдущим замером внутри процесса.
Первый замер может вернуть `usagePercent: null`, потому что для вычисления процента нужен предыдущий snapshot.

Disk metrics собираются по запросу администратора, а не по таймеру.
Не добавлять регулярный сбор disk metrics без отдельного решения о retention, нагрузке и storage.

Ограничения runtime metrics:

- не добавлять metrics в `log_records`;
- не логировать каждый metrics request как application log;
- не отправлять metrics snapshots в `log-collector` по таймеру;
- не раскрывать metrics endpoint через nginx напрямую;
- не показывать страницу metrics обычным пользователям;
- не добавлять secrets, env values, tokens, cookies или database credentials в metrics DTO.

Frontend admin page находится в:

```text
monolith/src/views/system/SystemMetricsView.vue
```

Frontend получает metrics через entity:

```text
monolith/src/entities/system
```

Shared contract находится в:

```text
shared/@types/system.d.ts
```

Логирование выполняется только на уровнях:

- `httpServer`
- `microServiceHTTPServer`
- `webSocketServer`
- `controller`
- `gateway`
- `service`

### httpServer

- `info` -> state-changing gateway request завершен успешно
- `warn` -> token validation error
- `warn` -> payload parse error
- `warn` -> payload validation failed
- `debug` -> controller call:
  - controller name
  - controller method
  - sanitized payload
- `error` -> unhandled server error

Обычные `GET` requests не отправляются в `log-collector`.
Gateway request log пишется только для state-changing методов `POST`, `PATCH` и `DELETE`.

### microServiceHTTPServer

- `warn` -> отсутствует или некорректен `x-request-id`
- `info` -> результат работы сервиса для mutating service method завершен успешно
- `warn` -> internal request завершен controlled client/domain error
- `error` -> internal request завершен internal error
- Не логировать trace.
- Не логировать payload повторно.

Read-only internal methods, например `list*`, не отправляются в `log-collector`.
Service result log пишется для mutating methods с префиксами `create`, `update`, `delete`, `send`, `leave`, а также для ошибок.

### webSocketServer

- `warn` -> token validation error
- `warn` -> payload validation failed
- `debug` -> WebSocket событие получено:
  - event name
  - sanitized payload
- `error` -> unhandled WebSocket transport error

Рядовые события подключения и отключения WebSocket-клиентов не логируются, чтобы не засорять журнал при refresh, reconnect и навигации пользователя.

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
- `info` -> DB mutation
- `debug` -> method success
- `info` -> entity not found
- `warn` -> conflict / business rule failed
- `error` -> DB error / internal exception
- service logs должны включать `requestId`, если service вызван из gateway или `MicroServiceHTTPServer`.
- Глобальное Sequelize logging должно быть выключено; SQL логируется точечно через `DatabaseServiceTools.createDatabaseQueryLogger`.
- Runtime SQL-запросы, которые меняют данные, должны логироваться с `mutation: true` и проходить через `sanitizeSql`.
- Read-only SQL-запросы можно логировать только как `debug` для диагностики, если это нужно конкретному сервисному методу.
- `sanitizeSql` обязан скрывать пароль в SQL. Если в SQL могут появиться token, cookie, secret или другие чувствительные поля, очистку нужно расширить до включения такого логирования.

## Ограничения

- Не смешивать HTTP handling rules и logging semantics в одной логике принятия решений.
- Не включать nginx в logging map.
- Не логировать пароль, токен, cookie, персональные данные и иные чувствительные данные в открытом виде.
- Не писать raw SQL в лог в обход `DatabaseServiceTools.sanitizeSql`.
- Использовать только sanitized payload, если логирование payload действительно необходимо.
- Не логировать payload повторно на уровнях controller и service.
- Не дублировать одинаковые логи без необходимости.
- Не менять уровень логирования без явной причины.
- Не переносить HTTP status mapping в service.
- Не использовать service как слой HTTP-ответов.
- Не добавлять authentication, authorization, payload validation, middleware pipeline или tracing в `MicroServiceHTTPServer`.
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
├─ CSRF/Origin fail -> 403
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
- Агент не должен вручную дублировать расширенный контекст в сообщении лога без необходимости.
- Временные диагностические логи, не соответствующие logging map, должны удаляться перед завершением задачи.

