import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "node:crypto";

/**
 * Envelope format: `v1.<iv>.<authTag>.<ciphertext>` — all base64url.
 *
 * The Central Hub SSO access and refresh tokens are bearer credentials that
 * can mint chat sessions for the signed-in user, so they are encrypted before
 * they touch the database. The key is derived from a server-side secret that
 * never leaves the process.
 */
const VERSION = "v1";
const ALGORITHM = "aes-256-gcm";
const IV_BYTES = 12;
const KEY_BYTES = 32;

export class TokenVault {
  private readonly key: Buffer;

  constructor(secret: string) {
    if (!secret || secret.trim().length < 16) {
      throw new Error(
        "A secret of at least 16 characters is required to protect stored tokens.",
      );
    }
    this.key = scryptSync(secret.trim(), "chs-central-token-vault", KEY_BYTES);
  }

  /** Encrypts a token for storage. Returns null for an empty input. */
  encrypt(plaintext: string | null | undefined): string | null {
    if (!plaintext) return null;

    const iv = randomBytes(IV_BYTES);
    const cipher = createCipheriv(ALGORITHM, this.key, iv);
    const ciphertext = Buffer.concat([
      cipher.update(plaintext, "utf8"),
      cipher.final(),
    ]);
    const authTag = cipher.getAuthTag();

    return [
      VERSION,
      iv.toString("base64url"),
      authTag.toString("base64url"),
      ciphertext.toString("base64url"),
    ].join(".");
  }

  /**
   * Decrypts a stored token. Returns null when the value is missing or was
   * written with a different key — a token that cannot be read is treated as
   * absent rather than crashing the request.
   */
  decrypt(payload: string | null | undefined): string | null {
    if (!payload) return null;

    const parts = payload.split(".");
    if (parts.length !== 4 || parts[0] !== VERSION) return null;

    try {
      const iv = Buffer.from(parts[1], "base64url");
      const authTag = Buffer.from(parts[2], "base64url");
      const ciphertext = Buffer.from(parts[3], "base64url");
      const decipher = createDecipheriv(ALGORITHM, this.key, iv);
      decipher.setAuthTag(authTag);
      return Buffer.concat([
        decipher.update(ciphertext),
        decipher.final(),
      ]).toString("utf8");
    } catch {
      return null;
    }
  }
}
