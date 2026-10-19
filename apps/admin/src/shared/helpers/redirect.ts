/**
 * Keeps post-login redirects inside the dashboard (prevents open redirects through `?redirect=`).
 *
 * @param value - Candidate path, usually from the URL query.
 * @returns The path when it is a same-app absolute path, otherwise `/`.
 *
 * @example
 * ```ts
 * safeRedirectPath("/events/12") // "/events/12"
 * safeRedirectPath("//evil.com") // "/"
 * ```
 */
export function safeRedirectPath(value: unknown): string {
  if (typeof value !== "string") return "/"
  const isAppPath = value.startsWith("/") && !value.startsWith("//") && !value.includes("\\")
  return isAppPath ? value : "/"
}
