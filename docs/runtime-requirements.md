# Требования для запуска development и production

## Назначение

Документ фиксирует внешние требования окружения для запуска проекта в development и production.
Он не заменяет package-local `.dev.env`, `.prod.env`, `.env.example` и checklist-документы, а описывает зависимости, которые должны быть доступны до запуска orchestration-команд.

## Общие требования

- Node.js и npm должны быть установлены в окружении запуска.
- Зависимости workspace packages должны быть установлены через корневой npm workspace flow.
- MySQL/MariaDB или PostgreSQL database server должен быть доступен для backend-сервисов, gateway и `services/database-migration`.
- Корневой runner запускается через `npm run project -- <command>`.
- Runtime backend-сервисы и gateway не должны создавать schema через `sequelize.sync()` и не должны выполнять seed.
- Schema, начальные данные и runtime database grants подготавливаются через `services/database-migration`.
- Для каждого backend-сервиса и gateway должен существовать package-local `package.config.json` с `database.runtimeGrants`.
- Для каждого backend-сервиса и gateway должны существовать package-local env-файлы `.dev.env`, `.prod.env` и `.env.example`.
- nginx используется как edge boundary для static, CORS preflight, method restrictions и CSRF/Origin checks.
- Для быстрого локального development-старта допускается режим `localhost.noNginx: true` в `development.config.json`, в котором frontend обращается к gateway напрямую, а `httpServer` отвечает на browser preflight `OPTIONS`.
- Лимит размера upload request должен задаваться на nginx/deployment boundary через `client_max_body_size`; frontend не должен хардкодить этот лимит.
- Nginx response для превышения upload limit должен возвращать HTTP `413` с CORS headers для разрешенного frontend origin, чтобы браузер мог передать frontend корректный статус ошибки.

## Database dialect

Backend packages работают с БД через Sequelize.
Проект не должен описывать database server как привязанный к одному vendor, если задача явно не касается конкретного dialect.
В текущем boilerplate init-flow поддерживает dialects `mysql` и `postgres`.

Sequelize v6 поддерживает несколько SQL dialects, включая:

- PostgreSQL;
- MySQL;
- MariaDB;
- SQLite;
- Microsoft SQL Server;
- Oracle;
- Amazon Redshift;
- Snowflake.

Конкретный package должен явно задавать Sequelize `dialect` и устанавливать соответствующий driver package.
Если backend bundle собирается через webpack, driver должен попадать в runtime bundle или быть доступен в production окружении.

Для стабильной сборки и чтобы webpack не пытался динамически подтянуть неподходящий driver, конфигурация Sequelize должна использовать `dialectModule`.
`dialectModule` должен соответствовать выбранному `dialect`, например:

```ts
import postgresDriver from "pg"

const databaseConfig = {
  dialect: "postgres",
  dialectModule: postgresDriver
}
```

При смене dialect за пределы уже поддержанных `mysql` и `postgres` нужно пересмотреть:

- зависимости backend packages;
- `AppConfiguration.getDatabaseConfig()`;
- setup/migration SQL в `services/database-migration`;
- webpack ignore rules для неиспользуемых Sequelize dialect drivers;
- package-local `.env.example`, `.dev.env` и `.prod.env`, если меняется env contract.

Для `mysql` runtime driver — `mysql2`.
Для `postgres` runtime driver — `pg`.
Оба driver package должны быть доступны backend packages и не должны исключаться из webpack bundle.
`pg-native` является optional native dependency пакета `pg` и в boilerplate не используется; webpack-конфиги исключают его через optional ignore pattern.

## Переключение СУБД в init-flow

Готовый init-flow поддерживает только `mysql` и `postgres`.
Переключение выполняется через корневой `development.config.json`.

Для MySQL/MariaDB:

```json
{
  "localhost": {
    "database": {
      "dialect": "mysql",
      "port": "3306",
      "serviceHost": "%"
    }
  }
}
```

Команда запуска:

```bash
npm run project -- init localhost root <db-admin-password>
```

`root` здесь пример admin-пользователя локальной MySQL/MariaDB. Если в локальной СУБД
используется другое admin-имя, нужно указать его.

Для PostgreSQL:

```json
{
  "localhost": {
    "database": {
      "dialect": "postgres",
      "port": "5432",
      "serviceHost": "%"
    }
  }
}
```

`serviceHost` задает host-scope для создаваемых runtime database users. Для MySQL/MariaDB значение `%` означает wildcard-host в выражениях вида `'users_svc'@'%'`.
Для PostgreSQL SQL role не привязана к host таким же образом; доступ по host настраивается на уровне `pg_hba.conf`, а `serviceHost` остается в config как единый параметр init-flow.

Команда запуска:

```bash
npm run project -- init localhost postgres <db-admin-password>
```

`postgres` здесь пример admin role локального PostgreSQL server. Если при установке
создан другой admin role, нужно использовать его.

