# Правила пользователей и ролей

## Назначение

Этот документ описывает базовый пользовательский функционал boilerplate и границы role-based access infrastructure.

Boilerplate содержит только одну системную роль:

- `superadministrator` — суперадминистратор базового приложения.

Boilerplate содержит базовую permission infrastructure, чтобы пользовательские роли могли получать доступ через назначенные права, а не через hardcoded role names.

Project-specific роли, дополнительные permissions, ownership rules и endpoint access policy должны добавляться конкретным проектом отдельно.

## Хранение ролей

Роли должны храниться как справочник в таблице `roles`.

Связь пользователя и роли должна храниться в таблице `user_roles`.

Модель `UserRoleModel` является связующей сущностью и не должна хранить человекочитаемое имя роли. Имя роли принадлежит `RoleModel`.

Публичный DTO роли содержит только JSON-safe данные:

```ts
interface UserRoleDto {
  uid: string
  name: string
  permissions: PermissionDto[]
}
```

## Permissions

Права доступа должны храниться в справочнике `permissions`.

Связь роли и права должна храниться в таблице `role_permissions`.

Permission key должен быть стабильной строкой в доменном формате:

```text
users.read
system.metrics.read
```

Для пользователей и ролей используются раздельные права:

```text
users.read
users.create
users.update
users.delete
roles.read
roles.create
roles.update
roles.delete
roles.permissions.manage
```

Роль доступа является набором permissions. Endpoint access policy и frontend route/navigation checks должны по возможности проверять permission key, а role name использовать только как fallback для совместимости с существующими системными ролями.

Пользовательские роли могут получать и терять permissions через административный UI. Системные роли защищены от удаления и переименования; их базовый набор permissions задается миграциями/seed и не должен случайно расходиться между окружениями.

Публичный DTO пользователя должен содержать:

```ts
interface PublicUserDto {
  roles: UserRoleDto[]
  permissions: PermissionDto[]
}
```

`permissions` пользователя является объединением permissions всех назначенных ролей.
Frontend может использовать это поле для показа разделов и кнопок, но backend controller все равно обязан проверять доступ на endpoint boundary.

## Пароли

Пароли пользователей нельзя хранить в открытом виде.

При создании пользователя backend обязан сохранять bcrypt hash.

Авторизация должна сравнивать введенный пароль с сохраненным hash через bcrypt compare.

Seed development-пользователей должен также сохранять hash, а не plain password.

## Создание пользователей

Создание пользователей является административным действием.

Backend endpoint создания пользователя должен:

- требовать авторизацию;
- проверять permission `users.create` на уровне controller, с fallback на системную роль `superadministrator` для совместимости;
- принимать DTO из `shared/@types`;
- хэшировать пароль в service;
- возвращать публичный `PublicUserDto`;
- не возвращать password, password hash, authorization token и server-only metadata.

Остальные endpoints управления пользователями должны проверять соответствующее действие:

- просмотр пользователей — `users.read`;
- редактирование пользователей — `users.update`;
- удаление пользователей — `users.delete`;
- просмотр ролей — `roles.read`;
- создание ролей — `roles.create`;
- редактирование ролей — `roles.update`;
- удаление ролей — `roles.delete`;
- изменение прав роли — `roles.permissions.manage`.

Frontend должен создавать пользователей через слои:

```text
monolith/src/shared/api
monolith/src/entities/users/api
monolith/src/entities/users/store
monolith/src/application/store
monolith/src/views
```

Components не должны обращаться к `fetch` напрямую.

## Access helper в controller

Базовый controller может предоставлять helper для проверки авторизации, permissions и минимальных системных ролей.

Controller остается boundary для endpoint access checks.

Service не должен знать HTTP status codes и не должен принимать решения уровня transport.

Service может проверять бизнес-инварианты, например уникальность логина или существование роли.

## Ограничения

- Не добавлять project-specific authorization policy в boilerplate без отдельного явного запроса.
- Не раскрывать backend/internal user identifiers в UI там, где они не нужны пользователю.
- Не использовать сокращенные имена ролей вроде `admin` или `usr` в public contracts.
- Не добавлять новые системные роли в миграции без отдельного решения: проектные роли должны создаваться через управление ролями по мере необходимости.
