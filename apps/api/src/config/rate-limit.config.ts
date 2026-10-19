import { StatusCodes } from "http-status-codes";
import { rateLimit } from "express-rate-limit";
import { envNumber } from "@config/env.config";
import ResponseDto from "@dto/response.dto";
import ResponseCodeEnum from "@enums/response-code.enum";

const tooManyRequestsResponse = () =>
  new ResponseDto().setResponseCode(ResponseCodeEnum.too_many_requests).setResponseMessage("Too many requests, please try again later.").toArray();

const globalLimiter = rateLimit({
  windowMs: envNumber("RATE_LIMIT_WINDOW_MS", 60 * 1000),
  limit: envNumber("RATE_LIMIT_MAX", 6000),
  standardHeaders: "draft-7",
  legacyHeaders: false,
  statusCode: StatusCodes.TOO_MANY_REQUESTS,
  message: tooManyRequestsResponse,
});

// Login OTP email (minta & verifikasi kode) — dibatasi per IP untuk menahan spam email dan tebak kode.
const authEmailLimiter = rateLimit({
  windowMs: envNumber("AUTH_EMAIL_RATE_LIMIT_WINDOW_MS", 10 * 60 * 1000),
  limit: envNumber("AUTH_EMAIL_RATE_LIMIT_MAX", 60),
  standardHeaders: "draft-7",
  legacyHeaders: false,
  statusCode: StatusCodes.TOO_MANY_REQUESTS,
  message: tooManyRequestsResponse,
});

// Panggilan Biteship (area & ongkir, ditagih per panggilan) — dibatasi per IP agar autocomplete tidak boros saldo.
const biteshipLimiter = rateLimit({
  windowMs: envNumber("AREA_SEARCH_RATE_LIMIT_WINDOW_MS", 60 * 1000),
  limit: envNumber("AREA_SEARCH_RATE_LIMIT_MAX", 30),
  standardHeaders: "draft-7",
  legacyHeaders: false,
  statusCode: StatusCodes.TOO_MANY_REQUESTS,
  message: tooManyRequestsResponse,
});

export { globalLimiter, authEmailLimiter, biteshipLimiter };
