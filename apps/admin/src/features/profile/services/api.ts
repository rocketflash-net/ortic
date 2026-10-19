/**
 * Profile API client for the signed-in user.
 *
 * @remarks
 * Backed by `PATCH /auth/me`; reading the profile stays with `GET /auth/me` in the authentication feature.
 */

import type { MeResponse } from "@/features/authentication/models/user.model"
import axiosInstance from "@/plugins/axios"
import type { BackendResponse, CustomAxiosRequestConfig } from "@/shared/models/api"

import type { UpdateProfileRequest } from "../models"

/** Saves the user's display name and returns the updated user with their access profile. */
export const updateProfile = async (payload: UpdateProfileRequest): Promise<BackendResponse<MeResponse>> => {
  const configRequest: CustomAxiosRequestConfig<UpdateProfileRequest> = {
    url: "/auth/me",
    method: "PATCH",
    data: payload,
  }
  const { data } = await axiosInstance.request(configRequest)
  return data
}
