# Правила пользователей и ролей

## Назначение

Этот документ описывает базовый пользовательский функционал boilerplate и границы role-based access infrastructure.

Boilerplate содержит только минимальные системные роли:

- `administrator` — администратор базового приложения;
- `user` — обычный пользователь базового приложения.

Project-specific роли, permissions, ownership rules и endpoint access policy должны добавляться конкретным проектом отдельно.

## Хранение ролей

Роли должны храниться как справочник в таблице `roles`.

Связь пользователя и роли должна храниться в таблице `user_roles`.

Модель `UserRoleModel` является связующей сущностью и не должна хранить человекочитаемое имя роли. Имя роли принадлежит `RoleModel`.

Публичный DTO роли содержит только JSON-safe данные:

```ts
interface UserRoleDto {
  uid: string
  name: "administrator" | "user"
}
```

## Пароли

Пароли пользователей нельзя хранить в открытом виде.

При создании пользователя backend обязан сохранять bcrypt hash.

Авторизация должна сравнивать введенный пароль с сохраненным hash через bcrypt compare.

Seed development-пользователей должен также сохранять hash, а не plain password.

## Создание пользователей

Создание пользователей является административным действием.

Backend endpoint создания пользователя должен:

- требовать авторизацию;
- проверять роль `administrator` на уровне controller;
- принимать DTO из `shared/@types`;
- хэшировать пароль в service;
- возвращать публичный `PublicUserDto`;
- не возвращать password, password hash, authorization token и server-only metadata.

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

Базовый controller может предоставлять helper для проверки авторизации и минимальных системных ролей.

Controller остается boundary для endpoint access checks.

Service не должен знать HTTP status codes и не должен принимать решения уровня transport.

Service может проверять бизнес-инварианты, например уникальность логина или существование роли.

## Ограничения

- Не добавлять project-specific authorization policy в boilerplate без отдельного явного запроса.
- Не раскрывать backend/internal user identifiers в UI там, где они не нужны пользователю.
- Не использовать сокращенные имена ролей вроде `admin` или `usr` в public contracts.
