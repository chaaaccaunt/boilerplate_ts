# Правила Sequelize models

## Порядок объявления модели

При создании или изменении Sequelize model class агент обязан соблюдать следующий порядок объявлений внутри класса:

- первичный идентификатор и обязательные обычные поля;
- пустая строка-разделитель;
- опциональные обычные поля, включая создаваемые автоматически timestamps;
- пустая строка-разделитель;
- nullable-поля с типом `T | null`;
- пустая строка-разделитель;
- внешние ключи: сначала обязательные, затем nullable;
- пустая строка-разделитель;
- `static associate(models: NarrowAssociationModels) { ... }`;
- пустая строка-разделитель;
- поля, возникающие при ассоциации, объявленные через `NonAttribute`;
- пустая строка-разделитель;
- `declare static associations: { ... }`.

Группы не смешиваются между собой. `CreationOptional<T>` описывает возможность не передавать значение при создании и сам по себе не определяет группу: первичный `uid` остается в первой группе, а автоматически создаваемые `createdAt` и `updatedAt` относятся к опциональным полям. Если какой-либо группы в модели нет, она пропускается вместе с относящимся к ней разделителем. Внешние ключи должны объявляться через `ForeignKey<T>`, например `declare userUid: ForeignKey<UUID>`; nullable-внешний ключ объявляется как `ForeignKey<T> | null`.

Пример:

```ts
export class SomeModel extends Model<InferAttributes<SomeModel>, InferCreationAttributes<SomeModel>> {
  declare uid: CreationOptional<UUID>
  declare name: string

  declare createdAt: CreationOptional<Date>

  declare description: string | null

  declare userUid: ForeignKey<UUID>
  declare parentUid: ForeignKey<UUID> | null

  static associate(models: { User: typeof UserModel }) {
    this.belongsTo(models.User, { foreignKey: "userUid", as: "user" })
  }

  declare user: NonAttribute<UserModel>

  declare static associations: {
    user: Association<SomeModel, UserModel>
  };
}
```

## Обязательные options модели

В options вызова `Model.init()` каждая модель обязана явно задавать:

- `tableName` — фактическое имя таблицы;
- `paranoid` — используется ли soft delete;
- `timestamps` — управляет ли Sequelize полями времени.

Эти параметры нельзя оставлять на Sequelize defaults, даже если требуемое значение совпадает со значением по умолчанию. Явная запись является частью контракта модели и должна сохраняться при создании и изменении model class.

## Подключение модели

После создания Sequelize model class агент обязан выполнить дальнейшие шаги только в явно запрошенном пользователем объеме:

- Если модель использует типы из других моделей в association-полях или `declare static associations`, импортировать соответствующие model class в файл модели.
- Для каждой `associate` указывать минимальный структурный контракт только с теми моделями, которые действительно нужны ее связям.
- Если модель должна входить в runtime-набор, добавить ее в соответствующий registry в корневом `models/<domain>/*ModelRegistry.ts`.
- Registry является единственным местом создания согласованного набора моделей и подключения его ассоциаций.
- Package-local `Database` получает готовый registry через `create...Models(sequelize)` и не перечисляет модели или вызовы `associate` повторно.
- Package-local `iModels` расширяет точный тип registry и не содержит незагруженные модели.
- Добавить SQL-миграцию для новой или измененной таблицы в `./services/database-migration/src/database/migrations`.
- Миграция должна создавать или изменять schema явно и не должна заменяться runtime `sequelize.sync()`.
- Не подключать созданную модель в registry, `iModels`, controllers, services или routes без отдельного явного запроса пользователя.
- Не использовать `as iDatabase.Models`, optional-поля или фиктивные imports для имитации отсутствующих моделей.
- После добавления или изменения Sequelize model набор миграций должен поднимать актуальную schema на пустой базе через `npm run project -- init <db-host> <db-admin-user> <db-admin-password>`.
- Нельзя полагаться на dev `sequelize.sync()` как на единственный способ создания таблиц, потому что init-flow выполняет setup и миграции до запуска backend-сервисов.

Пример подключения готового registry в `./services/<service-name>/src/database/instance.ts`:

```ts
import { createUserModels, UserModels } from "@/models/users/UserModelRegistry"

export interface iModels extends UserModels { }

export class Database {
  readonly sequelize: Sequelize
  readonly models: iDatabase.Models

  constructor(config: Options) {
    this.sequelize = new Sequelize(config)
    this.models = createUserModels(this.sequelize)
  }
}
```

## Роли пользователя и справочник ролей

Если модель содержит `userUid` и описывает роль конкретного пользователя, она является связующей сущностью пользователя и роли.

В таком случае предпочтительное имя:

- model class: `UserRoleModel`;
- table name: `user_roles`;
- shared DTO: `UserRoleDto`.

Имя `RoleModel` следует использовать для справочника ролей, который не привязан напрямую к одному пользователю.

Если проекту нужны расширяемые роли и permissions, предпочтительная схема:

```text
users
roles
user_roles
permissions
role_permissions
```

Boilerplate не должен зашивать конкретную role-based access policy в ядро. Модели ролей могут быть подготовлены как infrastructure, но конкретные правила доступа принадлежат проекту.
