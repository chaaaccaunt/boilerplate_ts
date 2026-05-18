# Требования для запуска development и production

## Назначение

Документ фиксирует внешние требования окружения для запуска проекта в development и production.
Он не заменяет package-local `.dev.env`, `.prod.env`, `.env.example` и checklist-документы, а описывает зависимости, которые должны быть доступны до запуска orchestration-команд.

## Общие требования

- Node.js и npm должны быть установлены в окружении запуска.
- Зависимости workspace packages должны быть установлены через корневой npm workspace flow.
- MySQL-compatible database server должен быть доступен для backend-сервисов, gateway и `services/database-migration`.
- Корневой runner запускается через `npm run project -- <command>`.
- Runtime backend-сервисы и gateway не должны создавать schema через `sequelize.sync()` и не должны выполнять seed.
- Schema, начальные данные и runtime database grants подготавливаются через `services/database-migration`.
- Для каждого backend-сервиса и gateway должен существовать package-local `database-grants.json`.
- Для каждого backend-сервиса и gateway должны существовать package-local env-файлы `.dev.env`, `.prod.env` и `.env.example`.
- nginx используется как edge boundary для static, CORS preflight, method restrictions и CSRF/Origin checks.
- Лимит размера upload request должен задаваться на nginx/deployment boundary через `client_max_body_size`; frontend не должен хардкодить этот лимит.
- Nginx response для превышения upload limit должен возвращать HTTP `413` с CORS headers для разрешенного frontend origin, чтобы браузер мог передать frontend корректный статус ошибки.

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
- подготовить package-local `.dev.env` для frontend, gateway и backend-сервисов;
- проверить, что `.dev.env` не указывает production database;
- подготовить database и service user через migration package setup;
- применить migrations;
- выдать runtime grants из package-local `database-grants.json`;
- выполнить полный localhost-flow, если нужна чистая локальная база с development seed;
- убедиться, что `libs/ffmpeg/lgpl/bin/ffmpeg.exe` доступен, если сценарии загрузки файлов должны создавать preview proxy.

Базовая команда полного localhost-flow:

```bash
npm run project -- localhost
```

Пересоздание database внутри localhost-flow допускается только для development/test/local database и не должно использоваться для production.

## Production

Перед production запуском нужно:

- собрать production bundle для frontend, gateway и backend-сервисов;
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
npm run project -- start-dist all
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
