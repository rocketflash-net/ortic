import { createRemoteJWKSet, jwtVerify } from "jose";
import Helper from "@base/helper.base";
import { authConfig } from "@config/auth.config";
import UnauthorizedException from "@exceptions/unauthorized.exception";
import { GoogleProfileType } from "@@types/auth.type";

const GOOGLE_AUTHORIZE_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_BASE_URL = "https://oauth2.googleapis.com";
const GOOGLE_ISSUERS = ["https://accounts.google.com", "accounts.google.com"];
// Public key Google untuk verifikasi signature id_token; di-cache otomatis oleh jose.
const GOOGLE_JWKS = createRemoteJWKSet(new URL("https://www.googleapis.com/oauth2/v3/certs"));

type GoogleTokenResponseType = {
  id_token: string;
  access_token: string;
};

/**
 * OAuth 2.0 Authorization Code + PKCE ke Google (docs/FEATURES.md §3).
 * SPA dashboard tidak pernah memegang token Google; backend hanya memakai id_token untuk identitas.
 */
export default class GoogleOAuthHelper extends Helper {
  constructor() {
    super(GOOGLE_TOKEN_BASE_URL);
  }

  buildAuthorizationUrl(state: string, codeChallenge: string): string {
    const params = new URLSearchParams({
      client_id: authConfig.google.clientId,
      redirect_uri: authConfig.google.redirectUri,
      response_type: "code",
      scope: "openid email profile",
      state,
      code_challenge: codeChallenge,
      code_challenge_method: "S256",
      prompt: "select_account",
    });
    return `${GOOGLE_AUTHORIZE_URL}?${params.toString()}`;
  }

  async exchangeCode(code: string, codeVerifier: string): Promise<string> {
    const body = new URLSearchParams({
      code,
      code_verifier: codeVerifier,
      client_id: authConfig.google.clientId,
      client_secret: authConfig.google.clientSecret,
      redirect_uri: authConfig.google.redirectUri,
      grant_type: "authorization_code",
    });
    const { data } = await this.request<GoogleTokenResponseType>("/token", { method: "POST", body, timeoutMs: 15000 });
    return data.id_token;
  }

  // Verifikasi penuh id_token: signature (JWKS), iss, aud, exp, dan email_verified.
  async verifyIdToken(idToken: string): Promise<GoogleProfileType> {
    const { payload } = await jwtVerify(idToken, GOOGLE_JWKS, { issuer: GOOGLE_ISSUERS, audience: authConfig.google.clientId });

    if (payload.email_verified !== true || typeof payload.email !== "string" || !payload.sub) {
      throw new UnauthorizedException("Google account email is not verified");
    }

    return {
      sub: payload.sub,
      email: payload.email,
      name: typeof payload.name === "string" ? payload.name : payload.email,
      picture: typeof payload.picture === "string" ? payload.picture : null,
    };
  }
}
