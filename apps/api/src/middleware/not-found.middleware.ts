import { Request } from "express";
import NotFoundException from "@exceptions/not-found.exception";

// Fallback untuk route yang tidak terdaftar. Didaftarkan setelah semua router.
const notFoundHandler = (req: Request) => {
  throw new NotFoundException(`Route ${req.method} ${req.originalUrl} not found`);
};

export default notFoundHandler;
