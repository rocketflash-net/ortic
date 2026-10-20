import { randomInt } from "crypto";
import { z } from "zod";
import Service from "@base/service.base";
import { authConfig } from "@config/auth.config";
import UserDto from "@dto/user.dto";
import FrontendAppEnum, { FRONTEND_APPS, FrontendAppType } from "@enums/frontend-app.enum";
import ConflictException from "@exceptions/conflict.exception";
import InvalidLoginCodeException from "@exceptions/invalid-login-code.exception";
import InvalidRefreshTokenException from "@exceptions/invalid-refresh-token.exception";
import TooManyRequestsException from "@exceptions/too-many-requests.exception";
import UnauthorizedException from "@exceptions/unauthorized.exception";
import GoogleOAuthHelper from "@helpers/google-oauth.helper";
import { createMailer } from "@helpers/mail/mailer.factory";
import MailerInterface from "@interfaces/mailer.interface";
import AuthExchangeCodeRepository from "@repositories/auth-exchange-code.repository";
import EmailLoginCodeRepository from "@repositories/email-login-code.repository";
import SessionRepository from "@repositories/session.repository";
import UserRepository from "@repositories/user.repository";
import { AuthenticatedType, AuthUserType, GoogleProfileType, OAuthFlowType, TokenPairType } from "@@types/auth.type";
import { UserType } from "@@types/entity.type";
import { MailMessageType } from "@@types/mail.type";
import ResponseType from "@@types/response.type";
import { UpdateProfileInputType } from "@validators/auth.validator";
import { randomToken, safeEqual, sha256Base64Url, sha256Hex } from "@utils/crypto.util";
import { addDays } from "@utils/date.util";
import { signAccessToken, verifyAccessToken } from "@utils/jwt.util";
import { safeRedirectPath } from "@utils/url.util";

const oauthFlowSchema = z.object({
  state: z.string(),
  codeVerifier: z.string(),
  redirect: z.string(),
  app: z.enum(FRONTEND_APPS).default(FrontendAppEnum.web),
});

const MINUTE_MS = 60 * 1000;

/**
 * Login lewat Google atau kode OTP email (docs/FEATURES.md §3). Register = login pertama.
 * Keduanya bermuara ke user yang sama jika emailnya sama, dan menghasilkan sepasang token:
 * - access token: JWT 15 menit (`Authorization: Bearer`), klaim `sid` dicek ke tabel `sessions` di setiap request;
 * - refresh token: `<sessionId>.<secret>`, dirotasi setiap dipakai; pemakaian ulang token lama mencabut sesi.
 */
export default class AuthService extends Service {
  constructor(
    private readonly userRepository: UserRepository = new UserRepository(),
    private readonly sessionRepository: SessionRepository = new SessionRepository(),
    private readonly emailLoginCodeRepository: EmailLoginCodeRepository = new EmailLoginCodeRepository(),
    private readonly googleOAuth: GoogleOAuthHelper = new GoogleOAuthHelper(),
    private readonly mailer: MailerInterface = createMailer(),
    private readonly exchangeCodeRepository: AuthExchangeCodeRepository = new AuthExchangeCodeRepository()
  ) {
    super();
  }

  // Langkah 1: buat state + PKCE verifier. `flow` disimpan controller di cookie pendek-umur.
  startGoogleLogin(redirect: string | undefined, app: FrontendAppType): { authorizationUrl: string; flow: OAuthFlowType } {
    const flow: OAuthFlowType = { state: randomToken(), codeVerifier: randomToken(48), redirect: safeRedirectPath(redirect), app };
    const authorizationUrl = this.googleOAuth.buildAuthorizationUrl(flow.state, sha256Base64Url(flow.codeVerifier));
    return { authorizationUrl, flow };
  }

