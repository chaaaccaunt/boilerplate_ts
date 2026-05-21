import { compareSync } from "bcryptjs"
import type { UUID } from "crypto"
import { sign } from "jsonwebtoken"
import type { SignOptions } from "jsonwebtoken"
import { Exceptions, Logger } from "@/libs"

interface LoginContext {
  headers: iContracts.iRequestContextPayload["headers"]
  remoteAddress?: string
  requestId: string
}

export class AuthorizationService {
  constructor(
    private readonly model: iDatabase.Models["User"],
    private readonly userSessionModel: iDatabase.Models["UserSession"],
    private readonly databaseTools: iLibs.DatabaseServiceTools,
    private readonly httpConfig: iLibs.iHTTPConfig,
    private readonly logger = new Logger()
  ) { }

  login(payload: iSharedAuthorization.LoginPayloadDto, context: LoginContext): Promise<iAuthorization.iLoginResult> {
    return this.model.findOne({
      where: { login: payload.login },
      include: [{
        association: this.model.associations.roles,
        include: [{ association: "role" }]
      }]
    })
      .then((user) => {
        if (!user || !compareSync(payload.password, user.password)) {
          throw new Exceptions.ServiceError.AuthenticationError("Неверный логин или пароль")
        }

        return this.createUserSession(user.uid, context)
          .then((session) => this.createLoginResult(user, session))
          .then((result) => {
            this.logger.info("Пользователь авторизовался", {
              requestId: context.requestId,
              serviceName: this.constructor.name,
              serviceMethod: "login",
              userId: user.uid,
              ipAddress: this.getIpAddress(context),
              userAgent: this.getUserAgent(context),
              deviceType: result.session.deviceType,
              operatingSystem: result.session.operatingSystem,
              browser: result.session.browser,
              mutation: true
            })

            return result
          })
      })
  }

  listSessions(user: iContracts.iUserToken): Promise<iSharedAuthorization.UserSessionsListResponseDto> {
    return this.userSessionModel.findAll({
      where: {
        userUid: user.uid,
        revokedAt: null
      },
      order: [["lastSeenAt", "DESC"]]
    })
      .then((sessions) => ({
        sessions: sessions.map((session) => this.toSessionDto(session, user.sessionUid))
      }))
  }

  revokeSession(user: iContracts.iUserToken, sessionUid: string): Promise<iSharedAuthorization.RevokeUserSessionResponseDto> {
    return this.userSessionModel.update({
      revokedAt: new Date()
    }, {
      where: {
        uid: sessionUid,
        userUid: user.uid,
        revokedAt: null
      },
      logging: this.databaseTools.createDatabaseQueryLogger({
        serviceName: this.constructor.name,
        serviceMethod: "revokeSession",
        event: "user_sessions revoke query",
        mutation: true
      })
    })
      .then(() => ({ success: true }))
  }

  revokeOtherSessions(user: iContracts.iUserToken): Promise<iSharedAuthorization.RevokeOtherUserSessionsResponseDto> {
    return this.userSessionModel.update({
      revokedAt: new Date()
    }, {
      where: {
        userUid: user.uid,
        revokedAt: null,
        uid: {
          [this.databaseTools.Op.ne]: user.sessionUid || ""
        }
      },
      logging: this.databaseTools.createDatabaseQueryLogger({
        serviceName: this.constructor.name,
        serviceMethod: "revokeOtherSessions",
        event: "user_sessions revoke other query",
        mutation: true
      })
    })
      .then(() => ({ success: true }))
  }

  touchSession(user: iContracts.iUserToken): Promise<void> {
    if (!user.sessionUid) return Promise.resolve()

    return this.userSessionModel.findOne({
      where: {
        uid: user.sessionUid,
        userUid: user.uid,
        revokedAt: null
      }
    })
      .then((session) => {
        if (!session) throw new Exceptions.ServiceError.AuthenticationError("Сессия пользователя недействительна")

        return session.update({
          lastSeenAt: new Date()
        }, {
          logging: this.databaseTools.createDatabaseQueryLogger({
            serviceName: this.constructor.name,
            serviceMethod: "touchSession",
            event: "user_sessions touch query",
            mutation: true
          })
        })
      })
      .then(() => undefined)
  }

