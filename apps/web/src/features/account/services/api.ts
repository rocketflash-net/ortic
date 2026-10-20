/** Own profile: `PATCH /auth/me` (name, WhatsApp number, profession). */

import type { MeResponse } from "@/features/authentication/models/user.model"
import axiosInstance from "@/plugins/axios"
import type { BackendResponse, CustomAxiosRequestConfig } from "@/shared/models/api"

export type ProfilePayload = { name: string; phone: string | null; profession: string | null }

export const updateProfile = async (payload: ProfilePayload): Promise<BackendResponse<MeResponse>> => {
  const configRequest: CustomAxiosRequestConfig<ProfilePayload> = { url: "/auth/me", method: "PATCH", data: payload }
  const { data } = await axiosInstance.request(configRequest)
  return data
}
