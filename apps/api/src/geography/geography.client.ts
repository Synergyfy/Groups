import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { createHmac } from "node:crypto";
import type { GeographySnapshot } from "./geography.types.js";

interface GeographyEnvelope {
  success?: boolean;
  data?: GeographySnapshot;
  message?: string;
}

/**
 * HMAC-signed client for Central Hub's data-sharing API.
 *
 * Central Hub remains the single source of truth for the UK geography
 * hierarchy, so Groups never imports ONS/OSM data or resolves postcodes
 * itself. The request signs an empty body, matching `WalletHmacGuard` and the
 * other GET callers.
 */
@Injectable()
export class GeographyClient {
  private readonly logger = new Logger(GeographyClient.name);

  constructor(private readonly config: ConfigService) {}

  private get baseUrl(): string {
    return this.config
      .get<string>("MCOM_SOLUTIONS_URL", "http://localhost:3010")
      .replace(/\/+$/, "");
  }

  private get clientId(): string {
    return this.config.get<string>("MCOM_CLIENT_ID", "").trim();
  }

  private get hmacSecret(): string {
    return this.config.get<string>("MCOM_HMAC_SECRET", "").trim();
  }

  private sign(): string {
    return (
      "sha256=" +
      createHmac("sha256", this.hmacSecret).update("").digest("hex")
    );
  }

  async fetchSnapshot(): Promise<GeographySnapshot> {
    if (!this.clientId || !this.hmacSecret) {
      throw new ServiceUnavailableException(
        "Central Hub geography is not configured",
      );
    }

    const url = `${this.baseUrl}/api/v1/data/geography`;
    let response: Response;
    try {
      response = await fetch(url, {
        headers: {
          Accept: "application/json",
          "X-Mcom-Client-ID": this.clientId,
          "X-Mcom-Signature": this.sign(),
        },
        signal: AbortSignal.timeout(8000),
      });
    } catch (error) {
      const reason = error instanceof Error ? error.message : "unknown error";
      this.logger.warn(`Central Hub geography request failed: ${reason}`);
      throw new ServiceUnavailableException(
        "Central Hub geography is temporarily unavailable",
      );
    }

    const text = await response.text();
    let body: GeographyEnvelope | null;
    try {
      body = text ? (JSON.parse(text) as GeographyEnvelope) : null;
    } catch {
      body = null;
    }

    if (!response.ok) {
      this.logger.warn(
        `Central Hub geography request failed with ${response.status}: ${
          body?.message ?? "no response body"
        }`,
      );
      throw new ServiceUnavailableException(
        "Central Hub geography is temporarily unavailable",
      );
    }

    const snapshot = body?.data;
    if (
      !snapshot ||
      !Array.isArray(snapshot.cities) ||
      !Array.isArray(snapshot.boroughs) ||
      !Array.isArray(snapshot.highStreets) ||
      !Array.isArray(snapshot.localMalls)
    ) {
      throw new ServiceUnavailableException(
        "Central Hub returned an invalid geography snapshot",
      );
    }

    return snapshot;
  }
}
