export default {
  feature_title: "Authentication",

  layout: {
    brand: "Ortic Admin",
    headline: "A place to shop a better smile",
    tagline: "Manage Ortic warehouses, products, stock, and orders in one place.",
  },

  callback: {
    title: "Finishing sign-in…",
    description: "One moment while we complete your Google sign-in.",
  },

  login: {
    page_title: "Sign in",
    page_description: "Sign in to the Ortic admin dashboard",
    google_button: "Continue with Google",
    divider: "or with email",
    email: {
      label: "Email",
      placeholder: "name{'@'}email.com",
      invalid: "Enter a valid email address",
      send_code: "Send sign-in code",
    },
    code: {
      label: "Sign-in code",
      sent_to: "We sent a 6-digit code to {email}. Check your spam folder too.",
      verify: "Sign in",
      resend: "Resend code",
      resend_in: "Resend in {seconds}s",
      change_email: "Use a different email",
    },
    in_app: {
      title: "Open in your browser to sign in with Google",
      description:
        "Google does not allow sign-in from in-app browsers (Instagram, TikTok, Facebook, etc). Open this page in Chrome or Safari, or sign in with email below.",
      open_chrome: "Open in Chrome",
      copy_link: "Copy link",
      copied: "Link copied. Paste it into Chrome or Safari.",
    },
    errors: {
      access_denied: "Google sign-in was cancelled.",
      account_conflict:
        "This email is already linked to another Google account. Sign in with that Google account or contact us.",
      google_login_failed: "Google sign-in failed. Try again or sign in with email.",
      invalid_login_code: "The code is wrong or has expired. Request a new code if needed.",
      too_many_requests: "Too many attempts. Please wait a moment and try again.",
      generic: "Something went wrong. Please try again.",
    },
  },
};
