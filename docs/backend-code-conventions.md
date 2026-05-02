# Правила backend-кода

## Использование Sequelize helpers

Агент не должен импортировать ORM helpers напрямую в services, controllers и иной прикладной код:

```ts
import { Op, fn } from "sequelize"
```

Вместо этого helpers должны браться от database instance:

```ts
const { Op, fn } = database.Sequelize
```

`database.sequelize` используется как live Sequelize connection instance.
`database.Sequelize` используется как доступ к статическим Sequelize helpers/runtime utilities, например `Op`, `fn`, `col`, `literal`, `where`.

Service не должен принимать весь `database` instance как зависимость.
Service должен получать только явно необходимые зависимости: конкретные models, набор models или Sequelize helpers.

Для типизации Sequelize helpers в service следует использовать глобальный namespace:

```ts
private readonly helpers: iDatabase.Database["Sequelize"]
```

Это ограничение нужно для будущей изоляции services: каждый service может быть вынесен в отдельный микросервис и подключаться к БД под отдельным логином с правами только на необходимые таблицы.

## Экспорты libs и глобальные типы

Все публичные exports backend package из `./back/src/libs` должны быть доступны через единый public barrel `@/libs`.

Прикладной код не должен импортировать напрямую из внутренних файлов libs:

```ts
import { Exceptions } from "@/libs/Exceptions"
import { Logger } from "@/libs/Logger"
import { iHTTPConfig } from "@/libs/HTTPServer"
```

Вместо этого runtime values должны импортироваться из `@/libs`:

```ts
import { Exceptions, Logger } from "@/libs"
```

Типы, экспортируемые из libs, должны быть объявлены в глобальном namespace `iLibs` в `./back/@types/libs.d.ts` и использоваться без локального импорта:

```ts
private readonly httpConfig: iLibs.iHTTPConfig
private readonly exceptions: iLibs.Exceptions
```

`AppConfiguration`, env helpers и готовый `config` относятся к libs и должны находиться внутри `./back/src/libs/Config`.
Отдельный bootstrap layer не используется.
