import { createCipheriv, createDecipheriv, randomBytes } from "crypto"

interface EncryptedTokenPayload {
  encryptedToken: string
  tokenIv: string
  tokenAuthTag: string
}

export class ServiceTokenEncryptionService {
  private readonly key: Buffer

  constructor(rawKey: string) {
    this.key = this.parseKey(rawKey)
  }

  encrypt(token: string): EncryptedTokenPayload {
    const tokenIv = randomBytes(12)
    const cipher = createCipheriv("aes-256-gcm", this.key, tokenIv)
    const encryptedToken = Buffer.concat([
      cipher.update(token, "utf8"),
      cipher.final()
    ])

    return {
      encryptedToken: encryptedToken.toString("base64"),
      tokenIv: tokenIv.toString("base64"),
      tokenAuthTag: cipher.getAuthTag().toString("base64")
    }
  }

  decrypt(payload: EncryptedTokenPayload): string {
    const decipher = createDecipheriv("aes-256-gcm", this.key, Buffer.from(payload.tokenIv, "base64"))
    decipher.setAuthTag(Buffer.from(payload.tokenAuthTag, "base64"))

    return Buffer.concat([
      decipher.update(Buffer.from(payload.encryptedToken, "base64")),
      decipher.final()
    ]).toString("utf8")
  }

  private parseKey(rawKey: string): Buffer {
    const key = Buffer.from(rawKey, "base64")

    if (key.length !== 32) {
      throw new Error("VAR_SERVICE_TOKEN_ENCRYPTION_KEY должен быть base64-строкой длиной 32 байта после декодирования")
    }

    return key
  }
}
