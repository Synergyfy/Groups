/**
 * HTML email templates.
 *
 * Emails are rendered as table based, inline-styled markup so they stay
 * readable in Outlook, Gmail and Apple Mail without external stylesheets.
 * Every template also produces a plain-text alternative.
 */

const INK = "#0a0f1c";
const GOLD = "#e6a92b";
const GOLD_DARK = "#b3821a";
const BODY = "#334155";
const MUTED = "#64748b";
const LINE = "#e2e8f0";
const CANVAS = "#eef1f6";

export interface EmailButton {
  label: string;
  url: string;
}

export interface EmailStep {
  title: string;
  detail: string;
}

export interface EmailFact {
  label: string;
  value: string;
}

export interface EmailLayoutInput {
  /** Hidden preview text shown in the inbox list. */
  preheader: string;
  eyebrow: string;
  headline: string;
  intro: string[];
  button: EmailButton;
  /** Secondary, quieter call to action under the main button. */
  secondary?: { label: string; url: string; secondaryLabel?: string };
  steps?: EmailStep[];
  facts?: EmailFact[];
  /** Small print shown under the facts panel. */
  note?: string;
  /** Closing line above the footer. */
  closing?: string;
  footerNote: string;
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function paragraphs(lines: string[]): string {
  return lines
    .map(
      (line) =>
        `<p style="margin:0 0 14px;font-family:Helvetica,Arial,sans-serif;font-size:15px;line-height:26px;color:${BODY};">${line}</p>`,
    )
    .join("");
}

function button(input: EmailButton): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:4px 0 8px;">
  <tr>
    <td align="center" bgcolor="${GOLD}" style="border-radius:12px;">
      <a href="${escapeHtml(input.url)}" target="_blank" rel="noopener" style="display:inline-block;padding:15px 32px;font-family:Helvetica,Arial,sans-serif;font-size:15px;font-weight:bold;line-height:18px;color:${INK};text-decoration:none;border-radius:12px;">${escapeHtml(input.label)}</a>
    </td>
  </tr>
</table>`;
}

function secondaryButton(input: {
  label: string;
  url: string;
  secondaryLabel?: string;
}): string {
  return `<p style="margin:0 0 4px;font-family:Helvetica,Arial,sans-serif;font-size:13px;line-height:20px;color:${MUTED};text-align:center;">${escapeHtml(input.label)} &middot; <a href="${escapeHtml(input.url)}" target="_blank" rel="noopener" style="color:${GOLD_DARK};font-weight:bold;text-decoration:none;">${escapeHtml(input.secondaryLabel ?? "Sign in instead")}</a></p>`;
}

function steps(items: EmailStep[]): string {
  return items
    .map(
      (step, index) => `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:0 0 14px;">
  <tr>
    <td width="34" valign="top">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr><td width="26" height="26" align="center" bgcolor="${INK}" style="border-radius:13px;font-family:Helvetica,Arial,sans-serif;font-size:12px;font-weight:bold;color:${GOLD};">${index + 1}</td></tr></table>
    </td>
    <td valign="top" style="padding-left:12px;">
      <p style="margin:2px 0 2px;font-family:Helvetica,Arial,sans-serif;font-size:14px;font-weight:bold;line-height:20px;color:${INK};">${escapeHtml(step.title)}</p>
      <p style="margin:0;font-family:Helvetica,Arial,sans-serif;font-size:13px;line-height:20px;color:${MUTED};">${escapeHtml(step.detail)}</p>
    </td>
  </tr>
</table>`,
    )
    .join("");
}

function facts(items: EmailFact[]): string {
  const rows = items
    .map(
      (fact) => `<tr>
  <td style="padding:10px 0;border-bottom:1px solid ${LINE};font-family:Helvetica,Arial,sans-serif;font-size:13px;line-height:18px;color:${MUTED};width:38%;">${escapeHtml(fact.label)}</td>
  <td style="padding:10px 0;border-bottom:1px solid ${LINE};font-family:Helvetica,Arial,sans-serif;font-size:14px;font-weight:bold;line-height:18px;color:${INK};">${escapeHtml(fact.value)}</td>
</tr>`,
    )
    .join("");

  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:8px 0 22px;background:#f8fafc;border:1px solid ${LINE};border-radius:14px;">
  <tr><td style="padding:18px 20px 6px;">
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">${rows}</table>
  </td></tr>
</table>`;
}