  private createLoginResult(user: iDatabase.Models["User"]["prototype"], session: iDatabase.Models["UserSession"]["prototype"]): iAuthorization.iLoginResult {
    const signOptions: SignOptions = {
      expiresIn: "12h"
    }

    if (this.httpConfig.jwt_audience) signOptions.audience = this.httpConfig.jwt_audience
    if (this.httpConfig.jwt_issuer) signOptions.issuer = this.httpConfig.jwt_issuer

    const roles = user.roles.map((userRole) => ({
      uid: userRole.role.uid,
      name: userRole.role.name
    } satisfies iSharedUserRole.UserRoleDto))

    const userDto = {
      uid: user.uid,
      login: user.login,
      firstName: user.firstName,
      lastName: user.lastName,
      surname: user.surname,
      fullName: user.fullName,
      roles
    } satisfies iSharedAuthorization.LoginResponseDto

    const tokenPayload: iContracts.iUserToken = {
      uid: user.uid,
      sessionUid: session.uid,
      claims: {
        roles: roles.map((role) => role.name)
      }
    }

    return {
      user: userDto,
      session: this.toSessionDto(session, session.uid),
      accessToken: sign(tokenPayload, this.httpConfig.jwt_secret, signOptions)
    }
  }

  private createUserSession(userUid: string, context: LoginContext): Promise<iDatabase.Models["UserSession"]["prototype"]> {
    const userAgent = this.getUserAgent(context)
    const device = this.parseUserAgent(userAgent)
    const now = new Date()

    return this.userSessionModel.create({
      userUid: userUid as UUID,
      ipAddress: this.getIpAddress(context),
      userAgent,
      deviceType: device.deviceType,
      operatingSystem: device.operatingSystem,
      browser: device.browser,
      lastSeenAt: now,
      revokedAt: null
    }, {
      logging: this.databaseTools.createDatabaseQueryLogger({
        serviceName: this.constructor.name,
        serviceMethod: "createUserSession",
        event: "user_sessions insert query",
        mutation: true
      })
    })
  }

  private toSessionDto(session: iDatabase.Models["UserSession"]["prototype"], currentSessionUid?: string): iSharedAuthorization.UserSessionDto {
    return {
      uid: session.uid,
      userUid: session.userUid,
      ipAddress: session.ipAddress,
      userAgent: session.userAgent,
      deviceType: session.deviceType,
      operatingSystem: session.operatingSystem,
      browser: session.browser,
      lastSeenAt: session.lastSeenAt.toISOString(),
      createdAt: session.createdAt.toISOString(),
      isCurrent: Boolean(currentSessionUid && session.uid === currentSessionUid)
    }
  }

  private getIpAddress(context: LoginContext): string | null {
    const forwardedFor = context.headers["x-forwarded-for"]
    if (typeof forwardedFor === "string" && forwardedFor.trim()) return forwardedFor.split(",")[0].trim()

    const realIp = context.headers["x-real-ip"]
    if (typeof realIp === "string" && realIp.trim()) return realIp.trim()

    return context.remoteAddress || null
  }

  private getUserAgent(context: LoginContext): string {
    const value = context.headers["user-agent"]
    return typeof value === "string" && value.trim() ? value.slice(0, 500) : "unknown"
  }

  private parseUserAgent(userAgent: string): Pick<iSharedAuthorization.UserSessionDto, "deviceType" | "operatingSystem" | "browser"> {
    const lower = userAgent.toLowerCase()
    const deviceType = /mobile|iphone|android/.test(lower) ? "mobile" : /tablet|ipad/.test(lower) ? "tablet" : "desktop"
    const operatingSystem = lower.includes("windows")
      ? "Windows"
      : lower.includes("mac os") || lower.includes("macintosh")
        ? "macOS"
        : lower.includes("android")
          ? "Android"
          : lower.includes("iphone") || lower.includes("ipad")
            ? "iOS"
            : lower.includes("linux")
              ? "Linux"
              : "Неизвестная ОС"
    const browser = lower.includes("edg/")
      ? "Microsoft Edge"
      : lower.includes("chrome/")
        ? "Chrome"
        : lower.includes("firefox/")
          ? "Firefox"
          : lower.includes("safari/")
            ? "Safari"
            : "Неизвестный браузер"

    return { deviceType, operatingSystem, browser }
  }
}
