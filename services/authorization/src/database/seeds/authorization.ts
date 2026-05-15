import { hashSync } from "bcryptjs"

const testUser = {
  login: "admin@example.com",
  password: hashSync("password", 10),
  firstName: "Admin",
  lastName: "User",
  surname: null
}

const systemRoles: iSharedUserRole.UserRoleName[] = ["administrator", "user"]
const testUserRoles: iSharedUserRole.UserRoleName[] = ["administrator"]

export async function seedAuthorizationData(models: iDatabase.Models): Promise<void> {
  const roles = new Map<iSharedUserRole.UserRoleName, iDatabase.Models["Role"]["prototype"]>()

  for (const name of systemRoles) {
    const [role] = await models.Role.findOrCreate({
      where: { name },
      defaults: { name }
    })

    roles.set(name, role)
  }

  const [user] = await models.User.findOrCreate({
    where: { login: testUser.login },
    defaults: testUser
  })

  for (const name of testUserRoles) {
    const role = roles.get(name)
    if (!role) throw new Error(`Не найдена базовая роль: ${name}`)

    await models.UserRole.findOrCreate({
      where: {
        userUid: user.uid,
        roleUid: role.uid
      },
      defaults: {
        userUid: user.uid,
        roleUid: role.uid
      }
    })
  }

  await models.ChatRoom.findOrCreate({
    where: {
      type: "public",
      title: "Общий чат"
    },
    defaults: {
      type: "public",
      title: "Общий чат",
      createdByUserUid: user.uid
    }
  })
}
