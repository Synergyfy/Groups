import type { CSSProperties } from "react";

const GRADIENTS: [string, string][] = [
  ["#f2c15c", "#b45309"],
  ["#a78bfa", "#4c1d95"],
  ["#34d399", "#065f46"],
  ["#60a5fa", "#1e3a8a"],
  ["#fb7185", "#881337"],
  ["#22d3ee", "#155e75"],
  ["#fbbf24", "#7c2d12"],
  ["#c084fc", "#581c87"],
];

function hash(value: string): number {
  let total = 0;
  for (let i = 0; i < value.length; i += 1) {
    total = (total * 31 + value.charCodeAt(i)) % 100000;
  }
  return total;
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export function avatarStyle(name: string): CSSProperties {
  const [from, to] = GRADIENTS[hash(name) % GRADIENTS.length];
  return { backgroundImage: `linear-gradient(135deg, ${from}, ${to})`, color: "#ffffff" };
}

const AVATAR_IMAGES: Record<string, string> = {
  "self-000": "/avatars/biz-smith.svg",
  "biz-smith": "/avatars/biz-smith.svg",
  "c-003": "/avatars/c-003.svg",
  "c-017": "/avatars/c-017.svg",
  "c-005": "/avatars/c-005.svg",
  "biz-city-foods": "/avatars/biz-city-foods.svg",
};

export function avatarImage(id?: string): string | undefined {
  if (!id) return undefined;
  return AVATAR_IMAGES[id];
}
