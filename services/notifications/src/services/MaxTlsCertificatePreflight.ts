import { X509Certificate } from "node:crypto"
import { readFileSync } from "node:fs"
import { isIP } from "node:net"
import { resolve } from "node:path"
import { connect } from "node:tls"

const certificatePattern = /-----BEGIN CERTIFICATE-----[\s\S]+?-----END CERTIFICATE-----/g
const defaultExpirationWarningDays = 30
const tlsConnectionTimeoutMs = 10_000
const tlsCertificateErrorCodes = new Set([
  "CERT_HAS_EXPIRED",
  "CERT_NOT_YET_VALID",
  "DEPTH_ZERO_SELF_SIGNED_CERT",
  "ERR_TLS_CERT_ALTNAME_INVALID",
  "SELF_SIGNED_CERT_IN_CHAIN",
  "UNABLE_TO_GET_ISSUER_CERT",
  "UNABLE_TO_GET_ISSUER_CERT_LOCALLY",
  "UNABLE_TO_VERIFY_LEAF_SIGNATURE"
])

export interface CertificateBundleValidationResult {
  readonly certificateCount: number
  readonly warnings: ReadonlyArray<string>
}

export interface MaxTlsCertificatePreflightResult extends CertificateBundleValidationResult {
  readonly bundlePath: string
}

export function runMaxTlsCertificatePreflight(apiUrl: string): Promise<MaxTlsCertificatePreflightResult> {
  if (process.env.NODE_TLS_REJECT_UNAUTHORIZED === "0") {
    throw new Error("NODE_TLS_REJECT_UNAUTHORIZED=0 запрещён: проверка TLS-сертификатов не может быть отключена")
  }

  const configuredBundlePath = process.env.NODE_EXTRA_CA_CERTS
  if (!configuredBundlePath) throw new Error("Для MAX API не задан NODE_EXTRA_CA_CERTS")

  const bundlePath = resolve(configuredBundlePath)
  const validationResult = validateCertificateBundle(readFileSync(bundlePath, "utf8"))

  return verifyTlsConnection(apiUrl)
    .then(() => ({
      bundlePath,
      ...validationResult
    }))
    .catch((error: unknown) => {
      if (isTlsCertificateError(error)) {
        throw new Error(`Не удалось проверить TLS-сертификат MAX API ${new URL(apiUrl).origin}: ${getErrorMessage(error)}`, { cause: error })
      }

      return {
        bundlePath,
        certificateCount: validationResult.certificateCount,
        warnings: validationResult.warnings.concat(
          `Контрольный TLS-handshake с MAX API временно недоступен: ${getErrorMessage(error)}`
        )
      }
    })
}

export function validateCertificateBundle(
  pemBundle: string,
  now = new Date(),
  expirationWarningDays = defaultExpirationWarningDays
): CertificateBundleValidationResult {
  if (!Number.isSafeInteger(expirationWarningDays) || expirationWarningDays < 1) {
    throw new Error("Порог предупреждения об окончании сертификата должен быть положительным целым числом")
  }

  const pemCertificates = pemBundle.match(certificatePattern) || []
  if (!pemCertificates.length) throw new Error("CA bundle не содержит PEM-сертификатов")

  const certificates = pemCertificates.map((pemCertificate, index) => createCertificate(pemCertificate, index))
  const fingerprints = new Set<string>()
  const warnings: string[] = []
  const warningThreshold = now.getTime() + expirationWarningDays * 24 * 60 * 60 * 1000

  certificates.forEach((certificate) => {
    if (fingerprints.has(certificate.fingerprint256)) {
      throw new Error(`CA bundle содержит повторяющийся сертификат ${certificate.subject}`)
    }
    fingerprints.add(certificate.fingerprint256)

    if (!certificate.ca) throw new Error(`Сертификат не предназначен для использования как CA: ${certificate.subject}`)

    const validFrom = new Date(certificate.validFrom)
    const validTo = new Date(certificate.validTo)
    if (!Number.isFinite(validFrom.getTime()) || !Number.isFinite(validTo.getTime())) {
      throw new Error(`Не удалось определить срок действия сертификата ${certificate.subject}`)
    }
    if (now < validFrom) throw new Error(`Сертификат ещё не действует: ${certificate.subject}; начало ${validFrom.toISOString()}`)
    if (now > validTo) throw new Error(`Срок действия сертификата истёк: ${certificate.subject}; окончание ${validTo.toISOString()}`)
    if (validTo.getTime() <= warningThreshold) {
      warnings.push(`Срок действия сертификата скоро закончится: ${certificate.subject}; окончание ${validTo.toISOString()}`)
    }
  })

  validateCertificateChains(certificates)

  return {
    certificateCount: certificates.length,
    warnings
  }
}

