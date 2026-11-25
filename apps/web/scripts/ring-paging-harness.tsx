import { createElement } from "react";
import { useRingPager } from "../src/components/circle/ringPaging";

export interface RingMember {
  id: string;
}

/**
 * Minimal ring canvas used by the ring paging smoke test. It mirrors what the
 * circle canvases do: the members of the ring, the overflow node and the
 * number of members that are currently hidden.
 */
export default function RingPagingHarness({ count }: { count: number }) {
  const pager = useRingPager<RingMember>(
    Array.from({ length: count }, (_, index) => ({ id: `member-${index + 1}` })),
  );
  return createElement(
    "div",
    null,
    createElement(
      "button",
      { type: "button", "data-testid": "chip", onClick: pager.next },
      `+${pager.hiddenCount}`,
    ),
    createElement(
      "span",
      { "data-testid": "visible" },
      pager.visible.map((member) => member.id).join(","),
    ),
    createElement("span", { "data-testid": "hidden" }, String(pager.hiddenCount)),
    createElement(
      "span",
      { "data-testid": "expanded" },
      pager.showingOverflow ? "yes" : "no",
    ),
    createElement("span", { "data-testid": "first" }, String(pager.firstSliceSize)),
  );
}
