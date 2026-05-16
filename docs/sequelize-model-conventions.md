# Правила Sequelize models

## Порядок объявления модели

При создании или изменении Sequelize model class агент обязан соблюдать следующий порядок объявлений внутри класса:

- обычные поля модели
- внешние ключи
- `static associate(models: iDatabase.Models) { ... }`
- поля, возникающие при ассоциации, объявленные через `NonAttribute`
- `declare static associations: { ... }`

Внешние ключи должны объявляться через `ForeignKey<T>`, например `declare userUid: ForeignKey<UUID>`.

Пример:

```ts
export class SomeModel extends Model<InferAttributes<SomeModel>, InferCreationAttributes<SomeModel>> {
  declare uid: CreationOptional<UUID>
  declare name: string

  declare userUid: ForeignKey<UUID>

  static associate(models: iDatabase.Models) {
    this.belongsTo(models.User, { foreignKey: "userUid", as: "user" })
  }

  declare user: NonAttribute<UserModel>

  declare static associations: {
    user: Association<SomeModel, UserModel>
  };
}
```

## Подключение модели

После создания Sequelize model class агент обязан выполнить дальнейшие шаги только в явно запрошенном пользователем объеме:

- Если модель использует типы из других моделей в association-полях или `declare static associations`, импортировать соответствующие model class в файл модели.
- Если модель должна быть доступна через общий список моделей конкретного backend-сервиса, импортировать model class и factory (`get...Model`) в `./services/<service-name>/src/database/instance.ts`.
- Добавить модель в interface `iModels` в `./services/<service-name>/src/database/instance.ts` в формате `ModelName: typeof ModelClass`.
- Добавить модель в объект `this.models` внутри constructor `Database` в формате `ModelName: getModelName(this.sequelize)`.
- После создания всех моделей вызвать `associate(this.models)` для каждой модели через обход объекта `this.models`.
- Добавить SQL-миграцию для новой или измененной таблицы в `./services/database-migration/src/database/migrations`.
- Миграция должна создавать или изменять schema явно и не должна заменяться runtime `sequelize.sync()`.
- Не подключать созданную модель в `iModels`, `this.models`, controllers, services или routes без отдельного явного запроса пользователя.
- После добавления или изменения Sequelize model набор миграций должен поднимать актуальную schema на пустой базе через `npm run project -- reset`.
- Нельзя полагаться на dev `sequelize.sync()` как на единственный способ создания таблиц, потому что reset-flow выполняет setup и миграции до запуска backend-сервисов.

Пример подключения модели в `./services/<service-name>/src/database/instance.ts`:

```ts
import { getUserModel, UserModel } from "@/models/users/UserModel"
import { getUserRoleModel, UserRoleModel } from "@/models/users/UserRoleModel"

export interface iModels {
  User: typeof UserModel
  UserRole: typeof UserRoleModel
}

export class Database {
  readonly sequelize: Sequelize
  readonly models: iDatabase.Models

  constructor(config: Options) {
    this.sequelize = new Sequelize(config)
    this.models = {
      User: getUserModel(this.sequelize),
      UserRole: getUserRoleModel(this.sequelize)
    }

    Object.keys(this.models).forEach((key) => {
      this.models[key as keyof typeof this.models].associate(this.models)
    })
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
