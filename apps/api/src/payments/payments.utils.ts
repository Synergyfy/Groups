/**
 * Convert a legacy GBP decimal amount (e.g. 25.5) into an exact minor-unit
 * string for MCOM Pay. Central Hub only accepts positive integer strings.
 */
export function toMinorUnits(amount: number): bigint {
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error(`Invalid payment amount: ${amount}`);
  }

  const minor = Math.round(amount * 100);
  if (!Number.isSafeInteger(minor) || minor <= 0) {
    throw new Error(`Invalid payment amount: ${amount}`);
  }

  return BigInt(minor);
}

export function minorToPounds(minor: bigint | null | undefined): number {
  if (minor == null) return 0;
  return Number(minor) / 100;
}

export function dayKey(date = new Date()): string {
  return date.toISOString().slice(0, 10);
}

function isoWeekKey(date: Date): string {
  const utc = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
  const day = utc.getUTCDay() || 7;
  utc.setUTCDate(utc.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(utc.getUTCFullYear(), 0, 1));
  const week = Math.ceil(
    ((utc.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7,
  );
  return `${utc.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

/** Billing period key used to stop duplicate contribution charges. */
export function contributionPeriodKey(
  frequency: string | null | undefined,
  date = new Date(),
): string {
  switch ((frequency ?? "once").toLowerCase()) {
    case "daily":
      return date.toISOString().slice(0, 10);
    case "weekly":
      return isoWeekKey(date);
    case "monthly":
      return date.toISOString().slice(0, 7);
    case "once":
    default:
      return "once";
  }
}

export function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
}
