# Правила frontend-кода

## Структура API-клиента

Вызовы API на frontend должны использовать слоистую структуру:

```text
shared/@types
  JSON DTO contracts

monolith/src/shared/api
  transport: fetch, credentials, response envelope, API errors

monolith/src/application/api
  application-level ApiClient, provide/inject helpers, frontend API base URL binding

monolith/src/application/router
  router creation and route guards

monolith/src/application/store
  root Vuex store creation and module composition

monolith/src/application/realtime
  WebSocketClient provide/inject helpers and frontend realtime base URL binding

monolith/src/entities/<domain>/api
  endpoint methods, типизированные shared DTO contracts

monolith/src/entities/<domain>/store
  Vuex module state/actions/mutations

monolith/src/features/<feature-name>
  переиспользуемые пользовательские сценарии, которые собирают UI, domain entities и application clients

monolith/src/views/<domain>/components
  локальные компоненты конкретного экрана

monolith/src/views
  экраны приложения

monolith/src/layouts/<layout-name>/components
  локальные компоненты конкретного layout

monolith/src/layouts
  layout wrappers приложения
```

Components не должны вызывать `fetch` напрямую.
Vuex modules не должны вручную разбирать HTTP response envelope.
API clients не должны знать про Vuex, router или components.
Shared contracts не должны зависеть от frontend или backend runtime code.

## Слои frontend

`application` содержит только сборку приложения и cross-cutting integration:

- root `ApiClient` и provide/inject helpers;
- root `router` и route guards;
- root `store` и композицию Vuex modules;
- realtime provide/inject helpers;
- application-level providers, например modal host.

`application` не должен содержать domain API methods, domain Vuex mutations, бизнес-сценарии конкретного экрана или UI конкретной сущности.

`entities` содержит доменные сущности frontend-приложения.
Каждая доменная сущность должна располагаться в собственной директории:

```text
monolith/src/entities/<domain>/
  api/
  store/
  index.ts
```

`api` внутри entity описывает backend endpoints этого домена и возвращает распакованные shared DTO.
`store` внутри entity описывает Vuex module state/actions/mutations этого домена.
`index.ts` entity экспортирует только публичную поверхность домена.

`features` содержит только переиспользуемые пользовательские сценарии.
Перед созданием feature агент обязан сначала оценить переиспользование сценария.

Feature создается, если сценарий:

- используется или явно планируется к использованию в нескольких views/layouts;
- нужен нескольким доменам;
- должен иметь единую реализацию UI/model logic в разных местах приложения;
- является общим workflow, например загрузка файла, выбор файла, универсальное подтверждение действия или переиспользуемый поиск.

Локальный сценарий, который используется только внутри одного экрана, не должен выноситься в `features`.
Он должен располагаться рядом с view:

```text
monolith/src/views/<domain>/components/
```

Например, форма создания пользователя, которая используется только внутри `UsersView`, должна быть локальным компонентом:

```text
monolith/src/views/users/components/UserCreateForm.vue
```

Загрузка файла, которая используется в чате, профиле, вложениях и других местах, должна быть feature:

```text
monolith/src/features/file-upload/
  ui/
  model/
  index.ts
```

Полноэкранный просмотр медиафайлов, который может использоваться в чате, профиле, вложениях и других местах, должен быть feature:

```text
monolith/src/features/media-viewer/
  ui/
  model/
  index.ts
```

Локальные chat components могут открывать `media-viewer`, но не должны содержать собственную отдельную реализацию полноэкранного просмотра изображений и видео.

Feature может использовать `application` clients, `entities` и `shared`, но entity не должна импортировать feature.

`shared` содержит низкоуровневые переиспользуемые вещи без знания домена и приложения:

- transport clients;
- API/realtime primitives;
- generic UI primitives;
- чистые utility/helpers.

`views` и `layouts` собирают экран из локальных components, `features`, `entities`, `application` providers и `shared/ui`.
Логика пользовательского сценария может оставаться локальной во view component, если она не переиспользуется и относится только к этому экрану.
Если сценарий становится повторяемым или начинает использоваться несколькими экранами, его нужно вынести в `features`.

Каждый layout должен располагаться в собственной директории:

