export function isOnline(memberId: string): boolean {
  let hash = 0;
  for (let i = 0; i < memberId.length; i += 1) {
    hash = (hash * 31 + memberId.charCodeAt(i)) | 0;
  }
  return Math.abs(hash) % 10 < 6;
}
