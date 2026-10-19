import type { TokenPairResponse } from "@/shared/helpers/token-storage"

/** Payload for `POST /auth/email/request`. */
export type RequestEmailCodeRequest = {
  email: string
}

/** Returned after a login code was emailed. */
export type RequestEmailCodeResponse = {
  email: string
  expires_in_seconds: number
  /** Seconds before another code may be requested for the same email. */
  resend_after_seconds: number
}

/** Payload for `POST /auth/email/verify`. */
export type VerifyEmailCodeRequest = {
  email: string
  /** 6-digit code from the email. */
  code: string
  /** Dashboard path to open after login. */
  redirect?: string
}

/** Token pair plus the dashboard path to open next. */
export type VerifyEmailCodeResponse = TokenPairResponse & {
  /** Safe dashboard path to navigate to. */
  redirect: string
}

/** Payload for `POST /auth/google/exchange`. */
export type ExchangeGoogleCodeRequest = {
  code: string
}
