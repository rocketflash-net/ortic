import { writeFile } from "fs/promises";
import express, { Request, Response, Router } from "express";
import { StatusCodes } from "http-status-codes";
import ResponseDto from "@dto/response.dto";
import ResponseCodeEnum from "@enums/response-code.enum";
import StorageHelper from "@helpers/storage.helper";

const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

const forbidden = (res: Response, message: string): void => {
  res.status(StatusCodes.FORBIDDEN).json(new ResponseDto().setResponseCode(ResponseCodeEnum.forbidden).setResponseMessage(message).toArray());
};

/**
 * Driver storage `local` (development tanpa MinIO/Docker), dipasang di /storage hanya bila STORAGE_DRIVER=local:
 * - PUT /storage/<key>?expires&size&signature : upload dari browser lewat URL hasil presign (StorageHelper.presignUpload).
 * - GET /storage/<key>                        : file publik.
 */
const router = Router();

router.put("/*key", express.raw({ type: () => true, limit: MAX_UPLOAD_BYTES }), async (req: Request, res: Response) => {
  const key = (req.params.key as unknown as string[]).join("/");
  const contentType = req.header("content-type") ?? "";
  const size = Number(req.query.size);
  const expires = Number(req.query.expires);
  const signature = String(req.query.signature ?? "");

  if (!StorageHelper.verifyLocalUpload({ key, contentType, size }, expires, signature)) {
    forbidden(res, "Invalid or expired upload URL");
    return;
  }
  const body = req.body as Buffer;
  if (!Buffer.isBuffer(body) || body.length !== size) {
    forbidden(res, "File size does not match the upload URL");
    return;
  }

  const path = StorageHelper.localPath(key);
  await StorageHelper.ensureLocalDir(path);
  await writeFile(path, body);
  res.status(StatusCodes.OK).end();
});

// Gambar dipakai oleh frontend di origin lain (admin/web), jadi izinkan cross-origin (helmet default: same-origin).
router.use((_req, res, next) => {
  res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
  next();
});
router.use(express.static(StorageHelper.localRoot(), { fallthrough: false, maxAge: "1h" }));

export default router;
