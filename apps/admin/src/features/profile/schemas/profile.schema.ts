import * as valibot from "valibot"

import { translate } from "@/plugins/language"

/** Longest name the API accepts (`users.name` is varchar(150)). */
const NAME_MAX_LENGTH = 150

/**
 * Client-side validation for the profile form.
 *
 * @remarks
 * Used by `UForm` via the Standard Schema protocol; the API validates again.
 */
export const profileSchema = valibot.object({
  name: valibot.pipe(
    valibot.string(),
    valibot.trim(),
    valibot.nonEmpty(() => translate("features.profile.form.name_required")),
    valibot.maxLength(NAME_MAX_LENGTH, () =>
      translate("features.profile.form.name_too_long", { max: NAME_MAX_LENGTH }),
    ),
  ),
})

/** Inferred output type of {@link profileSchema}. */
export type ProfileForm = valibot.InferOutput<typeof profileSchema>
