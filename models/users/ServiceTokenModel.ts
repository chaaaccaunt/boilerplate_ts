import type { UUID } from "crypto"
import { CreationOptional, DataTypes, InferAttributes, InferCreationAttributes, Model, Sequelize } from "sequelize"

export class ServiceTokenModel extends Model<InferAttributes<ServiceTokenModel>, InferCreationAttributes<ServiceTokenModel>> {
  declare uid: CreationOptional<UUID>
  declare type: iSharedServiceToken.ServiceTokenType
  declare serviceName: string
  declare displayName: string
  declare encryptedToken: string
  declare tokenIv: string
  declare tokenAuthTag: string
  declare tokenPreview: string
  declare isEnabled: boolean
  declare createdAt: CreationOptional<Date>
  declare updatedAt: CreationOptional<Date>

  static associate() { }
}

export function getServiceTokenModel(sequelize: Sequelize) {
  ServiceTokenModel.init(
    {
      uid: {
        type: DataTypes.UUID,
        primaryKey: true,
        defaultValue: DataTypes.UUIDV4
      },
      type: {
        type: DataTypes.STRING(32),
        allowNull: false
      },
      serviceName: {
        type: DataTypes.STRING(80),
        allowNull: false
      },
      displayName: {
        type: DataTypes.STRING(120),
        allowNull: false
      },
      encryptedToken: {
        type: DataTypes.TEXT,
        allowNull: false
      },
      tokenIv: {
        type: DataTypes.STRING(64),
        allowNull: false
      },
      tokenAuthTag: {
        type: DataTypes.STRING(64),
        allowNull: false
      },
      tokenPreview: {
        type: DataTypes.TEXT,
        allowNull: false
      },
      isEnabled: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true
      },
      createdAt: {
        type: DataTypes.DATE,
        allowNull: false
      },
      updatedAt: {
        type: DataTypes.DATE,
        allowNull: false
      }
    },
    {
      sequelize,
      tableName: "service_tokens",
      modelName: "ServiceTokenModel",
      timestamps: true,
      indexes: [
        {
          unique: true,
          fields: ["type", "serviceName"]
        }
      ]
    }
  )

  return ServiceTokenModel
}
