enum ResponseCodeEnum {
  success = "00",
  bad_request = "40",
  unauthorized = "41",
  validation_error = "42",
  forbidden = "43",
  not_found = "44",
  conflict = "49",
  too_many_requests = "29",
  general_error = "99",

  // Kode domain: dipakai frontend untuk menampilkan UI khusus (CTA publish, halaman "undangan berakhir", dll).
  event_not_published = "event_not_published",
  addon_not_paid = "addon_not_paid",
  guest_quota_exceeded = "guest_quota_exceeded",
  event_not_ready = "event_not_ready",
  event_expired = "event_expired",
  version_conflict = "version_conflict",
  draft_limit_reached = "draft_limit_reached",
  payment_provider_error = "payment_provider_error",
  shipping_provider_error = "shipping_provider_error",
  invalid_login_code = "invalid_login_code",
  invalid_refresh_token = "invalid_refresh_token",
  last_admin = "last_admin",
}

export default ResponseCodeEnum;