  /**
   * Langkah 2: Google redirect balik dengan `code` + `state`. Hasilnya kode tukar sekali pakai (bukan token),
   * karena callback ini dibuka browser lewat redirect dan token tidak boleh lewat URL.
   */
  async completeGoogleLogin(code: string, state: string, flow: OAuthFlowType | null): Promise<string> {
    if (!flow || !safeEqual(state, flow.state)) throw new UnauthorizedException("Invalid OAuth state");

    const idToken = await this.googleOAuth.exchangeCode(code, flow.codeVerifier);
    const profile = await this.googleOAuth.verifyIdToken(idToken);
    const user = await this.upsertGoogleUser(profile);

    const exchangeCode = randomToken();
    const expiresAt = new Date(Date.now() + authConfig.exchangeCodeTtlSeconds * 1000);
    await this.exchangeCodeRepository.store({ codeHash: sha256Hex(exchangeCode), userId: user.id, expiresAt });
    return exchangeCode;
  }

  // Langkah 3: dashboard menukar kode dari callback menjadi token.
  async exchangeGoogleCode(code: string): Promise<TokenPairType> {
    const userId = await this.exchangeCodeRepository.consume(sha256Hex(code), new Date());
    if (!userId) throw new InvalidLoginCodeException();
    return await this.createSession(userId);
  }

  /**
   * Kirim kode OTP 6 digit ke email. Respons selalu sama, baik email sudah terdaftar atau belum,
   * karena user baru dibuat saat kode diverifikasi.
   */
  async requestEmailCode(rawEmail: string): Promise<ResponseType> {
    const email = normalizeEmail(rawEmail);
    const now = new Date();
    const { ttlMinutes, resendCooldownSeconds, maxPerHour } = authConfig.emailCode;

    const latest = await this.emailLoginCodeRepository.findLatest(email);
    const secondsSinceLatest = latest ? Math.floor((now.getTime() - latest.createdAt.getTime()) / 1000) : Infinity;
    if (secondsSinceLatest < resendCooldownSeconds) {
      throw new TooManyRequestsException("Please wait before requesting a new code", { retry_after_seconds: resendCooldownSeconds - secondsSinceLatest });
    }
    if ((await this.emailLoginCodeRepository.countSince(email, new Date(now.getTime() - 60 * MINUTE_MS))) >= maxPerHour) {
      throw new TooManyRequestsException("Too many codes requested for this email, please try again later");
    }

    const code = authConfig.emailCode.devFixedCode || randomInt(0, 1_000_000).toString().padStart(6, "0");
    await this.emailLoginCodeRepository.consumeAllActive(email, now);
    await this.emailLoginCodeRepository.store({ email, codeHash: hashLoginCode(email, code), expiresAt: new Date(now.getTime() + ttlMinutes * MINUTE_MS) });
    await this.mailer.send(loginCodeMessage(email, code, ttlMinutes));

    return this.success({ email, expires_in_seconds: ttlMinutes * 60, resend_after_seconds: resendCooldownSeconds }, "Login code sent");
  }

  async verifyEmailCode(rawEmail: string, code: string): Promise<TokenPairType> {
    const email = normalizeEmail(rawEmail);
    const now = new Date();

    const loginCode = await this.emailLoginCodeRepository.findUsable(email, now, authConfig.emailCode.maxAttempts);
    if (!loginCode) throw new InvalidLoginCodeException();

    if (!safeEqual(hashLoginCode(email, code), loginCode.codeHash)) {
      await this.emailLoginCodeRepository.incrementAttempts(loginCode.id);
      throw new InvalidLoginCodeException();
    }
    if (!(await this.emailLoginCodeRepository.consume(loginCode.id, now))) throw new InvalidLoginCodeException();

    const user = (await this.userRepository.findByEmail(email)) ?? (await this.userRepository.store({ email, name: nameFromEmail(email) }));
    return await this.createSession(user.id);
  }

