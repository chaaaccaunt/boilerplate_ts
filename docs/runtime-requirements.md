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
- выполнить development seed через root reset-flow, если нужна чистая локальная база;
- убедиться, что `libs/ffmpeg/lgpl/bin/ffmpeg.exe` доступен, если сценарии загрузки файлов должны создавать preview proxy.

Базовые команды:

```bash
npm run project -- reset
npm run project -- dev all
```

`reset` допускается только для development/test/local database и не должен использоваться для production.

## Production

Перед production запуском нужно:

- собрать production bundle для frontend, gateway и backend-сервисов;
- подготовить `.prod.env` для каждого package;
- убедиться, что `.prod.env` использует production database user с минимально необходимыми runtime-правами;
- подготовить production database schema отдельным migration/setup process;
- применить migrations до запуска runtime backend;
- проверить nginx-конфигурацию для публичных gateway, frontend origin, WebSocket gateway и package-local ports;
- убедиться, что production deployment содержит FFmpeg LGPL binary, если upload preview proxy должен работать в production;
- не запускать development seed и database reset.

Базовые команды:

```bash
npm run project -- build all
npm run project -- migrate dist
npm run project -- start-dist all
```

Конкретный production deployment может использовать свой process manager, но runtime boundary остается тем же: application packages запускаются из production bundle, database schema готовится заранее, а nginx остается внешним edge layer.
