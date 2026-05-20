# Реализованные фичи

Документ фиксирует фичи, которые на текущий момент реализованы end-to-end: имеют shared contracts, backend/API или frontend runtime-логику, пользовательский интерфейс и подключение в приложение.

## Аутентификация

Статус: реализовано.

Покрытый сценарий:

- вход пользователя по логину и паролю;
- установка защищенной authorization cookie;
- установка публичной user cookie для восстановления frontend state;
- восстановление локального состояния авторизации после refresh;
- проверка валидности сессии через `/v1/gateway/authorization/state`;
- route guard для защищенных страниц;
- выход из приложения через confirmation modal;
- очистка authorization state и realtime connection при logout.

Основные зоны реализации:

- `gateways/authorization`;
- `monolith/src/entities/authorization`;
- `monolith/src/views/login`;
- `monolith/src/application/router`;
- `monolith/src/layouts/main/components/LogoutModal.vue`.

## Управление темой

Статус: реализовано.

Покрытый сценарий:

- страница настроек `/settings`;
- выбор режима темы: автоматическая, светлая, темная;
- автоматический режим по умолчанию;
- чтение системной темы через `prefers-color-scheme`;
- fallback на светлую тему, если системная тема недоступна;
- сохранение выбранного режима в `localStorage`;
- применение dark mode через class-based Tailwind strategy;
- темная тема для основных layout, modal, login, users, chat и file-upload поверхностей.

Основные зоны реализации:

- `monolith/src/features/theme`;
- `monolith/src/views/settings/SettingsView.vue`;
- `monolith/src/application/router/index.ts`;
- `monolith/tailwind.config.js`.

## Загрузка файлов

Статус: реализовано как переиспользуемая frontend feature и backend upload/download boundary.

Покрытый сценарий:

- выбор нескольких файлов;
- параллельная загрузка каждого файла отдельным upload request;
- progress bar для каждого файла;
- отображение статуса загрузки каждого файла;
- создание маленького proxy-файла превью для изображений и видео через FFmpeg LGPL;
- отображение превью загруженных изображений и видео в списке вложений;
- удаление файла из локального списка вложений;
- передача загруженных `fileUid` в пользовательские сценарии;
- скачивание/открытие загруженных файлов по download URL;
- inline-просмотр загруженных изображений и видео по отдельному view URL;
- получение preview proxy по отдельному URL с проверкой доступа;
- поддержка compact-режима с кнопкой-скрепкой для composer.

Основные зоны реализации:

- `monolith/src/features/file-upload`;
- `monolith/src/features/media-viewer`;
- `monolith/src/entities/files`;
- `gateways/files`;
- `libs/FilePreviewProxy`;
- `models/files/StoredFileModel.ts`.

## Чат

Статус: реализованы базовые пользовательские сценарии чата.

Покрытый сценарий:

- загрузка списка доступных комнат;
- восстановление последней активной комнаты пользователя;
- явная ошибка при отсутствии обязательной public room;
- создание private или group room через modal с автоматическим выбором типа на backend;
- редактирование названия group room владельцем;
- редактирование состава участников group room владельцем;
- пользовательское удаление group room владельцем с переводом в `archived_by_owner`;
- выход участника из group/private room без hard delete;
- перевод private room в `orphaned`, если ее покинули все участники;
- soft-archive закрытых комнат без административной очереди;
- подключение к комнате;
- загрузка сообщений активной комнаты;
- отправка текстового сообщения;
- отправка сообщения с уже загруженными файлами;
- realtime notification о новом сообщении другим участникам комнаты;
- отображение вложений сообщения;
- отображение preview proxy для вложенных изображений и видео;
- полноэкранный просмотр вложенных изображений и видео через переиспользуемую `media-viewer` feature;
- отдельная кнопка скачивания вложения.

Основные зоны реализации:

- `shared/@types/chat.d.ts`;
- `services/chat`;
- `gateways/chat-realtime`;
- `docs/chat-room-lifecycle-policy.md`;
- `gateways/public/src/controllers/ChatHTTPGatewayController.ts`;
- `monolith/src/entities/chat`;
- `monolith/src/features/media-viewer`;
- `monolith/src/views/chat`.

## Управление пользователями

Статус: реализован полный административный CRUD.

Покрытый сценарий:

