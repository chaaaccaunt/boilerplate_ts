import type { Sequelize } from "sequelize"
import { getPermissionModel, PermissionModel } from "./PermissionModel"
import { getRoleModel, RoleModel } from "./RoleModel"
import { getRolePermissionModel, RolePermissionModel } from "./RolePermissionModel"
import { getUserModel, UserModel } from "./UserModel"
import { getUserRoleModel, UserRoleModel } from "./UserRoleModel"
import { getUserSessionModel, UserSessionModel } from "./UserSessionModel"

export interface UserModels {
  User: typeof UserModel
  Role: typeof RoleModel
  Permission: typeof PermissionModel
  RolePermission: typeof RolePermissionModel
  UserRole: typeof UserRoleModel
}

export interface AuthorizationModels extends UserModels {
  UserSession: typeof UserSessionModel
}

export function createUserModels(sequelize: Sequelize): UserModels {
  const models: UserModels = {
    User: getUserModel(sequelize),
    Role: getRoleModel(sequelize),
    Permission: getPermissionModel(sequelize),
    RolePermission: getRolePermissionModel(sequelize),
    UserRole: getUserRoleModel(sequelize)
  }

  associateUserModels(models)

  return models
}

export function createAuthorizationModels(sequelize: Sequelize): AuthorizationModels {
  const models: AuthorizationModels = {
    ...createUserModels(sequelize),
    UserSession: getUserSessionModel(sequelize)
  }

  models.UserSession.associate(models)

  return models
}

function associateUserModels(models: UserModels): void {
  models.User.associate(models)
  models.Role.associate(models)
  models.Permission.associate(models)
  models.RolePermission.associate(models)
  models.UserRole.associate(models)
}
