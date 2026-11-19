/** Convert a GBP amount (e.g. 25.5) to integer pence (2550). */
export function toMinorPence(amount: number | null | undefined): number {
  if (amount == null || !Number.isFinite(amount) || amount <= 0) return 0;
  return Math.round(amount * 100);
}

/** Convert integer pence back to a decimal GBP amount for display/API output. */
export function fromMinorPence(minor: number | null | undefined): number {
  if (minor == null) return 0;
  return Number(minor) / 100;
}
