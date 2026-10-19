import { IncomingHttpHeaders } from "http";
import { jwtVerify, SignJWT } from "jose";
import { batpayConfig, batpayPublicKey } from "@config/batpay.config";
import UnauthorizedException from "@exceptions/unauthorized.exception";
import { accessTokenStringToSign, isFreshTimestamp, verifyRsaSha256 } from "@helpers/batpay/batpay-snap";
import { headerValue } from "@utils/request.util";

const TOKEN_ISSUER = "ortic-api";
const TOKEN_AUDIENCE = "batpay-callback";

const tokenSecret = (): Uint8Array => {
  if (!batpayConfig.callbackTokenSecret) throw new Error("BATPAY_CALLBACK_TOKEN_SECRET must be set to receive BatPay notifications");
  return new TextEncoder().encode(batpayConfig.callbackTokenSecret);
};

/**
 * Sebelum mengirim notifikasi, BatPay meminta access token ke endpoint kita (SNAP B2B), ditandatangani
 * RSA dengan private key BatPay. Token yang kita terbitkan lalu dipakai BatPay di header Authorization notifikasi.
 */
export default class BatpayCallbackAuthHelper {
  async issueAccessToken(headers: IncomingHttpHeaders): Promise<{ accessToken: string; expiresIn: number }> {
    const clientKey = headerValue(headers, "X-CLIENT-KEY");
    const timestamp = headerValue(headers, "X-TIMESTAMP");
    const signature = headerValue(headers, "X-SIGNATURE");

    if (!clientKey || !timestamp || !signature) throw new UnauthorizedException("Unauthorized. Missing signature headers");
    if (clientKey !== batpayConfig.clientKey) throw new UnauthorizedException("Unauthorized. Unknown Client");
    if (!isFreshTimestamp(timestamp, batpayConfig.maxTimestampSkewSeconds)) throw new UnauthorizedException("Unauthorized. Invalid Timestamp");
    if (!verifyRsaSha256(accessTokenStringToSign(clientKey, timestamp), signature, batpayPublicKey())) {
      throw new UnauthorizedException("Unauthorized. Invalid Signature");
    }

    const expiresIn = batpayConfig.callbackTokenTtlSeconds;
    const accessToken = await new SignJWT({ clientKey })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuer(TOKEN_ISSUER)
      .setAudience(TOKEN_AUDIENCE)
      .setIssuedAt()
      .setExpirationTime(`${expiresIn}s`)
      .sign(tokenSecret());
    return { accessToken, expiresIn };
  }

  async verifyAccessToken(accessToken: string): Promise<void> {
    const secret = tokenSecret();
    try {
      await jwtVerify(accessToken, secret, { issuer: TOKEN_ISSUER, audience: TOKEN_AUDIENCE, algorithms: ["HS256"] });
    } catch {
      throw new UnauthorizedException("Unauthorized. Invalid Access Token");
    }
  }
}
