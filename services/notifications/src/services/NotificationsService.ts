import { createHash, randomInt } from "crypto"
import type { UUID } from "crypto"
import { Op } from "sequelize"
import { DatabaseServiceTools, Exceptions, Logger } from "@/libs"
import { MaxBotService, MaxLinkRequest, PreparedMaxBot } from "./MaxBotService"
import { RealtimeNotificationClient } from "./RealtimeNotificationClient"

const maxBotConfigurationUid = "00000000-0000-4000-8000-000000000001" as UUID

export class NotificationsService {
  private readonly maxBot: MaxBotService

  constructor(
    private readonly notificationModel: iDatabase.Models["Notification"],
    private readonly maxAccountModel: iDatabase.Models["MaxAccount"],
    private readonly maxBotConfigurationModel: iDatabase.Models["MaxBotConfiguration"],
    private readonly challengeModel: iDatabase.Models["NotificationChallenge"],
    private readonly realtimeClient: RealtimeNotificationClient,
    private readonly databaseTools: DatabaseServiceTools,
    maxBotApiUrl: string,
    private readonly logger = new Logger()
  ) {
    this.maxBot = new MaxBotService(maxBotApiUrl, (request) => this.linkMaxAccount(request), logger)
  }

  start(): Promise<void> {
    return this.maxBotConfigurationModel.findByPk(maxBotConfigurationUid)
      .then((configuration) => {
        if (!configuration) {
          this.logger.warn("MAX-бот не настроен")
          return undefined
        }

        return this.maxBot.prepare(configuration.token).then((preparedBot) => {
          this.maxBot.activate(preparedBot)
          if (preparedBot.username === configuration.botUsername) return undefined

          return configuration.update({ botUsername: preparedBot.username }).then(() => undefined)
        })
      })
      .catch((error) => {
        this.logger.error("Не удалось запустить настроенного MAX-бота", { error: error instanceof Error ? error : String(error) })
      })
  }

  list(userUid: string, limit = 25, offset = 0): Promise<iSharedNotifications.ListNotificationsResponseDto> {
    return Promise.all([
      this.notificationModel.findAndCountAll({ where: { userUid }, limit, offset, order: [["createdAt", "DESC"]] }),
      this.notificationModel.count({ where: { userUid, readAt: null } })
    ]).then(([result, unreadCount]) => ({
      notifications: result.rows.map((item) => this.toDto(item)),
      total: result.count,
      limit,
      offset,
      unreadCount
    }))
  }

  create(payload: iSharedNotifications.CreateNotificationPayloadDto): Promise<iSharedNotifications.NotificationDto> {
    return this.notificationModel.create({
      userUid: payload.userUid as UUID,
      kind: payload.kind,
      title: payload.title,
      message: payload.message,
      link: payload.link || null,
      readAt: null
    }).then((model) => {
      const notification = this.toDto(model)
      return Promise.allSettled([
        this.realtimeClient.notify({ userUid: payload.userUid, notification }),
        this.sendNotificationToMax(payload.userUid, notification)
      ]).then(() => notification)
    })
  }

  markRead(userUid: string, notificationUid: string): Promise<iSharedNotifications.NotificationMutationResponseDto> {
    return this.notificationModel.update({ readAt: new Date() }, { where: { uid: notificationUid, userUid } })
      .then(() => ({ success: true }))
  }

  markAllRead(userUid: string): Promise<iSharedNotifications.NotificationMutationResponseDto> {
    return this.notificationModel.update({ readAt: new Date() }, { where: { userUid, readAt: null } })
      .then(() => ({ success: true }))
  }

  getMaxStatus(userUid: string): Promise<iSharedNotifications.MaxAccountStatusDto> {
    return this.maxAccountModel.findOne({ where: { userUid } }).then((account) => ({
      linked: Boolean(account),
      twoFactorEnabled: account?.twoFactorEnabled || false,
      maxDisplayName: account?.maxDisplayName || null,
      botAvailable: this.maxBot.getStatus().running
    }))
  }

  getMaxBotStatus(): Promise<iSharedNotifications.MaxBotStatusDto> {
    return this.maxBotConfigurationModel.findByPk(maxBotConfigurationUid).then((configuration) => {
      const runtimeStatus = this.maxBot.getStatus()

      return {
        configured: Boolean(configuration),
        running: runtimeStatus.running,
        botUsername: runtimeStatus.botUsername || configuration?.botUsername || null,
        updatedAt: configuration?.updatedAt.toISOString() || null
      }
    })
  }

  updateMaxBot(token: string, requestId?: string): Promise<iSharedNotifications.MaxBotStatusDto> {
    const normalizedToken = token.trim()

    return this.maxBot.prepare(normalizedToken)
      .catch((error) => {
        this.logger.warn("Не удалось проверить или запустить MAX-бота", {
          requestId,
          serviceName: this.constructor.name,
          serviceMethod: "updateMaxBot",
          error: error instanceof Error ? error : String(error)
        })
        throw new Exceptions.ServiceError.ConflictError("Не удалось подключить MAX-бота. Проверьте токен.", { cause: error })
      })
      .then((preparedBot) => this.saveMaxBotConfiguration(normalizedToken, preparedBot, requestId))
      .then(() => this.getMaxBotStatus())
  }

