# Неполные CRUD-сценарии

Документ фиксирует сущности, у которых уже есть часть CRUD-поведения, но полный CRUD еще не реализован. Полным CRUD считается наличие пользовательского и backend/API-сценария для `create`, `read/list`, `update`, `delete` с соответствующими shared contracts и frontend state/UI.

## roles

Текущее покрытие:

- `read/list` — реализовано;
- `create` — не реализовано;
- `update` — не реализовано;
- `delete` — не реализовано.

Контекст:

- В boilerplate сейчас есть только базовые системные роли `administrator` и `user`.
- Project-specific роли, permissions и endpoint access policy не должны добавляться в ядро boilerplate без отдельного архитектурного решения.

Что нужно доделать, если проекту потребуется управление ролями:

- определить project-specific модель ролей и permissions;
- добавить shared contracts для CRUD ролей;
- добавить backend endpoints и service logic;
- добавить frontend entity/store/view;
- описать access policy отдельно от ядра boilerplate;
- добавить миграции, если меняется schema.

## chat messages

Текущее покрытие:

- `create` — реализовано через `chat:message:send`;
- `read/list` — реализовано;
- `update` — не реализовано;
- `delete` — не реализовано.

Что нужно доделать:

- определить, можно ли редактировать сообщения после отправки;
- определить, можно ли удалять сообщения и кто имеет это право;
- добавить shared contracts для update/delete message;
- добавить service logic с проверкой доступа;
- добавить realtime notifications `chat:message:updated` и `chat:message:deleted`, если они нужны;
- добавить frontend UI и Vuex mutations для обновления/удаления сообщений.

## stored files

Текущее покрытие:

- `create/upload` — реализовано;
- `read/download` — реализовано;
- `update metadata` — не реализовано;
- `delete` — не реализовано.

Что нужно доделать:

- определить, нужна ли пользователю возможность менять описание/metadata файла;
- добавить shared contracts для update metadata и delete;
- добавить endpoints в `gateways/files`;
- добавить service logic для проверки владельца/доступа;
- определить стратегию удаления физического файла с диска;
- добавить frontend API methods;
- добавить UI удаления файла из уже отправленного сообщения только после отдельного решения по chat message/file relation.

## chat message files

Текущее покрытие:

- `create relation` — реализовано при отправке сообщения с файлами;
- `read relation` — реализовано при загрузке сообщений;
- `update` — не требуется как отдельный сценарий;
- `delete` — не реализовано.

Что нужно доделать, если потребуется управление вложениями после отправки:

- определить, можно ли удалять вложение отдельно от сообщения;
- добавить service logic удаления связи `chat_message_files`;
- добавить realtime notification для изменения состава вложений сообщения;
- синхронизировать frontend state активной комнаты.
