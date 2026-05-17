# Правила shared-контрактов

## Граница данных между backend и frontend

Frontend и backend должны синхронизироваться через сериализованные JSON contracts, а не через backend runtime classes.

Frontend не должен зависеть от:

- Sequelize model classes
- backend service/controller classes
- Node-only types
- ORM instances, associations metadata, getters, methods или других runtime-only values

Shared contracts описывают только JSON-safe DTO shape, который пересекает HTTP boundary.

## Строгость contracts и fallback-значения

Проект должен быть строгим к обязательным данным.

Если поле объявлено обязательным в shared contract, backend и frontend не должны подставлять fallback-значение при его отсутствии.

Отсутствие обязательного поля должно приводить к явной ошибке:

- на backend: validation error, controlled domain error или ошибка конфигурации;
- на frontend: controlled application error или явная ошибка инициализации.

Fallback-значения разрешены только для полей, которые явно объявлены optional и для которых отсутствие значения является нормальным сценарием.

Fallback-значения запрещены для обязательных системных сущностей и invariant проекта.
Если код ожидает обязательную запись, например системную публичную chat room, отсутствие такой записи должно приводить к явной controlled error.
Нельзя заменять обязательную сущность первой доступной записью, пустым объектом, случайным identifier или другим похожим значением.

Примеры допустимого fallback:

```ts
const label = optionalLabel ?? "Без названия"
```

Примеры недопустимого fallback:

```ts
const apiUrl = process.env.VUE_APP_BASE_URL || ""
const userUid = response.uid || crypto.randomUUID()
const roles = user.roles || []
const activeRoomUid = rooms.find((room) => room.type === "public")?.uid || rooms[0]?.uid
```

Если значение обязательно для корректной работы, нужно не скрывать проблему fallback-ом, а остановить выполнение с понятной ошибкой.

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
iSharedAuthorization.LoginPayloadDto
iSharedAuthorization.LoginResponseDto
iSharedApi.ResponseEnvelope<TResult>
```

Backend-only данные, например password hashes, access tokens stored in cookies, Sequelize metadata, DB-only columns и internal service results, не должны попадать в shared DTO, если они не являются намеренной частью HTTP JSON contract.

## Публичные chat DTO

Chat DTO должны отдавать frontend только данные, необходимые для отображения интерфейса и дальнейших разрешенных действий.

Публичные chat response DTO не должны раскрывать backend/internal user identifiers:

- `ChatMessageDto` не должен содержать `senderUserUid`;
- отправитель сообщения должен передаваться отдельным JSON-safe объектом с публичными полями отображения.

Исключение: `ChatRoomDto.createdByUserUid` допускается как минимальный owner marker для active `group` room, чтобы frontend мог показывать owner-only действия без дополнительного запроса.
Для `public`, `archived_by_owner` и `orphaned` rooms это поле должно быть `null`.
Frontend не должен отображать `createdByUserUid` как пользовательский текст.

Payload создания chat room не должен принимать `type` и `title` от frontend.
Frontend передает только выбранных участников, а backend определяет тип комнаты по составу участников и задает начальное название.

Для boilerplate публичный отправитель сообщения описывается так:

```ts
interface ChatMessageSenderDto {
  firstName: string
  lastName: string
}
```

Frontend отображает отправителя как `Фамилия Имя`.

Служебные identifiers могут оставаться во входных payload только там, где они являются явной частью пользовательского действия, например `roomUid` для выбора комнаты или `fileUid` для отправки уже загруженного файла.
Такие identifiers не должны использоваться как отображаемый текст UI.

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
    authorization: {
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

