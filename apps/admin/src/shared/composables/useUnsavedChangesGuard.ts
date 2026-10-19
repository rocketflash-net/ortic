import { type MaybeRefOrGetter, toValue } from "vue"
import { onBeforeRouteLeave, onBeforeRouteUpdate } from "vue-router"

import { useOverlay } from "@nuxt/ui/composables"
import { useEventListener } from "@vueuse/core"

import { translate } from "@/plugins/language"
import ConfirmModal from "@/shared/components/ConfirmModal.vue"

/**
 * Asks before the user leaves a page with unsaved changes.
 *
 * @remarks
 * In-app navigation (including a route param change on the same page) opens {@link ConfirmModal}.
 * Reloading or closing the tab can only use the browser's own dialog, whose text cannot be changed.
 * Call it from a component's `setup`.
 *
 * @param isDirty - True while the page has changes that are not saved yet.
 */
export const useUnsavedChangesGuard = (isDirty: MaybeRefOrGetter<boolean>) => {
  const confirmModal = useOverlay().create(ConfirmModal)

  const confirmLeave = async (): Promise<boolean> => {
    if (!toValue(isDirty)) return true

    // Closing the modal with Esc or the backdrop resolves without a value, which counts as staying.
    const confirmed = await confirmModal.open({
      title: translate("utils.unsaved_changes.title"),
      description: translate("utils.unsaved_changes.description"),
      confirmLabel: translate("utils.unsaved_changes.leave"),
    })
    return confirmed === true
  }

  onBeforeRouteLeave(confirmLeave)
  onBeforeRouteUpdate(confirmLeave)

  useEventListener(window, "beforeunload", (event: BeforeUnloadEvent) => {
    if (toValue(isDirty)) event.preventDefault()
  })
}
