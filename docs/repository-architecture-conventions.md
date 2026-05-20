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
  <service-name>/
    src/
      bin/
      controllers/
      database/
      services/
```

## Назначение директорий

- `monolith` содержит frontend-монолит.
- `gateways` содержит backend gateway-приложения, которые являются публичной HTTP/WebSocket boundary.
- `services` содержит backend-сервисы.
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

Gateway, который является самостоятельным публичным обходом `gateways/public`, должен быть автономным внутри своего package.
Такой gateway не должен требовать отдельный одноименный backend-сервис только для выполнения своей базовой domain logic.
Если gateway выделен как отдельная public boundary, его controllers, service layer, database bootstrap и package-local env/config должны находиться внутри `gateways/<gateway-name>`.
Пример: `gateways/authorization` сам обрабатывает authorization flow и не должен проксировать его в `services/authorization`.

Исключение допускается для domain-сценариев, где gateway является осознанным агрегатором backend-сервисов, например `gateways/public`, или realtime boundary над отдельным domain-сервисом, например chat realtime.

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

## Права database users

Каждый backend-сервис или автономный gateway, который обращается к БД, должен работать под отдельным service database user.
Service database user должен иметь только минимальные права на конкретные таблицы, с которыми работает этот package.

Каждый backend-сервис и каждый gateway должен иметь package-local файл:

```text
services/<service-name>/package.config.json
gateways/<gateway-name>/package.config.json
```

Этот файл является источником package-local настроек для root runner, включая runtime database grants и стабильный localhost port.
Root runner должен завершаться ошибкой, если для backend-сервиса или gateway отсутствует `package.config.json` или поле `database.runtimeGrants`.
Если package не обращается к БД напрямую, `database.runtimeGrants` должен быть пустым списком:

```json
{
  "database": {
    "runtimeGrants": []
  }
}
```

Если package обращается к БД, права описываются в формате:

```json
{
  "database": {
    "runtimeGrants": [
      {
        "table": "users",
        "operations": ["SELECT"]
      }
    ]
  }
}
```

Если backend-сервис или gateway должен получать стабильный localhost port при генерации development env, port описывается в том же `package.config.json`:

```json
{
  "database": {
    "runtimeGrants": []
  },
  "development": {
    "localhost": {
      "port": "4102"
    }
  }
}
```

Если `development.localhost.port` задан явно, root runner обязан использовать его и завершаться ошибкой при конфликте портов между packages.
Если `development.localhost.port` не задан, root runner может назначить следующий свободный development port из диапазона package kind.

Полный пример package config:

```json
{
  "database": {
    "runtimeGrants": [
      {
        "table": "users",
        "operations": ["SELECT"]
      }
    ]
  },
  "development": {
    "localhost": {
      "port": "4102"
    }
  }
}
```

Разрешенные runtime operations:

- `SELECT`;
- `INSERT`;
- `UPDATE`;
- `DELETE`;
- `INDEX`;
- `REFERENCES`.

`CREATE`, `ALTER`, `DROP` запрещены для runtime database users и допускаются только для migration/setup process.

Development root runner автоматически генерирует runtime database user по имени папки package:

- `services/<service-name>` -> `<service_name>_svc`;
- `gateways/<gateway-name>` -> `<gateway_name>_gw`.

В имени database user дефисы заменяются на `_`.
Пароль development-пользователя генерируется как `<package_name>_password`, где дефисы также заменяются на `_`.

Примеры:

```text
services/users -> user: users_svc, password: users_password
gateways/authorization -> user: authorization_gw, password: authorization_password
gateways/chat-realtime -> user: chat_realtime_gw, password: chat_realtime_password
```

Ручное редактирование `VAR_DB_RUNTIME_GRANTS` для init-flow не требуется: `index.js` собирает значение из `package.config.json`.

Права service database user должны быть осознанно описаны перед созданием или изменением package в формате:

```text
package -> table -> allowed operations
```

Пример:

```text
gateways/authorization -> users -> SELECT
gateways/authorization -> roles -> SELECT
gateways/authorization -> user_roles -> SELECT
```

Runtime service database user не должен получать права на всю database через `<database>.*`, если package использует только часть таблиц.
Runtime service database user не должен получать `CREATE`, `ALTER`, `DROP`, если package не является migration/setup utility process.
`CREATE`, `ALTER`, `DROP` допустимы только для admin/migration/setup процесса, который подготавливает schema и служебные данные.

Если package только читает таблицы, ему выдается только `SELECT`.
Если package создает или изменяет domain data, ему выдаются только необходимые `SELECT`, `INSERT`, `UPDATE`, `DELETE` на конкретные таблицы.
Пользователь БД не должен обладать большим набором прав, чем требуется для runtime-сценариев package.

Dev seed, системные роли, тестовый администратор, системные chat rooms и другие обязательные начальные данные не должны требовать write-прав у runtime-пользователя package, который по своей runtime-роли должен только читать эти таблицы.
Такие данные должны создаваться migration/setup/seed process с отдельными правами.

Например, authorization gateway может читать `users`, `roles` и `user_roles` для login flow, но не должен изменять эти таблицы.
Если authorization gateway получает write-права только ради dev seed, seed должен быть перенесен в migration/setup процесс, а runtime-пользователь gateway должен остаться read-only.

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
Корневой `index.js` должен оставаться тонкой CLI-точкой входа.
Основная логика root runner должна находиться в `scripts/project-runner`.
Root runner должен запускать package-local scripts, но не должен знать внутренние команды конкретного сервиса сверх стандартных script names: `start`, `build`, `typecheck`, `start:dist`.
При добавлении нового backend-сервиса, gateway, frontend package, нового стандартного package-local script или нового режима запуска/сборки агент обязан проверить `scripts/project-runner` и при необходимости обновить root orchestration.
Если новый package укладывается в существующие workspace globs `services/*`, `gateways/*` или `monolith` и использует уже поддержанные стандартные scripts, менять root runner не нужно, но это должно быть осознанно проверено.
Если появляется новый тип package, новый target kind, новый общий script или новая команда orchestration, `scripts/project-runner` должен быть обновлен в той же задаче.
Если package является одноразовым utility process и не должен запускаться вместе с `dev all`, в его `package.json` нужно явно указать `boilerplate.runWithDevAll: false`, а root runner обязан учитывать этот флаг.
Если добавляется новый gateway или существующий gateway становится публичной boundary, агент обязан проверить nginx-конфиги в `./nginx` и обновить upstream/location routing в той же задаче, чтобы публичный edge соответствовал package-local `VAR_HTTP_PORT`.
Root runner может поддерживать отдельный development-only режим быстрого запуска без nginx через `localhost.noNginx: true` в `development.config.json`.
Такой режим должен генерировать только package-local `.dev.env`, не менять production flow и не отменять требование проверять nginx для публичных gateway.

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

## Backend-сервисы

При создании нового backend-сервиса структура должна быть service-local:

```text
services/
  authorization/
    src/
      bin/
      controllers/
      database/
      services/
```

Создание нового сервиса не означает автоматическое подключение его к root scripts, gateway, frontend или другим сервисам. Подключение выполняется только по отдельному явному запросу.

Backend-сервисы не должны содержать папку `routes`.
Internal endpoints backend-сервиса должны описываться в `services/<service-name>/src/controllers`.
Service controllers должны наследоваться от `MicroServiceController` из `./libs/MicroServiceController`.

## Миграции базы данных

Миграции базы данных должны выполняться отдельным package `services/database-migration`.
Этот package является одноразовым utility process, а не HTTP-сервисом, поэтому он не должен запускаться вместе с `dev all`.
Для этого в `services/database-migration/package.json` должен быть указан флаг:

```json
{
  "boilerplate": {
    "runWithDevAll": false
  }
}
```

Миграции должны храниться внутри `services/database-migration/src/database/migrations` в виде SQL-файлов и применяться в лексикографическом порядке.
Если SQL-синтаксис отличается между поддерживаемыми database dialects, dialect-specific набор миграций должен храниться в поддиректории с именем Sequelize dialect, например:

```text
services/database-migration/src/database/migrations/postgres
```

Если такая директория существует для текущего dialect, migration service выполняет миграции из нее вместо корневого набора SQL-файлов.
Корневой набор SQL-файлов сейчас является MySQL/MariaDB-compatible набором по умолчанию.
Сервис миграций должен записывать примененные файлы в таблицу `database_migrations` и не должен вызывать `sequelize.sync()`.
При добавлении или изменении Sequelize model агент обязан добавить соответствующий SQL-файл миграции в `services/database-migration/src/database/migrations` в той же задаче.
Если поддерживается несколько dialects, соответствующее изменение schema должно быть внесено во все поддерживаемые наборы миграций.

Миграции запускаются через root runner:

```bash
npm run project -- migrate
```

Production bundle миграций собирается в `./build/service/database-migration` и запускается через:

```bash
npm run project -- migrate dist
```

Пересоздание базы данных допускается только для среды разработки и выполняется как часть init-flow через root runner:

```bash
npm run project -- init <db-host> <db-admin-user> <db-admin-password>
```

Эта команда должна выполнять полный development database flow:

1. удалить development database;
2. заново выполнить setup database и service user;
3. применить миграции.
4. выдать runtime database grants на созданные таблицы;
5. выполнить development seed.

Отдельная root-команда для пересоздания базы данных не используется.
Пересоздание базы данных не должно иметь production/dist-вариант.
Оно обязано завершаться ошибкой при `NODE_ENV=production` и дополнительно проверять, что имя базы данных явно относится к development/test/local окружению.

Первичная настройка базы данных выполняется package-local script:

```bash
npm run project -- workspace service:database-migration setup
```

Production bundle для setup запускается командой:

```bash
npm run project -- workspace service:database-migration setup:dist
```

Setup-скрипт должен создавать database и service user через admin-подключение, затем выдавать service user права из обязательной переменной `VAR_DB_SERVICE_GRANTS`.
Для setup используются обязательные env-переменные:

- `VAR_DB_ADMIN_USER`;
- `VAR_DB_ADMIN_PASSWORD`;
- `VAR_DB_SERVICE_HOST`;
- `VAR_DB_SERVICE_GRANTS`.

`VAR_DB_SERVICE_GRANTS` должен задаваться явно и не должен подбираться fallback-значением.
