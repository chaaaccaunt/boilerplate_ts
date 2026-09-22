export function saveBlob(blob: Blob, fileName: string): void {
  const objectUrl = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = objectUrl
  link.download = fileName
  link.style.display = "none"
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000)
}

export function copyText(text: string): Promise<void> {
  if (navigator.clipboard?.writeText) return navigator.clipboard.writeText(text)

  return new Promise((resolvePromise, rejectPromise) => {
    const textarea = document.createElement("textarea")
    textarea.value = text
    textarea.setAttribute("readonly", "true")
    textarea.style.position = "fixed"
    textarea.style.left = "-9999px"
    textarea.style.top = "0"
    document.body.appendChild(textarea)
    textarea.select()

    const isCopied = document.execCommand("copy")
    document.body.removeChild(textarea)

    if (isCopied) {
      resolvePromise()
      return
    }

    rejectPromise(new Error("Не удалось скопировать текст"))
  })
}
