import type { UUID } from "crypto"
import { CreationOptional, DataTypes, InferAttributes, InferCreationAttributes, Model, Sequelize } from "sequelize"

export class NotificationChallengeModel extends Model<InferAttributes<NotificationChallengeModel>, InferCreationAttributes<NotificationChallengeModel>> {
  declare uid: CreationOptional<UUID>
  declare userUid: UUID
  declare purpose: "max_link" | "two_factor"
  declare codeHash: string
  declare expiresAt: Date
  declare attempts: CreationOptional<number>

  declare createdAt: CreationOptional<Date>
  declare updatedAt: CreationOptional<Date>

  declare consumedAt: Date | null
}

export function getNotificationChallengeModel(sequelize: Sequelize) {
  NotificationChallengeModel.init({
    uid: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
    userUid: { type: DataTypes.UUID, allowNull: false },
    purpose: { type: DataTypes.STRING(32), allowNull: false },
    codeHash: { type: DataTypes.STRING(64), allowNull: false },
    expiresAt: { type: DataTypes.DATE, allowNull: false },
    attempts: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0 },
    consumedAt: { type: DataTypes.DATE, allowNull: true },
    createdAt: { type: DataTypes.DATE, allowNull: false },
    updatedAt: { type: DataTypes.DATE, allowNull: false }
  }, { sequelize, tableName: "notification_challenges", modelName: "NotificationChallengeModel", paranoid: false, timestamps: true })

  return NotificationChallengeModel
}
