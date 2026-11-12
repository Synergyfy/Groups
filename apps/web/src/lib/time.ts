export function relativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return iso;
  const diffMs = Date.now() - then;
  const future = diffMs < 0;
  const abs = Math.abs(diffMs);
  const minutes = Math.floor(abs / 60_000);
  const hours = Math.floor(abs / 3_600_000);
  const days = Math.floor(abs / 86_400_000);

  let phrase: string;
  if (minutes < 1) phrase = "just now";
  else if (minutes < 60) phrase = `${minutes} minute${minutes === 1 ? "" : "s"}`;
  else if (hours < 24) phrase = `${hours} hour${hours === 1 ? "" : "s"}`;
  else if (days < 30) phrase = `${days} day${days === 1 ? "" : "s"}`;
  else phrase = iso.slice(0, 10);

  if (phrase === "just now") return phrase;
  if (phrase === iso.slice(0, 10)) return phrase;
  return future ? `in ${phrase}` : `${phrase} ago`;
}

export function withRelativeTime(iso: string): string {
  return `${relativeTime(iso)} · ${iso.slice(0, 10)}`;
}
