import { Store } from "vuex"

export function restoreAuthorizationFromPublicUserCookie(store: Store<iSharedState.RootState>): void {
  const user = readPublicUserCookie()

  if (!user) {
    store.commit("authorization/clearUser")
    return
  }

  store.commit("authorization/setUser", user)
}

function readPublicUserCookie(): iSharedUser.PublicUserDto | null {
  const cookieValue = getCookieValue(getRequiredPublicUserCookieName())

  if (!cookieValue) return null

  try {
    const parsedValue: unknown = JSON.parse(cookieValue)
    if (!isPublicUserDto(parsedValue)) return null
    return parsedValue
  } catch {
    return null
  }
}

function getRequiredPublicUserCookieName(): string {
  const cookieName = process.env.VUE_APP_AUTHORIZATION_PUBLIC_USER_COOKIE_NAME

  if (!cookieName || cookieName === "УкажитеЗначение") {
    throw new Error("Не задана обязательная переменная окружения VUE_APP_AUTHORIZATION_PUBLIC_USER_COOKIE_NAME")
  }

  return cookieName
}

function getCookieValue(cookieName: string): string | null {
  const cookie = document.cookie
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${cookieName}=`))

  if (!cookie) return null

  return decodeURIComponent(cookie.slice(cookieName.length + 1))
}

function isPublicUserDto(value: unknown): value is iSharedUser.PublicUserDto {
  if (!isRecord(value)) return false

  return (
    typeof value.uid === "string" &&
    typeof value.login === "string" &&
    typeof value.firstName === "string" &&
    typeof value.lastName === "string" &&
    (typeof value.surname === "string" || value.surname === null) &&
    typeof value.fullName === "string" &&
    Array.isArray(value.roles) &&
    value.roles.every(isUserRoleDto)
  )
}

function isUserRoleDto(value: unknown): value is iSharedUserRole.UserRoleDto {
  if (!isRecord(value)) return false

  return (
    typeof value.uid === "string" &&
    (value.name === "administrator" || value.name === "user")
  )
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}
