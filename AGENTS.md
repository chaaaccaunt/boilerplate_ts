Agent rules

0. Task execution policy

- Агент обязан выполнять только явно запрошенный объем работы.
- Если действие не было явно запрошено пользователем, агент считает его запрещенным, даже если оно кажется логичным продолжением задачи.
- Создание сущности не означает ее автоматическое подключение. Подключение, интеграция и изменение вызывающего кода выполняются только по отдельному явному запросу.
- Если задача неоднозначна, затрагивает архитектуру или может изменить поведение соседнего кода, агент обязан сначала задать уточняющий вопрос.
- Если агент видит ошибку вне запрошенной области, он должен сообщить о ней, но не исправлять без отдельного разрешения.
- Перед изменением существующих файлов агент обязан кратко указать, какие файлы будут изменены и зачем.

1. HTTP handling rules

- nginx не входит в приложение и не участвует в application logging.
- nginx обрабатывает только свои технические сценарии:
  - static request
  - OPTIONS request
  - method denied for nginx location
- nginx использует access_log только для ответов с HTTP 405.
- Все API requests должны передаваться через proxy_pass в httpServer.

- httpServer является входной точкой обработки API request и обязан:
  - parse request
  - resolve route
  - extract token/cookie
  - authenticate
  - validate payload

- httpServer должен возвращать:
  - 400 Bad Request при некорректном формате запроса или невозможности корректно обработать входные данные на уровне HTTP/parsing
  - 401 Unauthorized при отсутствии токена, невалидном токене или ошибке аутентификации
  - 404 Not Found при отсутствии route
  - 422 Unprocessable Content при ошибке валидации payload
- Если pre-controller этап завершен успешно, httpServer обязан передать управление в controller через `return controller.callback(request, response)`.

- controller обязан:
  - check access
  - call service
  - map service errors to HTTP response

- controller должен возвращать:
  - 403 Forbidden при access denied
  - 404 Not Found при NotFoundError
  - 409 Conflict при ConflictError
  - 500 Internal Server Error при InternalError или иной необработанной внутренней ошибке

- service обязан:
  - execute business logic
  - access DB
  - throw domain/internal errors

- service не должен знать о HTTP status codes напрямую.
- service не должен возвращать HTTP response и не должен принимать архитектурные решения уровня transport/protocol.
- controller является слоем, который преобразует ошибки service в HTTP response.

  1.1. API response format

- Все API responses должны возвращаться как JSON с `Content-Type: application/json; charset=utf-8`.
- httpServer обязан использовать единый response envelope.
- Успешный response:
  - `ok: true`
  - `result: <response payload>`
  - `error: null`
- Ошибочный response:
  - `ok: false`
  - `result: null`
  - `error.code: string`
  - `error.message: string`
- Данные успешного ответа должны передаваться в поле `result`, чтобы не создавать `response.data.data` на frontend.
- controller не должен формировать response envelope вручную.
- service не должен формировать response envelope вручную.
- controller может вернуть transport instructions через controller result, например `setCookies` или `clearCookies`, но httpServer обязан применить их и самостоятельно сформировать итоговый JSON response.

  1.2. Authentication and authorization policy

- Boilerplate не должен зашивать конкретную role-based access policy в ядро.
- Базовый token payload должен быть project-neutral: `uid` и optional `claims`.
- Конкретные роли, permissions, ownership rules, tenant rules и endpoint access policy определяются проектом, а не boilerplate.
- Подробные правила для агентов: `./docs/agent-auth-policy.md`.

2. Logging semantics

- nginx не включается в logging map.
- logging выполняется только на уровнях:
  - httpServer
  - controller
  - service

  2.1. Logging semantics for httpServer

- info -> route resolved
- info -> route not found
- warn -> token validation error
- warn -> payload parse error
- warn -> payload validation failed
- debug -> controller call
  - controller name
  - controller method
  - sanitized payload
- error -> unhandled server error

  2.2. Logging semantics for controller

- info -> controller name, controller method name
- debug -> service call
  - service name
  - service method
  - request context
- warn -> access denied
- error -> controller exception

  2.3. Logging semantics for service

- info -> service name, service method name
- debug -> method start
- debug -> DB call
- debug -> method success
- info -> entity not found
- warn -> conflict / business rule failed
- error -> DB error / internal exception

3. Restrictions

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
- Нельзя логировать чувствительные данные в сыром виде.
- Payload разрешено логировать только в очищенном виде как sanitized payload.
- Payload должен логироваться только один раз на запрос и только на уровне httpServer в событии `controller call`.

4. Reference architecture

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

5. Development logging policy

- Во время разработки агент обязан соблюдать logging map по месту возникновения события и его уровню.
- Формат вывода и расширенный контекст логов определяются DevDebugger.
- Агент не должен вручную дублировать расширенный контекст в сообщении лога без необходимости.
- Временные диагностические логи, не соответствующие logging map, должны удаляться перед завершением задачи.

6. Type declaration policy

Агент обязан выносить все domain types и interfaces в package-local `@types` и размещать их в соответствующем файле согласно доменному namespace.
Для backend package используется `./back/@types`.
Не следует объявлять такие типы в runtime-файлах, кроме случаев, когда это оправдано локальным техническим использованием и не относится к доменной модели.