```text
monolith/src/layouts/<layout-name>/
  <LayoutName>Layout.vue
  components/
```

Локальные части layout, например sidebar, header, logout modal или layout-only navigation, должны находиться в `monolith/src/layouts/<layout-name>/components`.
Если layout component становится переиспользуемым между разными layouts, его нужно вынести в `shared/ui` или `features`, если это пользовательский сценарий.

## Создание frontend entity

При создании новой frontend entity агент обязан:

- создать директорию `monolith/src/entities/<domain>`;
- использовать полное доменное имя без необоснованных сокращений;
- добавить `index.ts` как единую публичную точку entity;
- разместить backend endpoint methods в `monolith/src/entities/<domain>/api`;
- разместить domain Vuex module в `monolith/src/entities/<domain>/store`, если сущность имеет frontend state;
- подключить domain Vuex module в `monolith/src/application/store/modules/index.ts`, если module создан;
- использовать shared DTO contracts из `shared/@types`, а не backend runtime-типы;
- не импортировать `router`, root `store`, Vue components или `application` composition helpers внутрь domain Vuex module;
- не создавать `features` автоматически при создании entity, если пользователь явно не запросил пользовательский сценарий;
- не подключать новую entity к views, routes, navigation или realtime subscriptions без отдельного явного запроса.

Создание entity не означает автоматическое изменение UI, router, navigation, root API client или application subscriptions.
Подключение выполняется только отдельным явным запросом пользователя.

Если для entity нужен новый backend/shared JSON shape, агент обязан сначала обновить shared DTO contract и только затем использовать его в frontend API/store.

## Создание frontend feature

При создании новой frontend feature агент обязан:

- убедиться, что сценарий действительно переиспользуемый, а не локальный для одного view;
- использовать директорию `monolith/src/features/<feature-name>`;
- использовать полное сценарное имя без необоснованных сокращений;
- создать `index.ts` как единую публичную точку feature;
- размещать UI-компоненты feature в `ui`;
- размещать composables/model logic feature в `model`, если логика выходит за пределы простого component-local state;
- использовать `application` helpers для доступа к root API/store/realtime;
- использовать `entities` через их публичную поверхность или доменные API/state contracts;
- использовать shared DTO contracts из `shared/@types`;
- не вызывать `fetch`, `socket.io-client` или backend transport напрямую;
- не создавать root store/router/api clients внутри feature;
- не импортировать feature внутрь `entities`, `shared` или `application`.

Если сценарий используется только внутри одного экрана, агент обязан создать локальный компонент в:

```text
monolith/src/views/<domain>/components/
```

Например:

- локальное создание пользователя внутри `UsersView` -> `monolith/src/views/users/components/UserCreateForm.vue`;
- переиспользуемая загрузка файла -> `monolith/src/features/file-upload`;
- локальный фильтр таблицы пользователей -> `monolith/src/views/users/components`;
- переиспользуемый выбор пользователя для разных экранов -> `monolith/src/features/user-select`.

Создание feature не означает автоматическое подключение ее к route, navigation, view, layout или modal.
Подключение выполняется только по отдельному явному запросу пользователя.

## Создание frontend layout

При создании нового frontend layout агент обязан:

- создать директорию `monolith/src/layouts/<layout-name>`;
- использовать полное имя layout без необоснованных сокращений;
- назвать root component в формате `<LayoutName>Layout.vue`;
- размещать локальные компоненты layout в `monolith/src/layouts/<layout-name>/components`;
- держать в layout только shell-логику приложения: navigation, header/sidebar composition, layout-level providers, layout-level subscriptions;
- не размещать в layout domain-specific формы, таблицы или сценарии конкретного view;
- не создавать feature автоматически для локального layout component;
- подключать layout в `App.vue` или router meta только по явному запросу.

Например:

```text
monolith/src/layouts/main/
  MainLayout.vue
  components/
    MainSidebar.vue
    MainHeader.vue
    LogoutModal.vue

monolith/src/layouts/login/
  LoginLayout.vue
```

## UI и стили

Все пользовательские сообщения приложения, тексты в верстке, labels, placeholders, кнопки, ошибки, уведомления, console messages и иные человекочитаемые строки должны быть написаны на русском языке, если пользователь явно не попросил другой язык.

