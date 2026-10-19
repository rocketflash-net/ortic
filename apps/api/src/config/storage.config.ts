import { env, envBoolean, envNumber } from "@config/env.config";

// Object storage S3-compatible (Cloudflare R2 di production, MinIO saat lokal).
const storageConfig = {
  // "s3" (R2 / MinIO) atau "local" (file disimpan di disk & disajikan API di /storage; hanya development, tanpa Docker).
  driver: env("STORAGE_DRIVER", "s3"),
  // Folder file untuk driver local, relatif terhadap apps/api. Sengaja di luar apps/api: di Windows, `node --watch`
  // ikut me-restart API saat ada file baru di dalam apps/api, sehingga request berikutnya gagal.
  localDir: env("STORAGE_LOCAL_DIR", "../../storage"),
  endpoint: env("STORAGE_ENDPOINT", "http://localhost:9000"),
  region: env("STORAGE_REGION", "auto"),
  bucket: env("STORAGE_BUCKET", "ortic"),
  accessKeyId: env("STORAGE_ACCESS_KEY_ID", "minioadmin"),
  secretAccessKey: env("STORAGE_SECRET_ACCESS_KEY", "minioadmin"),
  // MinIO butuh path-style URL (http://host/bucket/key).
  forcePathStyle: envBoolean("STORAGE_FORCE_PATH_STYLE", true),
  // Base URL publik file (CDN), contoh: https://cdn.domain.com
  publicUrl: env("STORAGE_PUBLIC_URL", "http://localhost:9000/ortic"),
  presignExpiresSeconds: envNumber("STORAGE_PRESIGN_EXPIRES_SECONDS", 300),
};

export { storageConfig };
