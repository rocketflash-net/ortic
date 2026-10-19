import * as valibot from "valibot"

import { translate } from "@/plugins/language"

/**
 * Client-side validation for the email step of the login page.
 *
 * @remarks
 * Used by `UForm` via the Standard Schema protocol; the API validates again.
 */
export const emailLoginSchema = valibot.object({
  email: valibot.pipe(
    valibot.string(),
    valibot.trim(),
    valibot.nonEmpty(() => translate("features.authentication.login.email.invalid")),
    valibot.email(() => translate("features.authentication.login.email.invalid")),
  ),
})

/** Inferred output type of {@link emailLoginSchema}. */
export type EmailLoginForm = valibot.InferOutput<typeof emailLoginSchema>
