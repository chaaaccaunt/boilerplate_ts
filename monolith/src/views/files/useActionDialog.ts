import { ref } from "vue"

type ActionDialogResult = string | boolean | null

interface ActionDialogState {
  isOpen: boolean
  title: string
  message: string
  inputLabel: string
  inputValue: string
  inputMaxLength: number
  mode: "confirm" | "text"
  resolve: ((value: ActionDialogResult) => void) | null
}

export function useActionDialog() {
  const actionDialog = ref<ActionDialogState>({
    isOpen: false,
    title: "",
    message: "",
    inputLabel: "",
    inputValue: "",
    inputMaxLength: 180,
    mode: "confirm",
    resolve: null
  })

  function openTextDialog(title: string, inputLabel: string, initialValue: string, inputMaxLength: number): Promise<string | null> {
    return new Promise((resolvePromise) => {
      actionDialog.value = { isOpen: true, title, message: "", inputLabel, inputValue: initialValue, inputMaxLength, mode: "text", resolve: resolvePromise as (value: ActionDialogResult) => void }
    })
  }

  function openConfirmDialog(title: string, message: string): Promise<boolean> {
    return new Promise((resolvePromise) => {
      actionDialog.value = { isOpen: true, title, message, inputLabel: "", inputValue: "", inputMaxLength: 180, mode: "confirm", resolve: resolvePromise as (value: ActionDialogResult) => void }
    })
  }

  function submitActionDialog(): void {
    settle(actionDialog.value.mode === "text" ? actionDialog.value.inputValue : true)
  }

  function cancelActionDialog(): void {
    settle(actionDialog.value.mode === "text" ? null : false)
  }

  function settle(value: ActionDialogResult): void {
    const resolve = actionDialog.value.resolve
    if (!resolve) return
    actionDialog.value = { ...actionDialog.value, isOpen: false, resolve: null }
    resolve(value)
  }

  return { actionDialog, openTextDialog, openConfirmDialog, submitActionDialog, cancelActionDialog }
}
