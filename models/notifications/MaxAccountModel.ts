import type { UUID } from "crypto"
import { CreationOptional, DataTypes, InferAttributes, InferCreationAttributes, Model, Sequelize } from "sequelize"

export class MaxAccountModel extends Model<InferAttributes<MaxAccountModel>, InferCreationAttributes<MaxAccountModel>> {
  declare uid: CreationOptional<UUID>
  declare userUid: UUID
  declare maxUserId: string
  declare maxChatId: string
  declare twoFactorEnabled: CreationOptional<boolean>

  declare createdAt: CreationOptional<Date>
  declare updatedAt: CreationOptional<Date>

  declare maxDisplayName: string | null
}

export function getMaxAccountModel(sequelize: Sequelize) {
  MaxAccountModel.init({
    uid: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
    userUid: { type: DataTypes.UUID, allowNull: false, unique: true },
    maxUserId: { type: DataTypes.STRING(64), allowNull: false, unique: true },
    maxChatId: { type: DataTypes.STRING(64), allowNull: false },
    twoFactorEnabled: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    maxDisplayName: { type: DataTypes.STRING(160), allowNull: true },
    createdAt: { type: DataTypes.DATE, allowNull: false },
    updatedAt: { type: DataTypes.DATE, allowNull: false }
  }, { sequelize, tableName: "max_accounts", modelName: "MaxAccountModel", paranoid: false, timestamps: true })

  return MaxAccountModel
}
