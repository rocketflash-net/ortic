/** Notification from `GET /admin/notifications` and the SSE stream. Dates are ISO strings. */
export type AdminNotification = {
  id: number
  /** order_paid | order_needs_action | shipment_failed | order_completed | order_returned | low_stock */
  type: string
  title: string
  body: string | null
  /** Dashboard path, e.g. `/orders/ORT-261020-ABCDE`. */
  link: string | null
  warehouse_id: number | null
  is_read: boolean
  created_at: string
}

export type NotificationListInfo = {
  pagination: { page: number; limit: number; total: number; totalPages: number }
  unread_count: number
}

const TEXT_CLASS = { primary: "text-primary", success: "text-success", warning: "text-warning", error: "text-error", neutral: "text-muted" } as const

/** Icon and colour per notification type. */
export const NOTIFICATION_STYLE: Record<string, { icon: string; color: "primary" | "success" | "warning" | "error" | "neutral" }> = {
  order_paid: { icon: "i-lucide-shopping-bag", color: "primary" },
  order_needs_action: { icon: "i-lucide-circle-alert", color: "error" },
  shipment_failed: { icon: "i-lucide-truck", color: "error" },
  order_completed: { icon: "i-lucide-package-check", color: "success" },
  order_returned: { icon: "i-lucide-undo-2", color: "warning" },
  low_stock: { icon: "i-lucide-package-minus", color: "warning" },
}

export const notificationStyle = (type: string) => {
  const style = NOTIFICATION_STYLE[type] ?? { icon: "i-lucide-bell", color: "neutral" as const }
  return { ...style, textClass: TEXT_CLASS[style.color] }
}
