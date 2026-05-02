const testUser = {
  login: "admin@example.com",
  password: "password",
  firstName: "Admin",
  lastName: "User",
  surname: null
}

const testRoles = ["admin"]

export async function seedAuthorizationData(models: iDatabase.Models): Promise<void> {
  const [user] = await models.User.findOrCreate({
    where: { login: testUser.login },
    defaults: testUser
  })

  for (const name of testRoles) {
    await models.UserRole.findOrCreate({
      where: {
        userUid: user.uid,
        name
      },
      defaults: {
        userUid: user.uid,
        name
      }
    })
  }
}
