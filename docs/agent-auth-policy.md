# Политика authentication и authorization для агентов

## Назначение

Этот документ определяет границы authentication и authorization для агентов, работающих с этим boilerplate.

## Главное правило

Boilerplate не должен зашивать project-specific authorization policy в ядро.

Ядро приложения может предоставлять infrastructure для authentication, но роли, permissions, ownership rules, tenant rules и endpoint access policy принадлежат конкретному проекту.

## Authentication

Слой `httpServer` отвечает за transport handling authentication:

- extract token/cookie
- verify token
- validate token payload shape
- place authenticated identity into request context

Базовый token payload должен оставаться project-neutral:

- `uid`
- optional `claims`

`claims` являются extension data конкретного проекта. Агент не должен предполагать фиксированную структуру `claims`, если пользователь явно ее не определил.

## Authorization

Project-specific authorization должна реализовываться вне ядра boilerplate.

Примеры project-specific authorization:

- role ids
- role names
- permission names
- ownership checks
- organization или tenant checks
- endpoint access policy
- resource-level access rules

Агент не должен добавлять ничего из этого без отдельного явного запроса пользователя.

## Границы слоев

- Controller может выполнять endpoint access checks.
- Controller может вызывать project-specific access layer, если проект его определяет.
- Service выполняет business logic и data access.
- Service не должен мапить access decisions в HTTP status codes.
- Service не должен знать transport/protocol response details.

## Error mapping

Access decisions, которым нужны HTTP status codes, должны мапиться на границе controller или httpServer согласно архитектуре проекта.

Базовые ожидания:

- authentication failure -> 401 Unauthorized
- access denied -> 403 Forbidden

Конкретная причина access denial не должна раскрывать чувствительные детали policy, если проект явно этого не требует.
