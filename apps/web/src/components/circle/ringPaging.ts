import { useCallback, useMemo, useState } from "react";
import { RING_PAGE_SIZE } from "../../domain/constants";

/**
 * A ring only has room for a limited number of nodes before they overlap, so
 * every ring is split into slices of `RING_PAGE_SIZE` members. Whatever does
 * not fit is folded behind a single "+N" node that sits on the ring itself.
 */
export interface RingPager<T> {
  /** Members rendered on the ring for the current slice. */
  visible: T[];
  /** Members folded behind the overflow node right now. */
  hiddenCount: number;
  /** True when at least one member is folded behind the overflow node. */
  hasOverflow: boolean;
  /** True while a slice other than the first one is on display. */
  showingOverflow: boolean;
  /** How many members the first slice holds — the set the overflow node restores. */
  firstSliceSize: number;
  /** Switch to the next slice; wraps back to the first slice. */
  next: () => void;
}

function defaultKeyOf(item: unknown): string {
  if (item && typeof item === "object" && "id" in item) {
    return String((item as { id: unknown }).id);
  }
  return String(item);
}

/**
 * Paginates the members of a single ring.
 *
 * The first slice shows the leading members, the overflow node reports how
 * many are hidden and clicking it swaps the ring over to the next slice —
 * which replaces the visible members with the hidden ones. Clicking it again
 * brings the original members back.
 */
export function useRingPager<T>(
  items: T[],
  options: { pageSize?: number; keyOf?: (item: T) => string } = {},
): RingPager<T> {
  const { pageSize = RING_PAGE_SIZE } = options;
  const keyOf = options.keyOf ?? (defaultKeyOf as (item: T) => string);

  const slices = useMemo(() => {
    if (items.length === 0) return [[] as T[]];
    const chunks: T[][] = [];
    for (let index = 0; index < items.length; index += pageSize) {
      chunks.push(items.slice(index, index + pageSize));
    }
    return chunks;
  }, [items, pageSize]);

  /** Identifies the current member set so a new set restarts at slice one. */
  const signature = useMemo(
    () => slices.map((slice) => slice.map(keyOf).join(",")).join("|"),
    [slices, keyOf]
  );

  const [state, setState] = useState<{ signature: string; index: number }>({
    signature: "",
    index: 0,
  });

  const index =
    state.signature === signature ? state.index % slices.length : 0;
  const visible = slices[index] ?? [];
  const hiddenCount = items.length - visible.length;

  const next = useCallback(() => {
    setState((current) => {
      const currentIndex =
        current.signature === signature ? current.index % slices.length : 0;
      return {
        signature,
        index: (currentIndex + 1) % slices.length,
      };
    });
  }, [signature, slices.length]);

  return {
    visible,
    hiddenCount,
    hasOverflow: hiddenCount > 0,
    showingOverflow: index > 0,
    firstSliceSize: slices[0]?.length ?? 0,
    next,
  };
}