  /**
   * Tukar refresh token dengan pasangan token baru (rotasi):
   * - token yang berlaku -> rotasi normal;
   * - token sebelumnya, masih dalam grace period -> retry (respons hilang di jaringan / dua refresh bersamaan) -> rotasi lagi;
   * - token sebelumnya di luar grace period -> pemakaian ulang token yang sudah diganti = kemungkinan dicuri -> sesi dicabut;
   * - token lain (karangan) -> ditolak tanpa mencabut sesi, supaya orang yang hanya tahu id sesi tidak bisa me-logout korban;
   * - sesi kedaluwarsa atau menganggur melewati idle timeout -> dicabut.
   */
  async refresh(refreshToken: string): Promise<TokenPairType> {
    const [sessionId, secret] = refreshToken.split(".");
    if (!sessionId || !secret) throw new InvalidRefreshTokenException();
    const presentedHash = sha256Hex(secret);

    // Dua percobaan: jika refresh lain merotasi tepat di antara baca & tulis, baca ulang lalu nilai lagi (jadi kasus grace).
    for (let attempt = 0; attempt < 2; attempt++) {
      const session = await this.sessionRepository.findById(sessionId);
      if (!session) throw new InvalidRefreshTokenException();

      const now = new Date();
      if (session.expiresAt <= now || this.isIdle(session.lastUsedAt, now)) {
        await this.sessionRepository.destroy(session.id);
        throw new InvalidRefreshTokenException();
      }

      const isCurrent = safeEqual(presentedHash, session.refreshTokenHash);
      const isPrevious = session.previousRefreshTokenHash !== null && safeEqual(presentedHash, session.previousRefreshTokenHash);
      if (!isCurrent && !isPrevious) throw new InvalidRefreshTokenException();

      if (isPrevious && !this.isWithinReuseGrace(session.rotatedAt, now)) {
        await this.sessionRepository.destroy(session.id);
        throw new InvalidRefreshTokenException();
      }

      const nextSecret = randomToken();
      if (await this.sessionRepository.rotateRefreshToken(session.id, session.refreshTokenHash, sha256Hex(nextSecret), now)) {
        return await this.issueTokens(session.userId, session.id, nextSecret);
      }
    }
    throw new InvalidRefreshTokenException();
  }

  // Cabut sesi yang dipakai request ini (refresh token & access token-nya langsung tidak berlaku).
  async logout(sessionId: string): Promise<ResponseType> {
    await this.sessionRepository.destroy(sessionId);
    return this.success(null, "Logged out");
  }

  /**
   * User pemilik access token, atau null jika token tidak valid/kedaluwarsa atau sesinya sudah dicabut.
   * Sesi selalu dicek ke database supaya logout & perubahan role berlaku seketika.
   */
  async authenticateAccessToken(accessToken: string): Promise<AuthenticatedType | null> {
    const claims = await verifyAccessToken(accessToken, authConfig.jwt);
    if (!claims) return null;

    const user = await this.sessionRepository.findActiveUser(claims.sid, new Date());
    if (!user || String(user.id) !== claims.sub) return null;
    return { user, sessionId: claims.sid };
  }

  async me(user: AuthUserType): Promise<ResponseType> {
    return this.success(UserDto.me((await this.userRepository.findById(user.id)) ?? user));
  }

  // User login mengubah profilnya sendiri. Dibaca ulang dari database supaya response memuat data terbaru.
  async updateProfile(userId: number, input: UpdateProfileInputType): Promise<ResponseType> {
    await this.userRepository.update(userId, { name: input.name, phone: input.phone, profession: input.profession });
    const user = await this.userRepository.findById(userId);
    if (!user) throw new UnauthorizedException();
    return this.success(UserDto.me(user), "Profile updated");
  }

  // Isi cookie OAuth bisa dimanipulasi user, jadi selalu divalidasi.
  parseOAuthFlow(raw: unknown): OAuthFlowType | null {
    if (typeof raw !== "string") return null;
    try {
      const result = oauthFlowSchema.safeParse(JSON.parse(raw));
      return result.success ? { ...result.data, redirect: safeRedirectPath(result.data.redirect) } : null;
    } catch {
      return null;
    }
  }

