import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { authConfig, oauthCookieOptions } from "@config/auth.config";
import { logger } from "@config/logger.config";
import ResponseDto from "@dto/response.dto";
import ConflictException from "@exceptions/conflict.exception";
import UnauthorizedException from "@exceptions/unauthorized.exception";
import AuthService from "@services/auth.service";
import { getAuthUser } from "@utils/request.util";
import FrontendAppEnum from "@enums/frontend-app.enum";
import { frontendUrl, safeRedirectPath } from "@utils/url.util";
import {
  exchangeCodeSchema,
  googleCallbackQuerySchema,
  googleStartQuerySchema,
  refreshTokenSchema,
  requestEmailCodeSchema,
  updateProfileSchema,
  verifyEmailCodeSchema,
} from "@validators/auth.validator";

const service = new AuthService();

const tokenResponse = (data: object, message: string) => new ResponseDto().setResponseMessage(message).setData(data).toArray();

// GET /auth/google/start?app=web|admin&redirect=/orders -> redirect ke halaman login Google.
const googleStart = (req: Request, res: Response) => {
  const { redirect, app } = googleStartQuerySchema.parse(req.query);
  const { authorizationUrl, flow } = service.startGoogleLogin(redirect, app);

  res.cookie(authConfig.oauthCookieName, JSON.stringify(flow), oauthCookieOptions(authConfig.oauthTtlMinutes * 60 * 1000));
  res.redirect(authorizationUrl);
};

// GET /auth/google/callback -> kembali ke frontend asal (web/admin) /login/callback?code=<kode tukar sekali pakai>&redirect=<path>.
// Selalu redirect (bukan JSON) karena dibuka langsung oleh browser; error ditampilkan di halaman /login frontend asal.
const googleCallback = async (req: Request, res: Response) => {
  const query = googleCallbackQuerySchema.parse(req.query);
  const flow = service.parseOAuthFlow(req.cookies?.[authConfig.oauthCookieName]);
  res.clearCookie(authConfig.oauthCookieName, oauthCookieOptions(0));

  if (query.error || !query.code || !query.state || !flow) {
    res.redirect(frontendUrl(flow?.app ?? FrontendAppEnum.web, `/login?error=${encodeURIComponent(query.error ?? "invalid_request")}`));
    return;
  }

  try {
    const exchangeCode = await service.completeGoogleLogin(query.code, query.state, flow);
    res.redirect(frontendUrl(flow.app, `/login/callback?${new URLSearchParams({ code: exchangeCode, redirect: flow.redirect })}`));
  } catch (error) {
    logger.error({ err: error }, "[auth] Google login failed");
    const errorCode = error instanceof ConflictException ? "account_conflict" : "google_login_failed";
    res.redirect(frontendUrl(flow.app, `/login?error=${errorCode}`));
  }
};

// POST /auth/google/exchange { code } -> token dari kode tukar hasil callback Google.
const exchangeGoogleCode = async (req: Request, res: Response) => {
  const { code } = exchangeCodeSchema.parse(req.body);
  res.status(StatusCodes.OK).json(tokenResponse(await service.exchangeGoogleCode(code), "Logged in"));
};

// POST /auth/email/request { email } -> kirim kode OTP ke email.
const requestEmailCode = async (req: Request, res: Response) => {
  const { email } = requestEmailCodeSchema.parse(req.body);
  const result = await service.requestEmailCode(email);
  res.status(result.status).json(result.data);
};

// POST /auth/email/verify { email, code, redirect? } -> token + path dashboard tujuan.
const verifyEmailCode = async (req: Request, res: Response) => {
  const { email, code, redirect } = verifyEmailCodeSchema.parse(req.body);
  const tokens = await service.verifyEmailCode(email, code);
  res.status(StatusCodes.OK).json(tokenResponse({ ...tokens, redirect: safeRedirectPath(redirect) }, "Logged in"));
};

// POST /auth/refresh { refresh_token } -> pasangan token baru; refresh token lama tidak berlaku lagi.
const refresh = async (req: Request, res: Response) => {
  const { refresh_token: refreshToken } = refreshTokenSchema.parse(req.body);
  res.status(StatusCodes.OK).json(tokenResponse(await service.refresh(refreshToken), "Token refreshed"));
};

// POST /auth/logout (Bearer) -> cabut sesi ini.
const logout = async (req: Request, res: Response) => {
  if (!req.sessionId) throw new UnauthorizedException();
  const result = await service.logout(req.sessionId);
  res.status(result.status).json(result.data);
};

const me = (req: Request, res: Response) => {
  const result = service.me(getAuthUser(req));
  res.status(result.status).json(result.data);
};

// PATCH /auth/me { name } -> profil terbaru (bentuk sama dengan GET /auth/me).
const updateMe = async (req: Request, res: Response) => {
  const { name } = updateProfileSchema.parse(req.body);
  const result = await service.updateProfile(getAuthUser(req).id, name);
  res.status(result.status).json(result.data);
};

export { googleStart, googleCallback, exchangeGoogleCode, requestEmailCode, verifyEmailCode, refresh, logout, me, updateMe };
