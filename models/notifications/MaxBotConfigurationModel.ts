import type { UUID } from "crypto"
import { CreationOptional, DataTypes, InferAttributes, InferCreationAttributes, Model, Sequelize } from "sequelize"

export class MaxBotConfigurationModel extends Model<InferAttributes<MaxBotConfigurationModel>, InferCreationAttributes<MaxBotConfigurationModel>> {
  declare uid: UUID
  declare token: string
  declare botUsername: string

  declare createdAt: CreationOptional<Date>
  declare updatedAt: CreationOptional<Date>
}

export function getMaxBotConfigurationModel(sequelize: Sequelize) {
  MaxBotConfigurationModel.init({
    uid: { type: DataTypes.UUID, primaryKey: true },
    token: { type: DataTypes.TEXT, allowNull: false },
    botUsername: { type: DataTypes.STRING(128), allowNull: false },
    createdAt: { type: DataTypes.DATE, allowNull: false },
    updatedAt: { type: DataTypes.DATE, allowNull: false }
  }, { sequelize, tableName: "max_bot_configuration", modelName: "MaxBotConfigurationModel", paranoid: false, timestamps: true })

  return MaxBotConfigurationModel
}