Sequelize runtime может работать с другими dialects, которые поддерживает Sequelize.
Но для них в boilerplate нет готового init-flow: root runner не умеет автоматически
создавать database/users/grants, применять dialect-specific SQL migrations и выполнять
development seed для SQLite, MSSQL, Oracle, Snowflake, Redshift и других СУБД.

Чтобы добавить новый dialect в init-flow, нужно явно реализовать:

- driver dependency и `dialectModule`;
- генерацию env для выбранного dialect;
- setup/drop database flow;
- создание users/roles или эквивалентной модели доступа;
- выдачу runtime grants или эквивалентных permissions;
- dialect-specific migrations;
- dialect-specific seed/upsert SQL;
- webpack правила, чтобы нужный driver не был исключен из bundle.

Фактическое состояние PostgreSQL-поддержки:

- `AppConfiguration` выбирает `dialectModule` по `VAR_DB_DIALECT`;
- `mysql` использует `mysql2`, `postgres` использует `pg`;
- root runner генерирует `VAR_DB_DIALECT`, `VAR_DB_HOST`, `VAR_DB_PORT` в package-local `.dev.env`;
- `services/database-migration` умеет создавать PostgreSQL database и roles через admin connection;
- runtime grants для PostgreSQL выдаются как `CONNECT` на database, `USAGE` на schema `public` и table-level grants;
- PostgreSQL-миграции лежат в `services/database-migration/src/database/migrations/postgres`;
- если dialect-specific директория миграций существует, migration service выполняет ее вместо корневого набора SQL-файлов;
- development seed использует dialect-specific upsert: `ON DUPLICATE KEY UPDATE` для MySQL и `ON CONFLICT` для PostgreSQL.

## FFmpeg LGPL

Для генерации маленьких proxy-файлов превью при загрузке файлов проект использует локальный FFmpeg LGPL build:

```text
libs/ffmpeg/lgpl/bin/ffmpeg.exe
```

Эта зависимость нужна `gateways/files` для создания preview proxy рядом с исходным файлом upload.
Если FFmpeg недоступен, upload не должен зависеть от успешного создания превью, но preview proxy для изображения или видео не будет создан.
Frontend может получить исходный файл для inline-просмотра через URL из shared DTO `viewUrl`, а preview proxy через URL из `previewUrl`.
Оба URL запрашиваются у `gateways/files` и проходят ту же проверку доступа, что и скачивание исходного файла.
Frontend использует `monolith/src/features/media-viewer` для полноэкранного просмотра изображений и видео; скачивание остается отдельным действием через download URL.

Требования к FFmpeg:

- директория `libs/ffmpeg/lgpl` должна быть доступна в development окружении;
- production bundle или production deployment должен включать совместимый FFmpeg binary либо предоставлять его по тому же ожидаемому пути;
- license files из `libs/ffmpeg/lgpl` должны сохраняться рядом с binary;
- при замене FFmpeg build нужно сохранять LGPL-compatible distribution или явно пересмотреть лицензионные ограничения проекта;
- при переносе проекта на Linux production нужно предоставить совместимый FFmpeg binary для целевой ОС и сохранить ожидаемый runtime path или явно обновить `libs/FilePreviewProxy`.

## Development

Перед запуском development окружения нужно:

- установить npm dependencies;
- проверить корневой `development.config.json` с локальными настройками стандартного init-flow или fallback `development.config.example.json`;
- проверить package-local `package.config.json` у services/gateways;
- подготовить package-local `.dev.env` для frontend, gateway и backend-сервисов;
- проверить, что `.dev.env` не указывает production database;
- подготовить database и service user через migration package setup;
- применить migrations;
- выдать runtime grants из package-local `package.config.json`;
- выполнить полный init-flow, если нужна чистая локальная база с development seed;
- убедиться, что `libs/ffmpeg/lgpl/bin/ffmpeg.exe` доступен, если сценарии загрузки файлов должны создавать preview proxy.

Базовая команда полного init-flow:

```bash
npm run project -- init <db-host> <db-admin-user> <db-admin-password>
```

Полный init-flow генерирует package-local `.dev.env`, пересоздает development database,
создает service database user, применяет миграции, выдает runtime grants из `package.config.json`,
выполняет development seed и запускает dev-окружение.

`<db-host>` — host локального database server, который будет записан в generated `.dev.env` как `VAR_DB_HOST`.
`<db-admin-user>` и `<db-admin-password>` — это учетные данные локального database server,
которые имеют право создавать development database, service users и выдавать grants.
Это не пользователь приложения, не seed-администратор и не runtime database user package.
Для локального MySQL/MariaDB это часто может быть `root`, но документация не должна
требовать именно такое имя пользователя.

Если nginx не настроен, режим прямого обращения к gateway включается в `development.config.json`:

```json
{
  "localhost": {
    "noNginx": true
  }
}
```

