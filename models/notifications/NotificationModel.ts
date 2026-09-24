import type { UUID } from "crypto"
import { CreationOptional, DataTypes, InferAttributes, InferCreationAttributes, Model, Sequelize } from "sequelize"

export class NotificationModel extends Model<InferAttributes<NotificationModel>, InferCreationAttributes<NotificationModel>> {
  declare uid: CreationOptional<UUID>
  declare userUid: UUID
  declare kind: iSharedNotifications.NotificationKind
  declare title: string
  declare message: string

  declare createdAt: CreationOptional<Date>
  declare updatedAt: CreationOptional<Date>

  declare link: string | null
  declare readAt: Date | null
}

export function getNotificationModel(sequelize: Sequelize) {
  NotificationModel.init({
    uid: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
    userUid: { type: DataTypes.UUID, allowNull: false },
    kind: { type: DataTypes.STRING(32), allowNull: false },
    title: { type: DataTypes.STRING(160), allowNull: false },
    message: { type: DataTypes.TEXT, allowNull: false },
    link: { type: DataTypes.STRING(500), allowNull: true },
    readAt: { type: DataTypes.DATE, allowNull: true },
    createdAt: { type: DataTypes.DATE, allowNull: false },
    updatedAt: { type: DataTypes.DATE, allowNull: false }
  }, { sequelize, tableName: "notifications", modelName: "NotificationModel", paranoid: false, timestamps: true })

  return NotificationModel
}