function createCertificate(pemCertificate: string, index: number): X509Certificate {
  try {
    return new X509Certificate(pemCertificate)
  } catch (error) {
    throw new Error(`Не удалось разобрать PEM-сертификат с индексом ${index}`, { cause: error })
  }
}

function validateCertificateChains(certificates: ReadonlyArray<X509Certificate>): void {
  const trustedRoots = certificates.filter((certificate) => isSelfSigned(certificate))
  if (!trustedRoots.length) throw new Error("CA bundle не содержит корректного самоподписанного корневого сертификата")

  certificates
    .filter((certificate) => !isSelfSigned(certificate))
    .forEach((certificate) => {
      const issuer = certificates.find((candidate) => certificate.checkIssued(candidate) && certificate.verify(candidate.publicKey))
      if (!issuer) throw new Error(`В CA bundle не найден издатель сертификата ${certificate.subject}`)
      if (!chainsToTrustedRoot(issuer, certificates, new Set())) {
        throw new Error(`Сертификат не связан с доверенным корнем CA bundle: ${certificate.subject}`)
      }
    })
}

function chainsToTrustedRoot(
  certificate: X509Certificate,
  certificates: ReadonlyArray<X509Certificate>,
  visitedFingerprints: Set<string>
): boolean {
  if (isSelfSigned(certificate)) return true
  if (visitedFingerprints.has(certificate.fingerprint256)) return false

  const nextVisitedFingerprints = new Set(visitedFingerprints)
  nextVisitedFingerprints.add(certificate.fingerprint256)
  const issuer = certificates.find((candidate) => certificate.checkIssued(candidate) && certificate.verify(candidate.publicKey))

  return issuer ? chainsToTrustedRoot(issuer, certificates, nextVisitedFingerprints) : false
}

function isSelfSigned(certificate: X509Certificate): boolean {
  return certificate.subject === certificate.issuer && certificate.verify(certificate.publicKey)
}

function verifyTlsConnection(apiUrl: string): Promise<void> {
  const url = new URL(apiUrl)
  if (url.protocol !== "https:") throw new Error("VAR_MAX_BOT_API_URL должен использовать HTTPS")

  const port = url.port ? Number(url.port) : 443

  return new Promise((resolvePromise, rejectPromise) => {
    let settled = false
    const socket = connect({
      host: url.hostname,
      port,
      rejectUnauthorized: true,
      servername: isIP(url.hostname) ? undefined : url.hostname
    })

    const fail = (error: Error): void => {
      if (settled) return
      settled = true
      socket.destroy()
      rejectPromise(error)
    }

    socket.setTimeout(tlsConnectionTimeoutMs, () => fail(new Error("Истекло время ожидания TLS-подключения")))
    socket.once("error", fail)
    socket.once("secureConnect", () => {
      if (settled) return
      settled = true
      socket.setTimeout(0)
      socket.removeListener("error", fail)
      socket.end()
      resolvePromise()
    })
  })
}

function isTlsCertificateError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false

  const code = "code" in error && typeof error.code === "string" ? error.code : ""
  if (tlsCertificateErrorCodes.has(code)) return true

  return /certificate|issuer|self[- ]signed|hostname|trust anchor/i.test(getErrorMessage(error))
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