Frontend использует Tailwind CSS как основной CSS-фреймворк для layout, spacing, typography, forms, buttons, alerts, tables, modal layers и стандартных UI-состояний.

Глобальное подключение Tailwind CSS должно выполняться на уровне entrypoint приложения через единый файл стилей, например `monolith/src/assets/styles/tailwind.css`, импортируемый в `monolith/src/main.ts`.

UI в `monolith/src/views`, `monolith/src/layouts` и frontend components должен описываться преимущественно Tailwind utility-классами прямо в template.

Scoped `<style>` blocks, BEM-классы и собственные CSS/SCSS-реализации layout/forms/buttons не используются по умолчанию.
Кастомный CSS допускается только для случаев, которые сложно или нецелесообразно выразить Tailwind-классами: сложная анимация, сторонний widget, canvas/графика, browser-specific workaround или повторяемый низкоуровневый primitive. Причина должна быть очевидна из задачи или кратко зафиксирована рядом с изменением.

Bootstrap не используется для новых frontend UI-изменений. Не добавлять Bootstrap-классы, Bootstrap CSS import или Bootstrap-зависимости без отдельного явного архитектурного решения.

Иконки в кнопках и навигации должны использовать установленную icon-библиотеку frontend, например `@lucide/vue`, если подходящая иконка существует.

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
Единый `ApiClient` находится в `monolith/src/application/api` как application integration layer и получает Vuex store во время инициализации приложения.

## Аутентификация

Cookie-based authentication requests должны использовать `credentials: "include"`.

Domain API clients должны использовать shared DTO contracts для request payload и response result.

Frontend должен восстанавливать локальный authorization state после обновления страницы из публичной информативной user cookie.
Имя этой cookie задается обязательной переменной `VUE_APP_AUTHORIZATION_PUBLIC_USER_COOKIE_NAME` и должно совпадать с backend `VAR_HTTP_PUBLIC_USER_COOKIE_NAME`.
`VUE_APP_BASE_URL` должен соответствовать публичному API/nginx hostname, а backend `VAR_HTTP_ORIGIN` и nginx allowed origin должны соответствовать frontend hostname.
Парсинг публичной user cookie выполняется при инициализации приложения до регистрации router guards, чтобы роли пользователя были доступны layout/navigation сразу после refresh.
Публичная user cookie используется только для UI state и отображения ролей; решения о доступе должны зависеть от `/authorization/state` и backend-проверок.
Если публичная cookie отсутствует или имеет некорректный формат, frontend должен очистить локальный authorization state без подстановки fallback-пользователя.

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
`VUE_APP_AUTHORIZATION_PUBLIC_USER_COOKIE_NAME` является обязательной переменной окружения для восстановления frontend authorization state из публичной user cookie.
В стандартном nginx-flow `VUE_APP_BASE_URL` указывает на единый публичный API origin, где nginx маршрутизирует `/v1/gateway/authorization`, `/v1/gateway/files`, `/v1/gateway/*` и `/v1/connection` к нужным gateway.
В development-only режиме `localhost noNginx` frontend может использовать дополнительные env-переменные:

- `VUE_APP_AUTHORIZATION_BASE_URL` для прямого обращения к `gateways/authorization`;
- `VUE_APP_FILES_BASE_URL` для прямого обращения к `gateways/files`;
- `VUE_APP_WEBSOCKET_BASE_URL` для прямого подключения к `gateways/chat-realtime`.

Если эти переменные не заданы, frontend должен использовать `VUE_APP_BASE_URL`, чтобы стандартный nginx-flow оставался конфигурацией по умолчанию.

Если `VUE_APP_BASE_URL` не задан, frontend должен падать с понятной ошибкой и не должен подставлять fallback вроде пустой строки или `undefined`.
Если `VUE_APP_AUTHORIZATION_PUBLIC_USER_COOKIE_NAME` не задан, frontend должен падать с понятной ошибкой и не должен подставлять fallback-имя cookie.

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

Vuex domain state должен жить в namespaced modules внутри `monolith/src/entities/<domain>/store`.
Root store в `monolith/src/application/store` должен только собирать modules и экспортировать типизированный `useStore`.

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
