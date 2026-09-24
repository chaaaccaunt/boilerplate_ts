import Sequelize, { Options, Sequelize as SequelizeClass } from "sequelize"
import { createNotificationModels, NotificationModels } from "@/models/notifications/NotificationModelRegistry"

export interface iModels extends NotificationModels { }

declare global {
  namespace iDatabase { interface Models extends iModels { } }
}

export class Database {
  readonly Sequelize = Sequelize
  readonly sequelize: SequelizeClass
  readonly models: iDatabase.Models

  constructor(config: Options) {
    this.sequelize = new SequelizeClass(config)
    this.models = createNotificationModels(this.sequelize)
  }
}
