class Validator {
  constructor() { }

  private static invalidMessage(key: string) {
    return `Проверьте корректность введенных данных. Значение "${key}" имеет недопустимые данные`
  }

  private static missingMessage(key: string) {
    return `Проверьте корректность введенных данных. Отсутствует значение "${key}"`
  }

  private static shortStringMessage(key: string) {
    return `Проверьте корректность введенных данных. Значение "${key}" содержит меньше символов, чем ожидается`
  }

  private static longStringMessage(key: string) {
    return `Проверьте корректность введенных данных. Значение "${key}" содержит больше символов, чем ожидается`
  }

  private static smallNumberMessage(key: string) {
    return `Проверьте корректность введенных данных. Значение "${key}" содержит меньшее значение, чем ожидается`
  }

  private static bigNumberMessage(key: string) {
    return `Проверьте корректность введенных данных. Значение "${key}" содержит большее значение, чем ожидается`
  }

  private static unexpectedFieldMessage(key: string) {
    return `Проверьте корректность введенных данных. Значение "${key}" не предусмотрено схемой`
  }

  static objectValidate(payload: { value: iContracts.iPayloadValue | undefined, key: string }, scheme: iContracts.iPrimitive): { error: boolean, message: string } {
    if (scheme.number && scheme.asNumber && typeof payload.value === "string") {
      const trimmed = payload.value.trim()
      if (!trimmed.length) return { error: true, message: this.invalidMessage(payload.key) }
      const parsed = Number(trimmed)
      if (!Number.isFinite(parsed)) return { error: true, message: this.invalidMessage(payload.key) }
      payload.value = parsed
    }

    if (scheme.string) {
      if (typeof payload.value !== "string") return { error: true, message: this.invalidMessage(payload.key) }
      if (payload.value.length < scheme.string.minLength) return { error: true, message: this.shortStringMessage(payload.key) }
      if (scheme.string.maxLength && payload.value.length > scheme.string.maxLength) return { error: true, message: this.longStringMessage(payload.key) }
      if (scheme.string.reg && !scheme.string.reg.test(payload.value)) return { error: true, message: this.invalidMessage(payload.key) }
    } else if (scheme.number) {
      if (typeof payload.value !== "number") return { error: true, message: this.invalidMessage(payload.key) }
      if (payload.value < scheme.number.min) return { error: true, message: this.smallNumberMessage(payload.key) }
      if (typeof scheme.number.max === "number" && payload.value > scheme.number.max) return { error: true, message: this.bigNumberMessage(payload.key) }
    } else if (scheme.boolean) {
      if (typeof payload.value !== "boolean") return { error: true, message: this.invalidMessage(payload.key) }
    }

    return { error: false, message: "" }
  }

  static arrayValidate(payload: iContracts.iPayloadValue[], scheme: iContracts.iValidator): { error: boolean, message: string } {
    if (scheme.isObject) {
      for (let i = 0; i < payload.length; i++) {
        if (!this.isPayload(payload[i])) return { error: true, message: this.invalidMessage(String(i)) }
        const { error, message } = this.validator(payload[i], scheme.isObject)
        if (error) return { error: true, message }
      }
    }

    if (scheme.isPrimitive) {
      for (let i = 0; i < payload.length; i++) {
        const primitivePayload = { key: String(i), value: payload[i] }
        const { error, message } = this.objectValidate(primitivePayload, scheme.isPrimitive)
        if (error) return { error: true, message }
        payload[i] = primitivePayload.value
      }
    }

    return { error: false, message: "" }
  }

  static isEmail(payload: string): { error: boolean, message: string } {
    const valid = new RegExp(/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/).test(payload)
    return { error: !valid, message: valid ? "" : this.invalidMessage("login") }
  }

  static validator(payload: iContracts.iPayload, scheme: iContracts.iScheme): { error: boolean, message: string } {
    const types = Object.entries(scheme)
    const payloadKeys = Object.keys(payload)
    const unexpectedFieldIndex = payloadKeys.findIndex((key) => types.findIndex(([knownKey]) => knownKey === key) === -1)
    if (unexpectedFieldIndex !== -1) return { error: true, message: this.unexpectedFieldMessage(payloadKeys[unexpectedFieldIndex]) }

    for (let i = 0; i < types.length; i++) {
      const [key, type] = types[i]

      if (type.optional && typeof payload[key] === "undefined") continue
      if (typeof payload[key] === "undefined" && !type.optional) return { error: true, message: this.missingMessage(key) }

      if (type.isPrimitive) {
        const primitivePayload = { key, value: payload[key] }
        const { error, message } = PayloadValidator.objectValidate(primitivePayload, type.isPrimitive)
        if (error) return { error: true, message }
        payload[key] = primitivePayload.value
      } else if (type.isArray) {
        if (!Array.isArray(payload[key])) return { error: true, message: this.invalidMessage(key) }
        const { error, message } = PayloadValidator.arrayValidate(payload[key], type.isArray)
        if (error) return { error: true, message }
      } else if (type.isObject) {
        if (!this.isPayload(payload[key])) return { error: true, message: this.invalidMessage(key) }
        const { error, message } = PayloadValidator.validator(payload[key], type.isObject)
        if (error) return { error: true, message }
      } else if (type.isEmail) {
        if (typeof payload[key] !== "string") return { error: true, message: this.invalidMessage(key) }
        const { error, message } = PayloadValidator.isEmail(payload[key])
        if (error) return { error: true, message }
      }
    }

    return { message: "", error: false }
  }

  private static isPayload(value: iContracts.iPayloadValue | undefined): value is iContracts.iPayload {
    return typeof value === "object" && value !== null && !Array.isArray(value)
  }
}


const PayloadValidator = Object.freeze(Validator)

export { PayloadValidator }
