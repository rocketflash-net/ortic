import { jwtVerify, SignJWT } from "jose";

type AccessTokenClaimsType = {
  // Id user.
  sub: string;
  // Id sesi (tabel sessions); dicek per request supaya token bisa dicabut.
  sid: string;
};

type JwtOptionsType = {
  secret: string;
  issuer: string;
  audience: string;
};

const ALGORITHM = "HS256";

const keyOf = (secret: string): Uint8Array => new TextEncoder().encode(secret);

const signAccessToken = async (claims: AccessTokenClaimsType, ttlSeconds: number, options: JwtOptionsType): Promise<string> =>
  await new SignJWT({ sid: claims.sid })
    .setProtectedHeader({ alg: ALGORITHM, typ: "JWT" })
    .setSubject(claims.sub)
    .setIssuer(options.issuer)
    .setAudience(options.audience)
    .setIssuedAt()
    .setExpirationTime(`${ttlSeconds}s`)
    .sign(keyOf(options.secret));

/**
 * Verifikasi signature, algoritma (hanya HS256), issuer, audience, dan masa berlaku.
 * Mengembalikan null untuk token apa pun yang tidak valid (detail alasannya tidak dibocorkan ke client).
 */
const verifyAccessToken = async (token: string, options: JwtOptionsType): Promise<AccessTokenClaimsType | null> => {
  try {
    const { payload } = await jwtVerify(token, keyOf(options.secret), { algorithms: [ALGORITHM], issuer: options.issuer, audience: options.audience });
    if (typeof payload.sub !== "string" || typeof payload.sid !== "string") return null;
    return { sub: payload.sub, sid: payload.sid };
  } catch {
    return null;
  }
};

export { signAccessToken, verifyAccessToken, type AccessTokenClaimsType, type JwtOptionsType };
