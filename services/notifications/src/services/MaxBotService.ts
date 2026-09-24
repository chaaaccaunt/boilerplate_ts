import { Bot, Context } from "@maxhub/max-bot-api"
import { Logger } from "@/libs"
import { runMaxTlsCertificatePreflight } from "./MaxTlsCertificatePreflight"

export interface MaxLinkRequest {
  code: string
  maxUserId: string
  maxChatId: string
  displayName: string | null
}

export interface PreparedMaxBot {
  readonly bot: Bot
  readonly username: string
}

export class MaxBotService {
  private bot: Bot | null = null
  private botUsername: string | null = null
  private running = false

  constructor(
    private readonly apiUrl: string,
    private readonly linkAccount: (request: MaxLinkRequest) => Promise<void>,
    private readonly logger = new Logger()
  ) { }

  prepare(token: string): Promise<PreparedMaxBot> {
    return Promise.resolve().then(() => runMaxTlsCertificatePreflight(this.apiUrl)).then((preflight) => {
      preflight.warnings.forEach((warning) => this.logger.warn(warning))
      const bot = new Bot(token, { clientOptions: { baseUrl: this.apiUrl } })

      return bot.api.getMyInfo().then((botInfo) => {
        if (!botInfo.username) throw new Error("У MAX-бота отсутствует username")

        bot.botInfo = botInfo
        return { bot, username: botInfo.username }
      })
    })
  }

  activate(preparedBot: PreparedMaxBot): void {
    this.bot?.stopPolling()
    this.registerHandlers(preparedBot.bot)
    this.bot = preparedBot.bot
    this.botUsername = preparedBot.username
    this.running = true

    void preparedBot.bot.start({ mode: "polling", options: { retry: true } }).catch((error) => {
      if (this.bot !== preparedBot.bot) return

      this.running = false
      this.logger.error("Не удалось запустить MAX-бота", { error: error instanceof Error ? error : String(error) })
    })
  }

  getStatus(): Readonly<{ running: boolean; botUsername: string | null }> {
    return { running: this.running, botUsername: this.botUsername }
  }

  sendToUser(maxUserId: string, message: string): Promise<void> {
    if (!this.bot) return Promise.resolve()

    return this.bot.api.sendMessageToUser(Number(maxUserId), message).then(() => undefined)
  }

  private registerHandlers(bot: Bot): void {
    bot.on("bot_started", (context) => this.handleBotStarted(context))
    bot.catch((error) => {
      this.logger.error("Ошибка MAX бота", { error: error instanceof Error ? error : String(error) })
    })
  }

  private handleBotStarted(context: Context): Promise<void> {
    const code = /^link_([A-Z0-9]{8})$/i.exec(context.startPayload || "")?.[1]?.toUpperCase()
    const user = context.user

    if (!code || !user || !context.chatId) {
      return context.reply("Откройте ссылку привязки из настроек приложения.").then(() => undefined)
    }

    const displayName = [user.first_name, user.last_name].filter(Boolean).join(" ") || user.username

    return this.linkAccount({
      code,
      maxUserId: String(user.user_id),
      maxChatId: String(context.chatId),
      displayName: displayName || null
    })
      .then(() => context.reply("MAX успешно привязан к аккаунту. Теперь сюда могут приходить уведомления и коды 2FA."))
      .catch(() => context.reply("Код привязки неверен или истёк. Создайте новый код в настройках."))
      .then(() => undefined)
  }
}
