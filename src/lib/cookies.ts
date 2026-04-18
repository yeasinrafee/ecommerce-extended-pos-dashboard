import type { AuthTokens } from "@/types/auth"

const IS_BROWSER = typeof document !== "undefined"

const defaultCookieOptions = {
  path: "/",
  sameSite: "Lax" as const,
  secure: process.env.NODE_ENV === "production"
}

type CookieOptions = {
  expiresDays?: number
  path?: string
  sameSite?: "Strict" | "Lax" | "None"
  secure?: boolean
}

const setRawCookie = (name: string, value: string, options: CookieOptions = {}) => {
  if (!IS_BROWSER) return

  const opts = { ...defaultCookieOptions, ...options }
  const expires = typeof opts.expiresDays === "number"
    ? `; Expires=${new Date(Date.now() + opts.expiresDays * 24 * 60 * 60 * 1000).toUTCString()}`
    : ""

  const secureFlag = opts.secure ? "; Secure" : ""
  const sameSite = opts.sameSite ? `; SameSite=${opts.sameSite}` : ""

  document.cookie = `${name}=${encodeURIComponent(value)}; Path=${opts.path}${sameSite}${secureFlag}${expires}`
}

const getRawCookie = (name: string) => {
  if (!IS_BROWSER) return undefined

  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`))

  if (!match) {
    return undefined
  }

  return decodeURIComponent(match[1])
}

const deleteCookie = (name: string) => {
  if (!IS_BROWSER) return

  document.cookie = `${name}=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT` +
    "; SameSite=Lax"
}

export const ACCESS_TOKEN_KEY = "accessToken"
export const REFRESH_TOKEN_KEY = "refreshToken"

export const setAuthCookies = (tokens: AuthTokens) => {
  setRawCookie(ACCESS_TOKEN_KEY, tokens.accessToken, { expiresDays: 1 / 24 })
  setRawCookie(REFRESH_TOKEN_KEY, tokens.refreshToken, { expiresDays: 30 })
}

export const getAccessTokenFromCookie = () => getRawCookie(ACCESS_TOKEN_KEY)

export const getRefreshTokenFromCookie = () => getRawCookie(REFRESH_TOKEN_KEY)

export const clearAuthCookies = () => {
  deleteCookie(ACCESS_TOKEN_KEY)
  deleteCookie(REFRESH_TOKEN_KEY)
}
