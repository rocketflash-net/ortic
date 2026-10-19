/**
 * Named routes for the authentication feature.
 *
 * @remarks
 * Use these constants in `router-link`, programmatic navigation,
 * and sidebar links to avoid hard-coded route name strings.
 */
export enum AuthenticationPageName {
  LOGIN = "Login",
  /** Landing page after Google sign-in; exchanges the one-time code for tokens. */
  LOGIN_CALLBACK = "LoginCallback",
}
