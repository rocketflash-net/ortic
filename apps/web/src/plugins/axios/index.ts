import axios from "axios"

import { setupInterceptors } from "./interceptor"

/**
 * API base URL. Falls back to the local API in development so the app also runs without a `.env` file;
 * production builds must set `VITE_API_BASE_URL`.
 */
export const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL || (import.meta.env.DEV ? "http://localhost:3000/api/v1" : "")).replace(/\/+$/, "")

const axiosInstance = axios.create({
  baseURL: apiBaseUrl,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 30 * 10000, // 30 seconds
})

setupInterceptors(axiosInstance)

export default axiosInstance
