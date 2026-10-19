/**
 * Detects in-app browsers (Instagram, Facebook, TikTok, LINE, generic WebViews).
 *
 * @remarks
 * Google blocks OAuth inside embedded WebViews (`disallowed_useragent`), so the login page warns
 * these users and offers ways to reopen the page in a real browser. Email OTP login still works there.
 */

// App-specific markers plus generic WebView signatures:
// - Android WebView adds "; wv)" to its user agent.
// - iOS WKWebView in third-party apps omits the "Safari/" token that Safari, Chrome (CriOS) and Firefox (FxiOS) send.
const IN_APP_PATTERNS = [
  /Instagram/i,
  /FBAN|FBAV|FB_IAB|FBIOS/i,
  /musical_ly|BytedanceWebview|TikTok/i,
  /\bLine\//i,
  /Twitter/i,
  /LinkedInApp/i,
  /Snapchat/i,
  /; wv\)/i,
  /(iPhone|iPod|iPad)(?!.*Safari\/).*AppleWebKit/i,
]

/**
 * Whether a user agent belongs to an in-app browser.
 *
 * @param userAgent - Defaults to the current browser's user agent.
 */
export function isInAppBrowser(userAgent: string = navigator.userAgent): boolean {
  return IN_APP_PATTERNS.some((pattern) => pattern.test(userAgent))
}

/**
 * Android intent URL that reopens a page in Chrome, or `null` on other platforms.
 *
 * @param url - Page to reopen.
 * @param userAgent - Defaults to the current browser's user agent.
 */
export function chromeIntentUrl(url: string, userAgent: string = navigator.userAgent): string | null {
  if (!/Android/i.test(userAgent)) return null

  const target = new URL(url)
  const scheme = target.protocol.replace(":", "")
  return `intent://${target.host}${target.pathname}${target.search}#Intent;scheme=${scheme};package=com.android.chrome;end`
}

/**
 * In-app browser state for the current page.
 */
export function useInAppBrowser() {
  const currentUrl = window.location.href

  return {
    isInApp: isInAppBrowser(),
    currentUrl,
    openInChromeUrl: chromeIntentUrl(currentUrl),
  }
}
