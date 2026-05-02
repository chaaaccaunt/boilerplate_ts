# Правила frontend-кода

## Структура API-клиента

Вызовы API на frontend должны использовать слоистую структуру:

```text
shared/@types
  JSON DTO contracts

front/src/shared/api
  transport: fetch, credentials, response envelope, API errors

front/src/entities/<domain>/api
  endpoint methods, типизированные shared DTO contracts

front/src/entities/<domain>/store
  Vuex module state/actions/mutations

front/src/views и components
  только UI
```

Components не должны вызывать `fetch` напрямую.
Vuex modules не должны вручную разбирать HTTP response envelope.
API clients не должны знать про Vuex, router или components.
Shared contracts не должны зависеть от frontend или backend runtime code.

## UI и стили

Frontend использует Bootstrap как базовый CSS-фреймворк для layout, forms, buttons, alerts и стандартных utility-классов.

Глобальное подключение Bootstrap CSS должно выполняться на уровне entrypoint приложения, например в `front/src/main.ts`.

Кастомные стили должны оставаться локальными для component/view/layout и дополнять Bootstrap только там, где framework-классов недостаточно.

Не следует дублировать Bootstrap-паттерны собственными CSS-реализациями без явной причины.

## Обертка ответа

Все frontend API clients должны ожидать backend response envelope:

```ts
iSharedApi.ResponseEnvelope<TResult>
```

Domain API methods должны возвращать распакованный тип `result`:

```ts
login(payload: iSharedAuth.LoginPayloadDto): Promise<iSharedAuth.LoginResponseDto>
```

Transport errors и backend envelope errors должны нормализоваться в `front/src/shared/api`, а не в components.

HTTP errors, которые должны быть видны приложению, должны отправляться в Vuex `errors` module через единый `ApiClient`.

`HttpClient` и domain API clients не должны импортировать Vuex или dispatch store actions напрямую.
Единый `ApiClient` является application integration layer и получает Vuex store во время инициализации приложения.

## Аутентификация

Cookie-based authentication requests должны использовать `credentials: "include"`.

Domain API clients должны использовать shared DTO contracts для request payload и response result.

## Внешний URL dev-server

Frontend dev-server должен работать локально по умолчанию и поддерживать внешние HTTPS development domains при необходимости.

`VUE_APP_BASE_URL` зарезервирован для API base URL.

Если задан `VUE_APP_HOSTNAME`, `front/vue.config.js` должен выводить dev-server `allowedHosts` и HMR websocket settings из этого значения.

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

Успешные API calls могут напрямую коммитить распакованный `result`:

```ts
api.post({
  path: "/profile",
  payload,
  commit: "profile/setProfile"
})
```

Vuex domain state должен жить в namespaced modules внутри `front/src/entities/store/modules`.
Root store должен только собирать modules и экспортировать типизированный `useStore`.