/** Wraps a template body in the branded shell. */
export function emailLayout(input: EmailLayoutInput): string {
  const stepsBlock = input.steps?.length ? steps(input.steps) : "";
  const factsBlock = input.facts?.length ? facts(input.facts) : "";
  const noteBlock = input.note
    ? `<p style="margin:0 0 18px;font-family:Helvetica,Arial,sans-serif;font-size:12px;line-height:19px;color:${MUTED};">${escapeHtml(input.note)}</p>`
    : "";
  const secondaryBlock = input.secondary
    ? secondaryButton(input.secondary)
    : "";
  const closingBlock = input.closing
    ? `<p style="margin:22px 0 0;font-family:Helvetica,Arial,sans-serif;font-size:15px;line-height:24px;color:${BODY};">${escapeHtml(input.closing)}</p>`
    : "";

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light">
<title>${escapeHtml(input.headline)}</title>
</head>
<body style="margin:0;padding:0;background:${CANVAS};font-family:Helvetica,Arial,sans-serif;-webkit-font-smoothing:antialiased;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(input.preheader)}</div>
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:${CANVAS};">
  <tr>
    <td align="center" style="padding:34px 14px;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" style="width:100%;max-width:600px;">
        <tr>
          <td style="background:${INK};border-radius:18px 18px 0 0;padding:26px 32px 24px;">
            <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
              <tr>
                <td valign="middle">
                  <p style="margin:0;font-family:Helvetica,Arial,sans-serif;font-size:16px;font-weight:bold;letter-spacing:0.4px;color:#ffffff;">247 GBS</p>
                  <p style="margin:2px 0 0;font-family:Helvetica,Arial,sans-serif;font-size:11px;letter-spacing:1.4px;text-transform:uppercase;color:${GOLD};">Central Hub Solution</p>
                </td>
                <td valign="middle" align="right">
                  <p style="margin:0;font-family:Helvetica,Arial,sans-serif;font-size:11px;letter-spacing:1.2px;text-transform:uppercase;color:#7c8aa3;">Groups &amp; Circles</p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="background:#ffffff;border-radius:0 0 18px 18px;padding:34px 32px 30px;border-top:3px solid ${GOLD};">
            <p style="margin:0 0 10px;font-family:Helvetica,Arial,sans-serif;font-size:11px;font-weight:bold;letter-spacing:1.6px;text-transform:uppercase;color:${GOLD_DARK};">${escapeHtml(input.eyebrow)}</p>
            <h1 style="margin:0 0 16px;font-family:Helvetica,Arial,sans-serif;font-size:26px;line-height:34px;font-weight:bold;color:${INK};">${escapeHtml(input.headline)}</h1>
            ${paragraphs(input.intro)}
            ${button(input.button)}
            ${secondaryBlock}
            ${stepsBlock}
            ${factsBlock}
            ${noteBlock}
            ${closingBlock}
          </td>
        </tr>
        <tr>
          <td style="padding:22px 32px 0;">
            <p style="margin:0 0 6px;font-family:Helvetica,Arial,sans-serif;font-size:12px;line-height:19px;color:${MUTED};">${escapeHtml(input.footerNote)}</p>
            <p style="margin:0;font-family:Helvetica,Arial,sans-serif;font-size:12px;line-height:19px;color:#94a3b8;">Central Hub Solution · 247 GBS · Birmingham, United Kingdom</p>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>
</body>
</html>`;
}

export interface ContactInvitationInput {
  contactName: string;
  businessName: string;
  businessContactName: string;
  businessCity?: string | null;
  listName?: string | null;
  circleNames?: string[];
  signupUrl: string;
  signInUrl: string;
  accountType: "business" | "customer";
}

/**
 * The email a business sends to a contact who has no Central Hub account yet.
 * It explains what the contact is being invited into, how to create the
 * account and that their pending invitations wait for them after signing in.
 */
export function contactInvitationEmail(
  input: ContactInvitationInput,
): { subject: string; html: string; text: string } {
  const firstName = input.contactName.trim().split(/\s+/)[0] || "there";
  const accountLabel =
    input.accountType === "business" ? "business account" : "account";

  const subject = `${input.businessName} invited you to join Groups & Circles`;

  const intro = [
    `Hi ${firstName},`,
    `<strong>${escapeHtml(input.businessName)}</strong> has added you to their network and would like you to join them on Groups & Circles — the workspace where local businesses build groups, run circles and grow together.`,
    `Creating your Central Hub account takes a minute. Once you are signed in, every invitation waiting for you is right there in your inbox.`,
  ];

  const steps: EmailStep[] = [
    {
      title: "Create your Central Hub account",
      detail: `Use ${escapeHtml(input.contactName)}'s details below so the invitation lands on the right account.`,
    },
    {
      title: "Sign in to Groups & Circles",
      detail:
        "Your pending invitations are waiting under Invitations — accept the ones you want to join.",
    },
    {
      title: "Join the circles you belong in",
      detail: `${escapeHtml(input.businessName)} adds you to the right circles automatically, and the profile you fill in at sign-up keeps their records up to date.`,
    },
  ];

  const factList: EmailFact[] = [
    { label: "Your name", value: input.contactName },
    { label: "Invited by", value: input.businessContactName || input.businessName },
    { label: "Business", value: input.businessName },
  ];
  if (input.businessCity) {
    factList.push({ label: "Based in", value: input.businessCity });
  }
  if (input.listName) {
    factList.push({ label: "Network list", value: input.listName });
  }
  if (input.circleNames?.length) {
    factList.push({
      label: "Circles",
      value: input.circleNames.join(", "),
    });
  }

  const html = emailLayout({
    preheader: `Create your Central Hub account to accept the invitation from ${input.businessName}.`,
    eyebrow: "You have been invited",
    headline: `${input.businessName} would like you on board`,
    intro,
    button: {
      label: "Create your Central Hub account",
      url: input.signupUrl,
    },
    secondary: {
      label: "Already have an account?",
      url: input.signInUrl,
      secondaryLabel: "Sign in instead",
    },
    steps,
    facts: factList,
    note: `We only send this because ${input.businessName} has your email address on file and asked us to invite you. Your details stay private to the businesses you work with.`,
    closing: `We hope to see you inside ${input.businessName}'s circles.`,
    footerNote: `You are receiving this ${accountLabel} invitation because you were added to a network list on Groups & Circles.`,
  });

  const text = [
    `Hi ${firstName},`,
    "",
    `${input.businessName} has added you to their network and would like you to join them on Groups & Circles.`,
    "",
    "Create your Central Hub account:",
    input.signupUrl,
    "",
    "Already have an account? Sign in:",
    input.signInUrl,
    "",
    "What happens next:",
    ...steps.map((step, index) => `${index + 1}. ${step.title} — ${step.detail}`),
    "",
    ...factList.map((fact) => `${fact.label}: ${fact.value}`),
    "",
    `We hope to see you inside ${input.businessName}'s circles.`,
    "",
    `You are receiving this ${accountLabel} invitation because you were added to a network list on Groups & Circles.`,
  ].join("\n");

  return { subject, html, text };
}
