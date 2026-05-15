# Правила frontend-кода

## Структура API-клиента

Вызовы API на frontend должны использовать слоистую структуру:

```text
shared/@types
  JSON DTO contracts

monolith/src/shared/api
  transport: fetch, credentials, response envelope, API errors

monolith/src/entities/<domain>/api
  endpoint methods, типизированные shared DTO contracts

monolith/src/entities/<domain>/store
  Vuex module state/actions/mutations

monolith/src/views и components
  только UI
```

Components не должны вызывать `fetch` напрямую.
Vuex modules не должны вручную разбирать HTTP response envelope.
API clients не должны знать про Vuex, router или components.
Shared contracts не должны зависеть от frontend или backend runtime code.

## UI и стили

Все пользовательские сообщения приложения, тексты в верстке, labels, placeholders, кнопки, ошибки, уведомления, console messages и иные человекочитаемые строки должны быть написаны на русском языке, если пользователь явно не попросил другой язык.

Frontend использует Bootstrap как базовый CSS-фреймворк для layout, forms, buttons, alerts и стандартных utility-классов.

Глобальное подключение Bootstrap CSS должно выполняться на уровне entrypoint приложения, например в `monolith/src/main.ts`.

Кастомные стили должны оставаться локальными для component/view/layout и дополнять Bootstrap только там, где framework-классов недостаточно.

Не следует дублировать Bootstrap-паттерны собственными CSS-реализациями без явной причины.

## Обертка ответа

Все frontend API clients должны ожидать backend response envelope:

```ts
iSharedApi.ResponseEnvelope<TResult>
```

Domain API methods должны возвращать распакованный тип `result`:

```ts
login(payload: iSharedAuthorization.LoginPayloadDto): Promise<iSharedAuthorization.LoginResponseDto>
```

Transport errors и backend envelope errors должны нормализоваться в `monolith/src/shared/api`, а не в components.

HTTP errors, которые должны быть видны приложению, должны отправляться в Vuex `errors` module через единый `ApiClient`.

`HttpClient` и domain API clients не должны импортировать Vuex или dispatch store actions напрямую.
Единый `ApiClient` является application integration layer и получает Vuex store во время инициализации приложения.

## Аутентификация

Cookie-based authentication requests должны использовать `credentials: "include"`.

Domain API clients должны использовать shared DTO contracts для request payload и response result.

Frontend route guard должен проверять валидность сессии через:

```text
GET /v1/gateway/authorization/state
```

Guard должен принимать решение по HTTP status:

- `200` -> сессия валидна, переход разрешен;
- любой статус, отличный от `200` -> локальный authorization state очищается, пользователь перенаправляется на `/login`.

Access decisions должны зависеть только от результата `/authorization/state` и backend-проверок.

## Внешний URL dev-server

Frontend dev-server должен работать локально по умолчанию и поддерживать внешние HTTPS development domains при необходимости.

`VUE_APP_BASE_URL` зарезервирован для API base URL.

`VUE_APP_BASE_URL` является обязательной переменной окружения для frontend API client.

Если `VUE_APP_BASE_URL` не задан, frontend должен падать с понятной ошибкой и не должен подставлять fallback вроде пустой строки или `undefined`.

Если задан `VUE_APP_HOSTNAME`, `monolith/vue.config.js` должен выводить dev-server `allowedHosts` и HMR websocket settings из этого значения.

Пример:

```env
VUE_APP_HOSTNAME=https://node-dev.ru
```

Для `https` URL HMR должен использовать `wss`.
Для `http` URL HMR должен использовать `ws`.

## Модуль ошибок

Frontend должен использовать Vuex `errors` module для application-visible HTTP/API errors.

Единый `ApiClient` должен репортить API errors по умолчанию:

```ts
store.dispatch("errors/add", {
  code: error.code,
  message: error.message,
  status: error.status
})
```

Module самостоятельно создает `uid` и `createdAt`.

API calls могут отключить default error reporting только для ожидаемых локальных ошибок:

```ts
api.post({
  path: "/authorization/login",
  payload,
  reportError: false
})
```

Успешные API calls могут напрямую коммитить распакованный `result` в существующий Vuex module:

```ts
api.post({
  path: "/users",
  payload,
  commit: "users/addUser"
})
```

Vuex domain state должен жить в namespaced modules внутри `monolith/src/entities/store/modules`.
Root store должен только собирать modules и экспортировать типизированный `useStore`.

## Realtime client

Если проект использует realtime, frontend realtime-вызовы должны идти через единый `WebSocketClient` из `monolith/src/shared/realtime`.

Components не должны импортировать `socket.io-client` напрямую.
Компоненты получают realtime client через `useWebSocketClient`.

После успешной авторизации приложение может инициализировать WebSocket connection и подписки на application-level события в authenticated layout.

Подписки на события, которые нужны всему авторизованному приложению, не должны создаваться внутри отдельных views. Views могут подписываться только на локальные события экрана и обязаны отписываться при unmount.

Базовый порядок frontend realtime initialization:

```text
authorization success
router opens authenticated layout
MainLayout calls WebSocketClient.connect()
MainLayout registers application-level event subscriptions
domain event handler commits payload into Vuex modules
```

При logout frontend должен отписаться от application-level событий, очистить локальный authorization state и вызвать `WebSocketClient.disconnect()`.

WebSocket event callbacks должны использовать тот же envelope-подход, что и HTTP API:

- `ok: true`, `result`, `error: null`;
- `ok: false`, `result: null`, `error.code`, `error.message`.

CRUD notifications от backend должны обрабатываться через shared DTO contracts и Vuex modules. Компоненты не должны вручную синхронизировать списки сущностей в обход store.

Если пользователь сам выполнил CRUD operation через HTTP API, его локальное состояние должно обновляться из HTTP response. Realtime notification для этой операции по умолчанию получают остальные подключенные клиенты.

Если проект использует чат или передачу файлов, эти сценарии должны идти через shared contracts, domain API methods и Vuex modules, а не через прямой доступ из components к transport/runtime dependencies.