  createMaxLinkCode(userUid: string): Promise<iSharedNotifications.MaxLinkCodeResponseDto> {
    const botUsername = this.maxBot.getStatus().botUsername
    if (!this.maxBot.getStatus().running || !botUsername) {
      throw new Exceptions.ServiceError.ConflictError("MAX-бот пока не запущен")
    }

    const code = this.generateCode(8)
    const expiresAt = new Date(Date.now() + 10 * 60_000)

    return this.challengeModel.create({
      userUid: userUid as UUID,
      purpose: "max_link",
      codeHash: this.hash(code),
      expiresAt,
      attempts: 0,
      consumedAt: null
    }).then(() => ({
      expiresAt: expiresAt.toISOString(),
      link: `https://max.ru/${encodeURIComponent(botUsername)}?start=${encodeURIComponent(`link_${code}`)}`
    }))
  }

  unlinkMax(userUid: string): Promise<iSharedNotifications.NotificationMutationResponseDto> {
    return this.maxAccountModel.destroy({ where: { userUid } }).then(() => ({ success: true }))
  }

  setTwoFactor(userUid: string, enabled: boolean): Promise<iSharedNotifications.MaxAccountStatusDto> {
    return this.maxAccountModel.findOne({ where: { userUid } }).then((account) => {
      if (!account) throw new Exceptions.ServiceError.ConflictError("Сначала привяжите аккаунт MAX")
      return account.update({ twoFactorEnabled: enabled })
    }).then(() => this.getMaxStatus(userUid))
  }

  beginTwoFactor(userUid: string): Promise<iSharedNotifications.BeginTwoFactorResponseDto> {
    return this.maxAccountModel.findOne({ where: { userUid, twoFactorEnabled: true } }).then((account) => {
      if (!account) return { required: false }

      const code = this.generateCode(6)
      const expiresAt = new Date(Date.now() + 5 * 60_000)
      return this.challengeModel.create({
        userUid: userUid as UUID,
        purpose: "two_factor",
        codeHash: this.hash(code),
        expiresAt,
        attempts: 0,
        consumedAt: null
      }).then((challenge) => this.maxBot.sendToUser(account.maxUserId, `Код входа: ${code}. Он действует 5 минут.`)
        .then(() => ({ required: true, challengeUid: challenge.uid, expiresAt: expiresAt.toISOString() })))
    })
  }

  verifyTwoFactor(challengeUid: string, code: string): Promise<iSharedNotifications.VerifyTwoFactorResponseDto> {
    return this.challengeModel.findOne({ where: { uid: challengeUid, purpose: "two_factor", consumedAt: null } }).then((challenge) => {
      if (!challenge || challenge.expiresAt.getTime() <= Date.now() || challenge.attempts >= 5) {
        throw new Exceptions.ServiceError.AuthenticationError("Код недействителен или истёк")
      }
      if (challenge.codeHash !== this.hash(code)) {
        return challenge.increment("attempts").then(() => { throw new Exceptions.ServiceError.AuthenticationError("Неверный код") })
      }
      return challenge.update({ consumedAt: new Date() }).then(() => ({ userUid: challenge.userUid }))
    })
  }

  private linkMaxAccount(request: MaxLinkRequest): Promise<void> {
    return this.challengeModel.findOne({
      where: { purpose: "max_link", codeHash: this.hash(request.code), consumedAt: null, expiresAt: { [Op.gt]: new Date() } },
      order: [["createdAt", "DESC"]]
    }).then((challenge) => {
      if (!challenge) throw new Error("Invalid link code")
      return this.maxAccountModel.upsert({
        userUid: challenge.userUid,
        maxUserId: request.maxUserId,
        maxChatId: request.maxChatId,
        maxDisplayName: request.displayName,
        twoFactorEnabled: false
      }).then(() => challenge.update({ consumedAt: new Date() })).then(() => undefined)
    })
  }

  private saveMaxBotConfiguration(token: string, preparedBot: PreparedMaxBot, requestId?: string): Promise<void> {
    return this.maxBotConfigurationModel.upsert({
      uid: maxBotConfigurationUid,
      token,
      botUsername: preparedBot.username
    }, {
      logging: this.databaseTools.createDatabaseQueryLogger({
        requestId,
        serviceName: this.constructor.name,
        serviceMethod: "updateMaxBot",
        event: "max_bot_configuration upsert query",
        mutation: true
      })
    }).then(() => {
      this.maxBot.activate(preparedBot)
    })
  }

  private sendNotificationToMax(userUid: string, notification: iSharedNotifications.NotificationDto): Promise<void> {
    return this.maxAccountModel.findOne({ where: { userUid } }).then((account) => {
      if (!account) return undefined
      return this.maxBot.sendToUser(account.maxUserId, `${notification.title}\n\n${notification.message}`)
    })
  }

  private toDto(model: iDatabase.Models["Notification"]["prototype"]): iSharedNotifications.NotificationDto {
    return { uid: model.uid, kind: model.kind, title: model.title, message: model.message, link: model.link, readAt: model.readAt?.toISOString() || null, createdAt: model.createdAt.toISOString() }
  }

  private generateCode(length: number): string {
    const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
    return Array.from({ length }, () => alphabet[randomInt(0, alphabet.length)]).join("")
  }

  private hash(value: string): string { return createHash("sha256").update(value.trim().toUpperCase()).digest("hex") }
}
