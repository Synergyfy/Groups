import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { createHmac } from "node:crypto";

export interface PostcodeChain {
  cityId: string | null;
  city: string | null;
  boroughId: string | null;
  borough: string | null;
  highStreetId: string | null;
  highStreet: string | null;
  localMallId: string | null;
  localMall: string | null;
}

interface LocalMallEnvelope {
  success?: boolean;
  data?: {
    matchType?: string;
    city?: { id?: string; name?: string } | null;
    borough?: { id?: string; name?: string } | null;
    highStreet?: { id?: string; name?: string } | null;
    mall?: { id?: string; name?: string } | null;
  };
  message?: string;
}

/**
 * Resolves a postcode to the Central Hub location chain.
 *
 * Central Hub owns the geography, so Groups never resolves postcodes itself:
 * it asks the data-sharing API for the chain and stores the ids it gets back.
 */
@Injectable()
export class PostcodeLookupService {
  private readonly logger = new Logger(PostcodeLookupService.name);
  private readonly cache = new Map<string, { chain: PostcodeChain | null; at: number }>();

  private static readonly TTL_MS = 24 * 60 * 60 * 1000;

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

  /** The location chain for a postcode, or null when Central Hub has none. */
  async resolve(postcode: string): Promise<PostcodeChain | null> {
    const key = postcode.trim().toUpperCase();
    if (!key) return null;

    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.at < PostcodeLookupService.TTL_MS) {
      return cached.chain;
    }

    if (!this.clientId || !this.hmacSecret) {
      throw new ServiceUnavailableException(
        "Central Hub postcode lookup is not configured",
      );
    }

    const url = `${this.baseUrl}/api/v1/data/local-mall?postcode=${encodeURIComponent(key)}`;
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
      this.logger.warn(`Central Hub postcode lookup failed for ${key}: ${reason}`);
      throw new ServiceUnavailableException(
        "Central Hub postcode lookup is temporarily unavailable",
      );
    }

    const text = await response.text();
    let body: LocalMallEnvelope | null = null;
    try {
      body = text ? (JSON.parse(text) as LocalMallEnvelope) : null;
    } catch {
      // A body that is not JSON means Central Hub did not answer with a
      // payload; the envelope stays empty.
    }

    if (!response.ok || !body?.success) {      this.logger.warn(
        `Central Hub postcode lookup failed for ${key} with ${response.status}`,
      );
      // A postcode Central Hub does not know is not an error: the business
      // simply has no location yet.
      this.cache.set(key, { chain: null, at: Date.now() });
      return null;
    }

    const data = body.data ?? {};
    const chain: PostcodeChain = {
      cityId: data.city?.id ?? null,
      city: data.city?.name ?? null,
      boroughId: data.borough?.id ?? null,
      borough: data.borough?.name ?? null,
      highStreetId: data.highStreet?.id ?? null,
      highStreet: data.highStreet?.name ?? null,
      localMallId: data.mall?.id ?? null,
      localMall: data.mall?.name ?? null,
    };

    this.cache.set(key, { chain, at: Date.now() });
    return chain;
  }
}
