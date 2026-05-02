# Правила shared-контрактов

## Граница данных между backend и frontend

Frontend и backend должны синхронизироваться через сериализованные JSON contracts, а не через backend runtime classes.

Frontend не должен зависеть от:

- Sequelize model classes
- backend service/controller classes
- Node-only types
- ORM instances, associations metadata, getters, methods или других runtime-only values

Shared contracts описывают только JSON-safe DTO shape, который пересекает HTTP boundary.

## Расположение shared-типов

Shared DTO/API contracts должны находиться в `./shared/@types`.

Backend и frontend TypeScript configs должны включать эту папку, чтобы оба package реагировали на изменения contracts:

```json
"include": [
  "../shared/@types/**/*.d.ts"
]
```

## Именование DTO

DTO types должны называться по сериализованному payload, который они описывают:

```ts
iSharedUser.PublicUserDto
iSharedAuth.LoginPayloadDto
iSharedAuth.LoginResponseDto
iSharedApi.ResponseEnvelope<TResult>
```

Backend-only данные, например password hashes, access tokens stored in cookies, Sequelize metadata, DB-only columns и internal service results, не должны попадать в shared DTO, если они не являются намеренной частью HTTP JSON contract.

## Маппинг на backend

Если backend model намеренно содержит все поля, необходимые public JSON DTO, model class должен implement этот DTO.
Это создает compile-time синхронизацию между model declarations и public contract без передачи самой model во frontend code.

Пример:

```ts
export class UserModel extends Model<InferAttributes<UserModel>, InferCreationAttributes<UserModel>> implements iSharedUser.PublicUserDto {
  declare uid: CreationOptional<UUID>
  declare login: string
  declare firstName: string
  declare lastName: string
  declare surname: string | null
  declare readonly fullName: CreationOptional<string>
}
```

Backend code все равно обязан мапить database/service objects в shared DTO перед возвратом данных через controllers/httpServer.

Пример:

```ts
const userDto = {
  uid: user.uid,
  login: user.login,
  firstName: user.firstName,
  lastName: user.lastName,
  surname: user.surname,
  fullName: user.fullName
} satisfies iSharedUser.PublicUserDto
```

Изменение Sequelize model не должно автоматически менять frontend data.
Если меняется API JSON shape, нужно обновить shared DTO contract и дать backend/frontend typecheck проверить соответствие.

## Контракты состояния frontend

Shared frontend state contracts, которые намеренно зависят от API DTO, должны находиться в `./shared/@types/state.d.ts`.

Vuex root/module state должен использовать shared state contracts, если state хранит API DTO:

```ts
export const store = createStore<iSharedState.RootState>({
  state: {
    auth: {
      user: null,
      isAuthenticated: false
    }
  }
})
```

Vue `$store` type должен использовать тот же shared root state, чтобы component access реагировал на изменения shared contracts:

```ts
declare module "vue" {
  interface ComponentCustomProperties {
    $store: Store<iSharedState.RootState>
  }
}
```

UI-only state, например form drafts, loading flags, modal state, selected tabs и temporary validation errors, должен оставаться frontend-local, если он не является намеренной частью shared application contract.
