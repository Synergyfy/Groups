import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { McomService } from "../mcom/mcom.service.js";

const MEDIA_PATH = "/business/media";

export interface CentralHubMedia {
  /** The bytes of the media file. */
  body: Buffer;
  contentType: string;
}

/**
 * Central Hub serves member logos from a private media area, so the browser
 * cannot load them directly: the request needs the owner's Central Hub
 * credential and the response is marked as an attachment.
 *
 * This service proxies the bytes through the API so the app can show the
 * logo. Only Central Hub's own uploads are proxied, so the endpoint can
 * never be used to reach an arbitrary host.
 */
@Injectable()
export class BusinessMediaService {
  private readonly logger = new Logger(BusinessMediaService.name);

  constructor(
    private readonly config: ConfigService,
    private readonly mcom: McomService,
  ) {}

  private get centralHubOrigin(): string {
    const configured = this.config
      .get<string>("MCOM_SOLUTIONS_URL", "http://localhost:3010")
      .replace(/\/+$/, "");
    try {
      return new URL(configured).origin;
    } catch {
      return configured;
    }
  }

  /**
   * The media path inside Central Hub's uploads area, or null when the URL is
   * not Central Hub media.
   */
  private uploadPath(url: string): string | null {
    let parsed: URL;
    try {
      parsed = new URL(url);
    } catch {
      return null;
    }
    if (parsed.origin !== this.centralHubOrigin) return null;
    if (!parsed.pathname.startsWith("/uploads/")) return null;
    const relative = parsed.pathname.slice("/uploads/".length);
    return relative && !relative.includes("..") ? relative : null;
  }

  /**
   * The URL a client should load. Central Hub uploads are routed through this
   * app's proxy; anything else (a logo hosted on the business's own site) is
   * used as-is.
   */
  publicUrl(url: string | null | undefined): string | null {
    const trimmed = url?.trim();
    if (!trimmed) return null;
    if (!this.uploadPath(trimmed)) return trimmed;
    return `${MEDIA_PATH}?url=${encodeURIComponent(trimmed)}`;
  }

  async fetch(url: string): Promise<CentralHubMedia> {
    const relative = this.uploadPath(url);
    if (!relative) {
      throw new BadRequestException(
        "Only Central Hub media can be loaded through this endpoint.",
      );
    }

    // Central Hub's mesh media endpoint: the same service token the app
    // already mints for `central:read`, scoped to registered ecosystem apps.
    const target = `${this.centralHubOrigin}/api/v1/ecosystem/media/${relative}`;

    let response: Response;
    try {
      response = await fetch(target, {
        headers: {
          Accept: "image/*",
          Authorization: `Bearer ${await this.serviceToken()}`,
        },
        signal: AbortSignal.timeout(8000),
      });
    } catch (error) {
      const reason = error instanceof Error ? error.message : "unknown error";
      this.logger.warn(`Central Hub media request failed: ${reason}`);
      throw new ServiceUnavailableException(
        "Central Hub media is temporarily unavailable",
      );
    }

    if (response.status === 404) {
      throw new NotFoundException("The requested media does not exist.");
    }
    if (!response.ok) {
      this.logger.warn(
        `Central Hub media request failed with ${response.status}`,
      );
      throw new NotFoundException("The requested media is not available.");
    }

    const body = Buffer.from(await response.arrayBuffer());
    const contentType =
      response.headers.get("content-type")?.split(";")[0]?.trim() ||
      contentTypeFor(relative);

    return { body, contentType };
  }

  private async serviceToken(): Promise<string> {
    return this.mcom.getServiceToken(
      this.config.get<string>("MCOM_CENTRAL_AUDIENCE", "mcom-central"),
      this.config.get<string>("MCOM_CENTRAL_READ_SCOPE", "central:read"),
    );
  }
}

/** A conservative content type for Central Hub uploads. */
export function contentTypeFor(url: string): string {
  const path = url.split("?")[0].toLowerCase();
  if (path.endsWith(".png")) return "image/png";
  if (path.endsWith(".jpg") || path.endsWith(".jpeg")) return "image/jpeg";
  if (path.endsWith(".gif")) return "image/gif";
  if (path.endsWith(".webp")) return "image/webp";
  if (path.endsWith(".svg")) return "image/svg+xml";
  return "application/octet-stream";
}
