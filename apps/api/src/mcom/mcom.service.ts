import {
  Injectable,
  Logger,
  ServiceUnavailableException,
  UnauthorizedException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { McomProfile } from "../auth/auth.types.js";
import {
  McomProfileLookupError,
  type McomServiceEntry,
} from "./mcom.types.js";

interface CachedToken {
  token: string;
  expiresAt: number;
}

@Injectable()
export class McomService {
  private readonly logger = new Logger(McomService.name);
  private readonly tokenCache = new Map<string, CachedToken>();
  private warnedMissingApiKey = false;
  private allowedCallersCache: { callers: string[]; expiresAt: number } | null =
    null;

  constructor(private readonly config: ConfigService) {}

  private get baseUrl(): string {
    return this.config
      .get<string>("MCOM_SOLUTIONS_URL", "http://localhost:3010")
      .replace(/\/+$/, "");
  }

  private get clientId(): string {
    return this.config.getOrThrow<string>("MCOM_CLIENT_ID");
  }

  private get clientSecret(): string {
    return this.config.getOrThrow<string>("MCOM_CLIENT_SECRET");
  }

  private basicAuth(): string {
    return Buffer.from(`${this.clientId}:${this.clientSecret}`).toString(
      "base64",
    );
  }

  private async requestJson<T>(
    path: string,
    init: RequestInit = {},
  ): Promise<T> {
    let response: Response;
    try {
      response = await fetch(`${this.baseUrl}${path}`, {
        ...init,
        signal: AbortSignal.timeout(8000),
      });
    } catch (error) {
      const reason = error instanceof Error ? error.message : "unknown error";
      this.logger.warn(`MCOM request failed for ${path}: ${reason}`);
      throw new ServiceUnavailableException(
        "Central Hub is temporarily unavailable",
      );
    }

    const text = await response.text();
    const data = text ? (JSON.parse(text) as unknown) : null;

    if (!response.ok) {
      throw new UnauthorizedException(
        (data as { message?: string } | null)?.message ??
          `MCOM request failed with ${response.status}`,
      );
    }

    return data as T;
  }

  async getDiscovery(): Promise<Record<string, unknown>> {
    return this.requestJson<Record<string, unknown>>(
      "/api/v1/ecosystem/discovery",
    );
  }

  /**
   * Server-to-server entitlement introspection. Central Hub remains the source
   * of truth; the API key scopes the response to this registered client.
   */
  async getEntitlement(
    userId: string,
  ): Promise<Record<string, unknown> | null> {
    const apiKey = this.config.get<string>("MCOM_API_KEY", "").trim();
    if (!apiKey) {
      if (!this.warnedMissingApiKey) {
        this.warnedMissingApiKey = true;
        this.logger.warn(
          "MCOM_API_KEY is not configured — Central Hub entitlements cannot be revalidated in the background.",
        );
      }
      return null;
    }

    const params = new URLSearchParams({
      client_id: this.clientId,
      user_id: userId,
    });
    const data = await this.requestJson<{
      entitlement?: Record<string, unknown> | null;
      data?: { entitlement?: Record<string, unknown> | null } | null;
    }>(`/api/v1/auth/sso/entitlement?${params.toString()}`, {
      headers: {
        "X-API-Key": apiKey,
        Accept: "application/json",
      },
    });

    return data.entitlement ?? data.data?.entitlement ?? null;
  }

  async getServices(): Promise<McomServiceEntry[]> {
    return this.requestJson<McomServiceEntry[]>(
      "/api/v1/ecosystem/services",
    );
  }

  /**
   * Pull the canonical Central Hub profile for a user through the service mesh.
   * The call goes directly to Central Hub; it never transits this app.
   */
  async getEcosystemProfile(userId: string): Promise<McomProfile> {
    const audience = this.config.get<string>(
      "MCOM_CENTRAL_AUDIENCE",
      "mcom-central",
    );
    const scope = this.config.get<string>(
      "MCOM_CENTRAL_READ_SCOPE",
      "central:read",
    );
    const token = await this.getServiceToken(audience, scope);
    const url = `${this.baseUrl}/api/v1/ecosystem/profiles/${encodeURIComponent(
      userId,
    )}`;

    let response: Response;
    try {
      response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
          "X-Caller-Id": this.clientId,
        },
        signal: AbortSignal.timeout(8000),
      });
    } catch (error) {
      const reason = error instanceof Error ? error.message : "unknown error";
      this.logger.warn(
        `Central Hub profile lookup failed for ${userId}: ${reason}`,
      );
      throw new ServiceUnavailableException(
        "Central Hub profile lookup is temporarily unavailable",
      );
    }

    const text = await response.text();
    const data = text ? (JSON.parse(text) as unknown) : null;

    if (!response.ok) {
      throw new McomProfileLookupError(
        response.status,
        (data as { message?: string } | null)?.message ??
          `Central Hub profile lookup failed with ${response.status}`,
      );
    }

    const profile =
      (data as { user?: McomProfile } | null)?.user ?? (data as McomProfile);
    if (!profile || typeof profile.email !== "string") {
      throw new McomProfileLookupError(
        502,
        "Central Hub returned an invalid profile payload",
      );
    }

    return profile;
  }

  async getServiceToken(
    audience: string,
    scope = "service:read",
  ): Promise<string> {
    const cacheKey = `${audience}:${scope}`;
    const cached = this.tokenCache.get(cacheKey);

    if (cached && cached.expiresAt > Date.now() + 60_000) {
      return cached.token;
    }

    const data = await this.requestJson<{
      access_token?: string;
      expires_in?: number;
      message?: string;
    }>("/api/v1/auth/service-token", {
      method: "POST",
      headers: {
        Authorization: `Basic ${this.basicAuth()}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        grant_type: "client_credentials",
        audience,
        scope,
      }),
    });

    if (!data.access_token) {
      throw new UnauthorizedException(
        data.message ?? "MCOM did not return a service token",
      );
    }

    this.tokenCache.set(cacheKey, {
      token: data.access_token,
      expiresAt: Date.now() + (data.expires_in ?? 300) * 1000,
    });

    return data.access_token;
  }

  async callPeer<T = unknown>(
    peerBaseUrl: string,
    targetAudience: string,
    path: string,
    init: RequestInit = {},
  ): Promise<T> {
    const token = await this.getServiceToken(
      targetAudience,
      this.config.get<string>("MCOM_SERVICE_TOKEN_SCOPE", "service:read"),
    );
    const url = `${peerBaseUrl.replace(/\/+$/, "")}/${path.replace(/^\/+/, "")}`;

    const response = await fetch(url, {
      ...init,
      headers: {
        ...init.headers,
        Authorization: `Bearer ${token}`,
        "X-Origin-App": this.clientId,
      },
      signal: AbortSignal.timeout(8000),
    });
    const text = await response.text();
    const data = text ? (JSON.parse(text) as unknown) : null;

    if (!response.ok) {
      throw new UnauthorizedException(
        (data as { message?: string } | null)?.message ??
          `Peer call failed with ${response.status}`,
      );
    }

    return data as T;
  }

  /**
   * Renews a Central Hub SSO access token with the refresh token that was
   * issued alongside it. The SSO session stays alive on Central Hub, so the
   * user does not have to sign in again.
   */
  async refreshSsoAccessToken(
    refreshToken: string,
  ): Promise<{ accessToken: string; expiresIn: number }> {
    const data = await this.requestJson<{
      accessToken?: string;
      access_token?: string;
      expiresIn?: number;
      expires_in?: number;
      message?: string;
    }>("/api/v1/auth/sso/token/refresh", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });

    const accessToken = data.accessToken ?? data.access_token;
    if (!accessToken) {
      throw new UnauthorizedException(
        data.message ?? "Central Hub did not return a refreshed access token",
      );
    }

    return {
      accessToken,
      expiresIn: Number(data.expiresIn ?? data.expires_in ?? 3600),
    };
  }

  async exchangeUserToken(
    subjectToken: string,
    targetAudience: string,
    scope = "service:read",
  ): Promise<string> {
    const data = await this.requestJson<{
      access_token?: string;
      message?: string;
    }>("/api/v1/auth/service-token/exchange", {
      method: "POST",
      headers: {
        Authorization: `Basic ${this.basicAuth()}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        subject_token: subjectToken,
        audience: targetAudience,
        scope,
      }),
    });

    if (!data.access_token) {
      throw new UnauthorizedException(
        data.message ?? "MCOM did not return a delegated token",
      );
    }

    return data.access_token;
  }

  async getAllowedCallers(): Promise<string[]> {
    const configured = this.config
      .get<string>("MCOM_ALLOWED_CALLERS", "")
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean);

    if (configured.length > 0) {
      return configured;
    }

    if (
      this.allowedCallersCache &&
      this.allowedCallersCache.expiresAt > Date.now()
    ) {
      return this.allowedCallersCache.callers;
    }

    try {
      const services = await this.getServices();
      const myApp = services.find(
        (service) => service.clientId === this.clientId,
      );
      const callers = myApp?.allowedCallers ?? [];

      this.allowedCallersCache = {
        callers,
        expiresAt: Date.now() + 60_000,
      };

      return callers;
    } catch (error) {
      this.logger.warn(
        `Failed to refresh allowed callers from registry: ${
          error instanceof Error ? error.message : "unknown error"
        }`,
      );
      return this.allowedCallersCache?.callers ?? [];
    }
  }
}
