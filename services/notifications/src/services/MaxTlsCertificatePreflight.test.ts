import assert from "node:assert/strict"
import test from "node:test"
import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { validateCertificateBundle } from "./MaxTlsCertificatePreflight"

const bundle = readFileSync(resolve(__dirname, "../../certificates/russian-trusted-ca-bundle.pem"), "utf8")

test("CA bundle содержит действующую связанную цепочку", () => {
  const result = validateCertificateBundle(bundle, new Date("2026-09-18T00:00:00.000Z"))

  assert.equal(result.certificateCount, 2)
  assert.deepEqual(result.warnings, [])
})

test("CA bundle предупреждает о скором окончании промежуточного сертификата", () => {
  const result = validateCertificateBundle(bundle, new Date("2027-02-10T00:00:00.000Z"))

  assert.equal(result.warnings.length, 1)
  assert.match(result.warnings[0], /Russian Trusted Sub CA/)
})

test("CA bundle с истёкшим промежуточным сертификатом отклоняется", () => {
  assert.throws(
    () => validateCertificateBundle(bundle, new Date("2027-03-07T00:00:00.000Z")),
    /Срок действия сертификата истёк:[\s\S]*Russian Trusted Sub CA/
  )
})

test("данные без PEM-сертификатов отклоняются", () => {
  assert.throws(() => validateCertificateBundle("not a certificate"), /не содержит PEM-сертификатов/)
})