- просмотр списка пользователей;
- просмотр списка ролей;
- создание пользователя через modal;
- редактирование пользователя через modal;
- удаление пользователя через confirmation modal;
- изменение логина, ФИО, отчества и набора базовых ролей;
- создание пользовательской роли;
- переименование пользовательской роли;
- удаление пользовательской роли, если она не назначена пользователям;
- защита системных ролей `administrator` и `user` от переименования и удаления;
- проверка уникальности логина;
- soft delete пользователя;
- запрет удаления последнего администратора;
- сохранение пароля в виде bcrypt hash при создании;
- ограничение доступа к управлению пользователями ролью `administrator`.

Основные зоны реализации:

- `shared/@types/users.d.ts`;
- `services/users`;
- `gateways/public/src/controllers/UsersGatewayController.ts`;
- `monolith/src/entities/users`;
- `monolith/src/views/users`.

## CRUD сообщений чата

Статус: реализовано.

Покрытый сценарий:

- создание сообщения через realtime-событие `chat:message:send`;
- загрузка списка сообщений активной комнаты;
- редактирование собственного сообщения;
- удаление собственного сообщения;
- удаление отдельного вложения из собственного сообщения;
- realtime notification о создании, изменении и удалении сообщения другим участникам комнаты;
- защита от пустого сообщения без текста и вложений.

Основные зоны реализации:

- `shared/@types/chat.d.ts`;
- `services/chat`;
- `gateways/public/src/controllers/ChatHTTPGatewayController.ts`;
- `gateways/chat-realtime/src/realtime/chat`;
- `monolith/src/entities/chat`;
- `monolith/src/views/chat`.

## Файловый backend boundary

Статус: реализовано как backend/API foundation без отдельного пользовательского экрана управления файлами.

Покрытый сценарий:

- загрузка файла;
- скачивание файла;
- inline-просмотр изображений и видео;
- получение preview proxy для изображений и видео;
- передача загруженных файлов в пользовательские сценарии, например вложения сообщений чата;
- физический файл при удалении связанных пользовательских сущностей не удаляется автоматически.

Основные зоны реализации:

- `shared/@types/files.d.ts`;
- `gateways/files`;
- `monolith/src/entities/files`;
- `monolith/src/features/file-upload`;
- `libs/FilePreviewProxy`.

## Development orchestration

Статус: реализовано.

Покрытый сценарий:

- root runner для install/dev/build/typecheck/start-dist;
- production bundles в корневых `./build/service/<domain>`, `./build/gateway/<domain>` и `./build/monolith` со скопированным package-local `.prod.env`;
- workspace discovery по `services/*`, `gateways/*`, `monolith`;
- package-local env loading;
- development env generation;
- `localhost.noNginx: true` для прямого development-запуска без локального nginx;
- генерация отдельных frontend base URL для public, authorization, files и realtime gateway в no-nginx режиме;
- Node.js preflight responses для no-nginx development через `VAR_HTTP_ENABLE_PREFLIGHT`;
- host-only authorization cookies для `localhost` через `VAR_HTTP_ALLOW_HOST_ONLY_COOKIES`;
- runtime database grants generation из `package.config.json`;
- database setup/migrate/seed flow через `services/database-migration`;
- исключение utility package из `dev all` через `boilerplate.runWithDevAll: false`.

Основные зоны реализации:

- `index.js`;
- `services/database-migration`;
- package-local `package.config.json`.

## Runtime metrics

Статус: реализовано как admin-only диагностика через `log-collector`.

Покрытый сценарий:

- `log-collector` держит двустороннее TCP-соединение с подключенными сервисами и шлюзами;
- администратор открывает страницу состояния системы;
- public gateway запрашивает метрики только у `log-collector`;
- `log-collector` отправляет подключенным packages `metrics_request`;
- packages отвечают `metrics_response` с CPU, памятью, диском, uptime, PID, hostname, platform и Node.js version;
- отдельные публичные metrics endpoints на services/gateways не создаются.

Основные зоны реализации:

- `libs/RuntimeMetrics`;
- `libs/Logger`;
- `services/log-collector/src/services/LogCollectorSocketServer.ts`;
- `services/log-collector/src/controllers/SystemMetricsController.ts`;
- `gateways/public/src/controllers/SystemMetricsGatewayController.ts`;
- `shared/@types/system.d.ts`;
- `monolith/src/entities/system`;
- `monolith/src/views/system`.
