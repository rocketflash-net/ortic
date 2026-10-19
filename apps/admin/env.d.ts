/// <reference types="vite/client" />

declare module "*.css";

interface ImportMetaEnv {
  /** API base URL including the version prefix, e.g. `http://localhost:4000/api/v1` (see .env.example). */
  readonly VITE_API_BASE_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
