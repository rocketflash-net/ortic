import { createHmac } from "crypto";
import { mkdir, rm } from "fs/promises";
import { dirname, resolve, sep } from "path";
import { DeleteObjectsCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { authConfig } from "@config/auth.config";
import { storageConfig } from "@config/storage.config";
import { safeEqual } from "@utils/crypto.util";

type PresignedUploadType = {
  uploadUrl: string;
  publicUrl: string;
  expiresIn: number;
};

type LocalUploadClaimType = {
  key: string;
  contentType: string;
  size: number;
};

const isLocalDriver = (): boolean => storageConfig.driver === "local";

// Folder file driver local (absolut). Key selalu relatif & tanpa "..", dicek di localPath.
const localRoot = (): string => resolve(process.cwd(), storageConfig.localDir);

const localSignature = (claim: LocalUploadClaimType, expires: number): string =>
  createHmac("sha256", authConfig.jwt.secret).update(`${claim.key}\n${claim.contentType}\n${claim.size}\n${expires}`).digest("base64url");

/**
 * Object storage. File diunggah langsung oleh browser lewat presigned URL (PUT), jadi alur frontend sama untuk kedua driver:
 * - `s3`    : R2 / MinIO (production).
 * - `local` : disk lokal, presigned URL menunjuk ke `PUT /storage/<key>` milik API (routes/storage.route.ts). Hanya development.
 */
export default class StorageHelper {
  private readonly client = new S3Client({
    endpoint: storageConfig.endpoint,
    region: storageConfig.region,
    forcePathStyle: storageConfig.forcePathStyle,
    credentials: { accessKeyId: storageConfig.accessKeyId, secretAccessKey: storageConfig.secretAccessKey },
  });

  // Content-Type & Content-Length ikut ditandatangani, jadi browser tidak bisa mengunggah file lain/lebih besar.
  async presignUpload(key: string, contentType: string, size: number): Promise<PresignedUploadType> {
    const expiresIn = storageConfig.presignExpiresSeconds;
    if (isLocalDriver()) {
      const expires = Math.floor(Date.now() / 1000) + expiresIn;
      const query = new URLSearchParams({ expires: String(expires), size: String(size), signature: localSignature({ key, contentType, size }, expires) });
      return { uploadUrl: `${this.publicUrl(key)}?${query.toString()}`, publicUrl: this.publicUrl(key), expiresIn };
    }

    const command = new PutObjectCommand({ Bucket: storageConfig.bucket, Key: key, ContentType: contentType, ContentLength: size });
    const uploadUrl = await getSignedUrl(this.client, command, { expiresIn });
    return { uploadUrl, publicUrl: this.publicUrl(key), expiresIn };
  }

  // Hapus banyak file sekaligus (maks. 1000 per request S3). Gagal sebagian dianggap gagal, supaya pemanggil bisa mencoba lagi.
  async deleteObjects(keys: string[]): Promise<void> {
    if (isLocalDriver()) {
      await Promise.all(keys.map((key) => rm(StorageHelper.localPath(key), { force: true })));
      return;
    }

    for (let start = 0; start < keys.length; start += 1000) {
      const batch = keys.slice(start, start + 1000);
      const result = await this.client.send(
        new DeleteObjectsCommand({ Bucket: storageConfig.bucket, Delete: { Objects: batch.map((Key) => ({ Key })), Quiet: true } })
      );
      if (result.Errors?.length) throw new Error(`Failed to delete ${result.Errors.length} object(s), first: ${result.Errors[0].Key} (${result.Errors[0].Code})`);
    }
  }

  publicUrl(key: string): string {
    return `${storageConfig.publicUrl}/${key}`;
  }

  // Driver local: cek tanda tangan URL upload. Content-Type dari header request harus sama dengan yang ditandatangani.
  static verifyLocalUpload(claim: LocalUploadClaimType, expires: number, signature: string): boolean {
    if (!Number.isInteger(expires) || expires < Math.floor(Date.now() / 1000)) return false;
    return safeEqual(localSignature(claim, expires), signature);
  }

  // Path file driver local; menolak key yang keluar dari folder storage.
  static localPath(key: string): string {
    const root = localRoot();
    const path = resolve(root, key);
    if (!path.startsWith(root + sep)) throw new Error(`Invalid storage key: ${key}`);
    return path;
  }

  static async ensureLocalDir(path: string): Promise<void> {
    await mkdir(dirname(path), { recursive: true });
  }

  static isLocalDriver = isLocalDriver;
  static localRoot = localRoot;
}
