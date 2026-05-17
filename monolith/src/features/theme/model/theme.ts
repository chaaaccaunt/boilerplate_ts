import { computed, readonly, ref } from "vue"

export type ThemePreference = "auto" | "light" | "dark"
export type ResolvedTheme = "light" | "dark"

const themeStorageKey = "application:theme-preference"
const themePreference = ref<ThemePreference>("auto")
const systemTheme = ref<ResolvedTheme>("light")
let systemThemeQuery: MediaQueryList | null = null

const resolvedTheme = computed<ResolvedTheme>(() => {
  if (themePreference.value === "auto") return systemTheme.value
  return themePreference.value
})

export function initializeTheme(): void {
  themePreference.value = readStoredThemePreference()
  systemThemeQuery = getSystemThemeQuery()
  systemTheme.value = resolveSystemTheme(systemThemeQuery)
  applyTheme()

  if (!systemThemeQuery) return

  systemThemeQuery.addEventListener("change", handleSystemThemeChange)
}

export function useTheme() {
  return {
    themePreference: readonly(themePreference),
    resolvedTheme,
    setThemePreference
  }
}

export function setThemePreference(preference: ThemePreference): void {
  themePreference.value = preference
  localStorage.setItem(themeStorageKey, preference)
  applyTheme()
}

function handleSystemThemeChange(event: MediaQueryListEvent): void {
  systemTheme.value = event.matches ? "dark" : "light"
  applyTheme()
}

function applyTheme(): void {
  document.documentElement.classList.toggle("dark", resolvedTheme.value === "dark")
  document.documentElement.style.colorScheme = resolvedTheme.value
}

function readStoredThemePreference(): ThemePreference {
  const storedValue = localStorage.getItem(themeStorageKey)

  if (storedValue === "auto" || storedValue === "light" || storedValue === "dark") {
    return storedValue
  }

  return "auto"
}

function getSystemThemeQuery(): MediaQueryList | null {
  if (!window.matchMedia) return null
  return window.matchMedia("(prefers-color-scheme: dark)")
}

function resolveSystemTheme(query: MediaQueryList | null): ResolvedTheme {
  if (!query) return "light"
  return query.matches ? "dark" : "light"
}
