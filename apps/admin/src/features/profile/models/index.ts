export enum ProfilePageName {
  PROFILE = "Profile",
}

/** Body for `PATCH /auth/me`. The email is the login identity and cannot be changed. */
export type UpdateProfileRequest = {
  name: string
}