В режиме `localhost.noNginx: true` root runner:

- задает frontend base URL напрямую на `gateways/public`;
- задает отдельные frontend URL для `gateways/authorization`, `gateways/files` и `gateways/chat-realtime`;
- включает `VAR_HTTP_ENABLE_PREFLIGHT=true` для backend/gateway;
- включает `VAR_HTTP_ALLOW_HOST_ONLY_COOKIES=true` для host-only cookies на `localhost`.

Режим `noNginx` не заменяет nginx в production и не выполняет CSRF/Origin policy на edge-уровне.

Стандартные hostname, cookie domain, режим no-nginx и debug-логирование для init-flow задаются в локальном корневом `development.config.json`.
Файл `development.config.json` не хранится в Git и предназначен для настроек конкретной машины.
Если локальный файл отсутствует, root runner использует fallback `development.config.example.json`.
Блок `localhost.database` необязателен; если он отсутствует, используется dialect `mysql`, port `3306` и `serviceHost` `%`.
Если `localhost.debug` равен `true` или не задан, root runner генерирует `VAR_APP_LOG_LEVEL=debug`.
Если `localhost.debug` равен `false`, root runner генерирует `VAR_APP_LOG_LEVEL=info`.

```json
{
  "localhost": {
    "publicUserCookieDomain": ".localhost",
    "httpOrigin": "http://localhost:8080",
    "baseUrl": "http://localhost:4200",
    "noNginx": false,
    "debug": true,
    "database": {
      "dialect": "postgres",
      "port": "5432",
      "serviceHost": "%"
    }
  }
}
```

Runtime database grants и стабильные localhost ports для отдельных backend packages задаются рядом с package в `package.config.json`:

```json
{
  "database": {
    "runtimeGrants": []
  },
  "development": {
    "localhost": {
      "port": "4200"
    }
  }
}
```

Если package-local port конфликтует с другим явно заданным port, root runner должен завершиться ошибкой.

Пересоздание database внутри init-flow допускается только для development/test/local database и не должно использоваться для production.

## Production

Перед production запуском нужно:

- собрать production bundle для frontend, gateway и backend-сервисов;
- проверить, что production bundles лежат в `./build/service/<domain>`, `./build/gateway/<domain>` и `./build/monolith` и содержат скопированный `.prod.env`;
- подготовить `.prod.env` для каждого package;
- убедиться, что `.prod.env` использует production database user с минимально необходимыми runtime-правами;
- подготовить production database schema отдельным migration/setup process;
- применить migrations до запуска runtime backend;
- проверить nginx-конфигурацию для публичных gateway, frontend origin, WebSocket gateway и package-local ports;
- убедиться, что production deployment содержит FFmpeg LGPL binary, если upload preview proxy должен работать в production;
- не запускать development seed и пересоздание database.

Базовые команды:

```bash
npm run project -- build all
npm run project -- migrate dist
npm run project -- start-dist service users
npm run project -- start-dist gateway public
```

Конкретный production deployment может использовать свой process manager, но runtime boundary остается тем же: application packages запускаются из production bundle, database schema готовится заранее, а nginx остается внешним edge layer.

## Внутренний transport между gateway и service

Backend-сервисы, которые запускаются через `MicroServiceHTTPServer`, должны требовать заголовок `x-internal-service-token`.
Gateway, который вызывает backend-сервис через `InternalServiceClient`, должен передавать этот заголовок.

Для всех packages, которые запускают backend-сервис или вызывают backend-сервис, должен быть задан package-local env:

```text
VAR_INTERNAL_SERVICE_TOKEN=...
```

Значение токена должно совпадать у вызывающего gateway и вызываемого service в рамках одного окружения.
Токен не заменяет сетевую изоляцию internal ports: service ports все равно не должны быть публичной external boundary.

## Runtime metrics через log-collector

Runtime metrics для admin-панели собираются через `services/log-collector`, а не через публичные endpoints каждого service/gateway.

Для работы metrics нужны:

- запущенный `services/log-collector`;
- включенный collector-client у services/gateways через `VAR_LOG_COLLECTOR_CLIENT_ENABLED=true`;
- заданные `VAR_LOG_COLLECTOR_SOCKET_HOST` и `VAR_LOG_COLLECTOR_SOCKET_PORT` у packages, которые должны отвечать на metrics request;
- отключенный self-client у самого `services/log-collector` через `VAR_LOG_COLLECTOR_CLIENT_ENABLED=false`;
- admin-пользователь для доступа к странице `/system`.

Если package не подключен к socket-серверу `log-collector`, он не попадет в список online metrics.
Если package подключен, но не ответил на `metrics_request` за timeout, `log-collector` возвращает для него `status: unavailable`.

Metrics не требуют отдельного database user и не создают отдельные таблицы.
Регулярные snapshots metrics не сохраняются в БД.
