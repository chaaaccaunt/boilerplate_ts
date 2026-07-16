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
    if (isPublicUserDto(parsedValue)) return parsedValue
    if (isPublicUserCookieDto(parsedValue)) return toPublicUserDto(parsedValue)
    return null
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
    value.roles.every(isUserRoleDto) &&
    Array.isArray(value.permissions) &&
    value.permissions.every(isPermissionDto)
  )
}

function isUserRoleDto(value: unknown): value is iSharedUserRole.UserRoleDto {
  if (!isRecord(value)) return false

  return (
    typeof value.uid === "string" &&
    typeof value.name === "string" &&
    Array.isArray(value.permissions) &&
    value.permissions.every(isPermissionDto)
  )
}

function isPublicUserCookieDto(value: unknown): value is iSharedAuthorization.PublicUserCookieDto {
  if (!isRecord(value)) return false

  return (
    typeof value.uid === "string" &&
    typeof value.login === "string" &&
    typeof value.firstName === "string" &&
    typeof value.lastName === "string" &&
    (typeof value.surname === "string" || value.surname === null) &&
    typeof value.fullName === "string" &&
    Array.isArray(value.roles) &&
    value.roles.every(isPublicUserCookieRoleDto) &&
    Array.isArray(value.permissionKeys) &&
    value.permissionKeys.every((permissionKey) => typeof permissionKey === "string")
  )
}

function isPublicUserCookieRoleDto(value: unknown): value is iSharedAuthorization.PublicUserCookieRoleDto {
  if (!isRecord(value)) return false

  return (
    typeof value.uid === "string" &&
    typeof value.name === "string"
  )
}

function toPublicUserDto(value: iSharedAuthorization.PublicUserCookieDto): iSharedUser.PublicUserDto {
  const permissions = value.permissionKeys.map((permissionKey) => ({
    uid: permissionKey,
    key: permissionKey,
    title: permissionKey,
    description: null
  }))

  return {
    uid: value.uid,
    login: value.login,
    firstName: value.firstName,
    lastName: value.lastName,
    surname: value.surname,
    fullName: value.fullName,
    roles: value.roles.map((role) => ({
      uid: role.uid,
      name: role.name,
      permissions: []
    })),
    permissions
  }
}

function isPermissionDto(value: unknown): value is iSharedPermission.PermissionDto {
  if (!isRecord(value)) return false

  return (
    typeof value.uid === "string" &&
    typeof value.key === "string" &&
    typeof value.title === "string" &&
    (typeof value.description === "string" || value.description === null)
  )
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}
