import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

export interface MailMessage {
  /** Recipient address. */
  to: string;
  subject: string;
  /** Rendered HTML body. */
  html: string;
  /** Plain-text alternative — always send one for deliverability. */
  text?: string;
  replyTo?: string;
  /** Resend tags, used to group transactional mail in the Resend dashboard. */
  tags?: Array<{ name: string; value: string }>;
}

export interface MailResult {
  /** True when Resend accepted the message. */
  sent: boolean;
  /** Resend message id, when the send succeeded. */
  id?: string;
  /** Why the message was not sent. */
  reason?: string;
}

const RESEND_ENDPOINT = "https://api.resend.com/emails";

/**
 * Transactional email delivery through Resend.
 *
 * Sending is best-effort: a mail failure never breaks the business flow that
 * triggered it. The caller gets a result it can show or log.
 */
@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  constructor(private readonly config: ConfigService) {}

  /** True when a Resend API key is configured. */
  get enabled(): boolean {
    return Boolean(this.apiKey);
  }

  /** The address transactional mail is sent from. */
  get from(): string {
    return (
      this.config.get<string>("RESEND_FROM")?.trim() ||
      this.config.get<string>("SMTP_FROM")?.trim() ||
      "Central Hub Solution <no-reply@centralhubsolution.com>"
    );
  }

  async send(message: MailMessage): Promise<MailResult> {
    const apiKey = this.apiKey;
    if (!apiKey) {
      this.logger.warn(
        `RESEND_API_KEY is not configured — "${message.subject}" was not sent to ${message.to}.`,
      );
      return { sent: false, reason: "not-configured" };
    }

    try {
      const response = await fetch(RESEND_ENDPOINT, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: this.from,
          to: [message.to],
          subject: message.subject,
          html: message.html,
          ...(message.text ? { text: message.text } : {}),
          ...(message.replyTo ? { reply_to: message.replyTo } : {}),
          ...(message.tags ? { tags: message.tags } : {}),
        }),
        signal: AbortSignal.timeout(10_000),
      });

      const body = (await response.json().catch(() => null)) as {
        id?: string;
        message?: string;
      } | null;

      if (!response.ok) {
        const reason = body?.message ?? `Resend responded with ${response.status}`;
        this.logger.error(
          `Failed to send "${message.subject}" to ${message.to}: ${reason}`,
        );
        return { sent: false, reason };
      }

      this.logger.log(
        `Sent "${message.subject}" to ${message.to}${body?.id ? ` (${body.id})` : ""}.`,
      );
      return { sent: true, id: body?.id };
    } catch (error) {
      const reason =
        error instanceof Error ? error.message : "unknown error";
      this.logger.error(
        `Failed to send "${message.subject}" to ${message.to}: ${reason}`,
      );
      return { sent: false, reason };
    }
  }

  private get apiKey(): string {
    return this.config.get<string>("RESEND_API_KEY")?.trim() ?? "";
  }
}
