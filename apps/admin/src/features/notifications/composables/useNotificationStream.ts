import { useQueryClient } from "@tanstack/vue-query"
import { onBeforeUnmount, onMounted } from "vue"
import { useRouter } from "vue-router"

import axiosInstance, { apiBaseUrl } from "@/plugins/axios"
import { useAppToast } from "@/plugins/nuxt-ui/toaster"
import { getTokens } from "@/shared/helpers/token-storage"

import { notificationStyle, type AdminNotification } from "../models"
import { notificationQueryKeys } from "../services/api"

const MIN_RETRY_MS = 1_000
const MAX_RETRY_MS = 30_000

/**
 * Keeps a Server-Sent Events connection to `GET /admin/notifications/stream` open while the dashboard layout is mounted.
 *
 * @remarks
 * `EventSource` cannot send the Authorization header, so the stream is read with `fetch` + `ReadableStream`.
 * A 401 (expired access token) is renewed by making one normal axios call, whose interceptor refreshes the token pair;
 * any other failure reconnects with exponential backoff. Each notification shows a toast and refreshes the bell,
 * order lists, and the dashboard.
 */
export function useNotificationStream() {
  const queryClient = useQueryClient()
  const router = useRouter()
  const { showToast } = useAppToast()

  let controller: AbortController | null = null
  let retryTimer: ReturnType<typeof setTimeout> | undefined
  let retryMs = MIN_RETRY_MS
  let stopped = false

  const handle = (notification: AdminNotification) => {
    queryClient.invalidateQueries({ queryKey: notificationQueryKeys.all })
    queryClient.invalidateQueries({ queryKey: ["orders"] })
    queryClient.invalidateQueries({ queryKey: ["dashboard"] })
    if (notification.type === "low_stock") queryClient.invalidateQueries({ queryKey: ["stocks"] })

    const style = notificationStyle(notification.type)
    showToast.custom({
      variant: style.color === "error" ? "error" : style.color === "warning" ? "warning" : "primary",
      icon: style.icon,
      title: notification.title,
      description: notification.body ?? undefined,
      duration: 8000,
      actions: notification.link ? [{ label: "Buka", color: "neutral", variant: "outline", onClick: () => void router.push(notification.link!) }] : undefined,
    })
  }

  // One SSE block: "event: notification\ndata: {...}". Comment lines (": ping") are ignored.
  const parseBlock = (block: string) => {
    let event = "message"
    const data: string[] = []
    for (const line of block.split("\n")) {
      if (line.startsWith("event:")) event = line.slice(6).trim()
      else if (line.startsWith("data:")) data.push(line.slice(5).trimStart())
    }
    if (event !== "notification" || data.length === 0) return
    try {
      handle(JSON.parse(data.join("\n")) as AdminNotification)
    } catch {
      // Malformed payload: skip it, the bell list still shows it after the next refresh.
    }
  }

  const scheduleReconnect = () => {
    if (stopped) return
    clearTimeout(retryTimer)
    retryTimer = setTimeout(connect, retryMs)
    retryMs = Math.min(retryMs * 2, MAX_RETRY_MS)
  }

  async function connect() {
    if (stopped) return
    const accessToken = getTokens()?.accessToken
    if (!accessToken) return scheduleReconnect()

    controller = new AbortController()
    try {
      const response = await fetch(`${apiBaseUrl}/admin/notifications/stream`, {
        headers: { Authorization: `Bearer ${accessToken}`, Accept: "text/event-stream" },
        signal: controller.signal,
      })
      if (response.status === 401) {
        // Let the axios interceptor refresh the token pair, then reconnect right away.
        await axiosInstance.get("/admin/notifications", { params: { page: 1, limit: 1 } }).catch(() => undefined)
        if (getTokens()?.accessToken && getTokens()?.accessToken !== accessToken) return void connect()
        return scheduleReconnect()
      }
      if (!response.ok || !response.body) return scheduleReconnect()

      retryMs = MIN_RETRY_MS
      // Catch up on anything that arrived while disconnected.
      queryClient.invalidateQueries({ queryKey: notificationQueryKeys.all })

      const reader = response.body.pipeThrough(new TextDecoderStream()).getReader()
      let buffer = ""
      for (;;) {
        const { value, done } = await reader.read()
        if (done) break
        buffer += value.replace(/\r\n/g, "\n")
        let separator = buffer.indexOf("\n\n")
        while (separator !== -1) {
          parseBlock(buffer.slice(0, separator))
          buffer = buffer.slice(separator + 2)
          separator = buffer.indexOf("\n\n")
        }
      }
      scheduleReconnect()
    } catch {
      if (!controller?.signal.aborted) scheduleReconnect()
    }
  }

  onMounted(() => {
    stopped = false
    void connect()
  })

  onBeforeUnmount(() => {
    stopped = true
    clearTimeout(retryTimer)
    controller?.abort()
  })
}