  /**
   * Identitas Google = `google_sub`. Login Google pertama dengan email yang sudah terdaftar (lewat OTP atau CLI admin)
   * menghubungkan akun Google ke user tersebut. Foto selalu diperbarui dari Google; nama Google hanya dipakai saat
   * akun dibuat, supaya nama yang diubah user di halaman profil tidak tertimpa setiap login.
   */
  private async upsertGoogleUser(profile: GoogleProfileType): Promise<UserType> {
    const email = normalizeEmail(profile.email);
    const profileData = { avatarUrl: profile.picture };

    const existing = await this.userRepository.findByGoogleSub(profile.sub);
    if (existing) {
      // Email Google bisa berubah; ikut diperbarui hanya jika belum dipakai user lain.
      const owner = email === existing.email ? existing : await this.userRepository.findByEmail(email);
      const changes = owner && owner.id !== existing.id ? profileData : { ...profileData, email };
      await this.userRepository.update(existing.id, changes);
      return { ...existing, ...changes };
    }

    const byEmail = await this.userRepository.findByEmail(email);
    if (byEmail) {
      // Email ini sudah milik akun Google lain (email lama yang berpindah tangan): jangan diambil alih diam-diam.
      if (byEmail.googleSub) throw new ConflictException("Email is already linked to another Google account");
      const changes = { googleSub: profile.sub, ...profileData };
      await this.userRepository.update(byEmail.id, changes);
      return { ...byEmail, ...changes };
    }

    return await this.userRepository.store({ googleSub: profile.sub, email, name: profile.name, ...profileData });
  }

  // Login baru = sesi (perangkat) baru. Melebihi batas perangkat -> sesi yang paling lama tidak dipakai dikeluarkan.
  private async createSession(userId: number): Promise<TokenPairType> {
    const sessionId = randomToken(24);
    const secret = randomToken();
    const now = new Date();
    await this.sessionRepository.store({
      id: sessionId,
      userId,
      refreshTokenHash: sha256Hex(secret),
      lastUsedAt: now,
      expiresAt: addDays(now, authConfig.sessionTtlDays),
    });
    await this.sessionRepository.keepMostRecent(userId, authConfig.maxSessionsPerUser);
    return await this.issueTokens(userId, sessionId, secret);
  }

  private isIdle(lastUsedAt: Date, now: Date): boolean {
    return lastUsedAt <= addDays(now, -authConfig.refreshToken.idleDays);
  }

  private isWithinReuseGrace(rotatedAt: Date | null, now: Date): boolean {
    return rotatedAt !== null && now.getTime() - rotatedAt.getTime() <= authConfig.refreshToken.reuseGraceSeconds * 1000;
  }

  private async issueTokens(userId: number, sessionId: string, refreshSecret: string): Promise<TokenPairType> {
    const { accessTokenTtlSeconds } = authConfig.jwt;
    return {
      access_token: await signAccessToken({ sub: String(userId), sid: sessionId }, accessTokenTtlSeconds, authConfig.jwt),
      refresh_token: `${sessionId}.${refreshSecret}`,
      token_type: "Bearer",
      expires_in: accessTokenTtlSeconds,
    };
  }
}

const normalizeEmail = (email: string): string => email.trim().toLowerCase();

// Email ikut di-hash supaya kode yang sama untuk email berbeda menghasilkan hash berbeda.
const hashLoginCode = (email: string, code: string): string => sha256Hex(`${email}:${code}`);

// Nama awal user OTP (belum ada sumber nama); bisa diganti dari Google saat akun dihubungkan.
const nameFromEmail = (email: string): string => email.split("@")[0].slice(0, 150);

const loginCodeMessage = (to: string, code: string, ttlMinutes: number): MailMessageType => ({
  to,
  subject: `${code} adalah kode masuk Anda`,
  text: `Kode masuk Anda: ${code}\n\nKode berlaku ${ttlMinutes} menit dan hanya bisa dipakai sekali. Jangan berikan kode ini kepada siapa pun.\nAbaikan email ini jika Anda tidak mencoba masuk.`,
  html: `<p>Kode masuk Anda:</p><p style="font-size:28px;font-weight:bold;letter-spacing:6px">${code}</p><p>Kode berlaku ${ttlMinutes} menit dan hanya bisa dipakai sekali. Jangan berikan kode ini kepada siapa pun.</p><p>Abaikan email ini jika Anda tidak mencoba masuk.</p>`,
});
