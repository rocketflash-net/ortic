import { FrontendAppType } from "@enums/frontend-app.enum";
import { UserType } from "@@types/entity.type";

// User yang sedang login, ditempel ke `req.user` oleh middleware authenticate.
type AuthUserType = Pick<UserType, "id" | "email" | "name" | "avatarUrl" | "role">;

type GoogleProfileType = {
  sub: string;
  email: string;
  name: string;
  picture: string | null;
};

// Isi cookie sementara selama proses OAuth (state + PKCE verifier + tujuan setelah login).
type OAuthFlowType = {
  state: string;
  codeVerifier: string;
  redirect: string;
  app: FrontendAppType;
};

// Hasil login / refresh (snake_case karena langsung dikirim ke client).
type TokenPairType = {
  access_token: string;
  refresh_token: string;
  token_type: "Bearer";
  // Umur access token dalam detik.
  expires_in: number;
};

// Hasil verifikasi access token di middleware authenticate.
type AuthenticatedType = {
  user: AuthUserType;
  sessionId: string;
};

export type { AuthUserType, AuthenticatedType, GoogleProfileType, OAuthFlowType, TokenPairType };
