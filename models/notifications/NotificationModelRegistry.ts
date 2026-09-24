import type { Sequelize } from "sequelize"
import { getMaxAccountModel, MaxAccountModel } from "./MaxAccountModel"
import { getMaxBotConfigurationModel, MaxBotConfigurationModel } from "./MaxBotConfigurationModel"
import { getNotificationChallengeModel, NotificationChallengeModel } from "./NotificationChallengeModel"
import { getNotificationModel, NotificationModel } from "./NotificationModel"

export interface NotificationModels {
  Notification: typeof NotificationModel
  MaxAccount: typeof MaxAccountModel
  MaxBotConfiguration: typeof MaxBotConfigurationModel
  NotificationChallenge: typeof NotificationChallengeModel
}

export function createNotificationModels(sequelize: Sequelize): NotificationModels {
  return {
    Notification: getNotificationModel(sequelize),
    MaxAccount: getMaxAccountModel(sequelize),
    MaxBotConfiguration: getMaxBotConfigurationModel(sequelize),
    NotificationChallenge: getNotificationChallengeModel(sequelize)
  }
}
