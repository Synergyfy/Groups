import { ForbiddenException, Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PrismaService } from "../prisma/prisma.service.js";
import { McomService } from "../mcom/mcom.service.js";
import { TokenVault } from "./token-vault.js";

export interface CentralTokenPair {
  accessToken: string | null;
  refreshToken: string | null;
  expiresAt: Date | null;
}

/** Refresh a little before the token actually dies. */
const EXPIRY_MARGIN_MS = 60_000;

/**
 * Keeps the Central Hub SSO credentials of a signed-in user.
 *
 * Central Hub owns identity, so the SSO access token it issues during the
 * code exchange is the credential that unlocks Central Hub chat. The token
 * lives on the server, encrypted at rest, and is renewed with the SSO
 * refresh token before it expires. It never reaches the browser.
 */
@Injectable()
export class CentralSessionService {
  private readonly logger = new Logger(CentralSessionService.name);
  private readonly vault: TokenVault;

  constructor(
    private readonly prisma: PrismaService,
    private readonly mcom: McomService,
    config: ConfigService,
  ) {
    this.vault = new TokenVault(
      config.get<string>("MCOM_TOKEN_ENCRYPTION_KEY") ??
        config.getOrThrow<string>("AUTH_JWT_SECRET"),
    );
  }

  /** Stores the token pair issued by the SSO code exchange. */
  async storeTokens(
    userId: string,
    tokens: {
      accessToken?: string | null;
      refreshToken?: string | null;
      expiresIn?: number | null;
    },
  ): Promise<void> {
    const accessToken = tokens.accessToken?.trim() || null;
    const refreshToken = tokens.refreshToken?.trim() || null;

    if (!accessToken && !refreshToken) {
      return;
    }

    const ttlSeconds =
      Number(tokens.expiresIn ?? 0) > 0 ? Number(tokens.expiresIn) : 3600;

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        ...(accessToken
          ? { mcomAccessToken: this.vault.encrypt(accessToken) }
          : {}),
        ...(refreshToken
          ? { mcomRefreshToken: this.vault.encrypt(refreshToken) }
          : {}),
        mcomTokenExpiresAt: accessToken
          ? new Date(Date.now() + ttlSeconds * 1000)
          : undefined,
      },
    });
  }

  /** Reads the stored credentials, decrypting them. */
  async readTokens(userId: string): Promise<CentralTokenPair> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        mcomAccessToken: true,
        mcomRefreshToken: true,
        mcomTokenExpiresAt: true,
      },
    });

    if (!user) {
      return { accessToken: null, refreshToken: null, expiresAt: null };
    }

    return {
      accessToken: this.vault.decrypt(user.mcomAccessToken),
      refreshToken: this.vault.decrypt(user.mcomRefreshToken),
      expiresAt: user.mcomTokenExpiresAt,
    };
  }

  /**
   * A Central Hub SSO access token that is valid right now.
   *
   * Renews it with the refresh token when it is about to expire. Throws when
   * the user has to sign in again.
   */
  async getValidAccessToken(userId: string): Promise<string> {
    const tokens = await this.readTokens(userId);

    if (!tokens.accessToken) {
      throw new ForbiddenException(
        "Sign in to Central Hub again to use messaging.",
      );
    }

    const expiresAt = tokens.expiresAt?.getTime() ?? 0;
    const stillValid = expiresAt - EXPIRY_MARGIN_MS > Date.now();

    if (stillValid) {
      return tokens.accessToken;
    }

    if (!tokens.refreshToken) {
      throw new ForbiddenException(
        "Your Central Hub session has expired. Please sign in again.",
      );
    }

    try {
      const refreshed = await this.mcom.refreshSsoAccessToken(tokens.refreshToken);
      await this.storeTokens(userId, {
        accessToken: refreshed.accessToken,
        refreshToken: tokens.refreshToken,
        expiresIn: refreshed.expiresIn,
      });
      return refreshed.accessToken;
    } catch (error) {
      this.logger.warn(
        `Central Hub token refresh failed for user ${userId}: ${
          error instanceof Error ? error.message : "unknown error"
        }`,
      );
      throw new ForbiddenException(
        "Your Central Hub session has expired. Please sign in again.",
      );
    }
  }

  /** Forgets the stored credentials (used when the user signs out). */
  async clearTokens(userId: string): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        mcomAccessToken: null,
        mcomRefreshToken: null,
        mcomTokenExpiresAt: null,
      },
    });
  }
}
