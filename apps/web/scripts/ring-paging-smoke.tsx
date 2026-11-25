/**
 * Ring paging smoke test.
 *
 * The circle canvases fold the members of a busy ring behind a "+N" node.
 * Clicking that node swaps the ring over to the hidden members and clicking it
 * again brings the original members back. This script renders the shared
 * `useRingPager` hook in jsdom and asserts that behaviour.
 *
 * Run with:
 *
 *   pnpm --filter @247gbs/web exec tsx --tsconfig tsconfig.app.json scripts/ring-paging-smoke.tsx
 */

import { JSDOM } from "jsdom";
import { act, createElement } from "react";
import { createRoot } from "react-dom/client";
import RingPagingHarness from "./ring-paging-harness";
import { RING_PAGE_SIZE } from "../src/domain/constants";

const dom = new JSDOM('<!doctype html><html><body></body></html>', {
  url: "http://localhost/",
});

const globals = globalThis as unknown as Record<string, unknown>;
globals.window = dom.window;
globals.document = dom.window.document;
globals.HTMLElement = dom.window.HTMLElement;
globals.Node = dom.window.Node;
globals.Event = dom.window.Event;
globals.MouseEvent = dom.window.MouseEvent;
globals.IS_REACT_ACT_ENVIRONMENT = true;

let passed = 0;
let failed = 0;

function check(label: string, condition: boolean, detail?: string): void {
  if (condition) {
    passed += 1;
    console.log(`PASS  ${label}`);
  } else {
    failed += 1;
    console.log(`FAIL  ${label}${detail ? ` — ${detail}` : ""}`);
  }
}

function render(count: number) {
  const container = dom.window.document.createElement("div");
  dom.window.document.body.appendChild(container);
  const root = createRoot(container);
  act(() => {
    root.render(createElement(RingPagingHarness, { count }));
  });

  const read = (testId: string) =>
    container.querySelector(`[data-testid="${testId}"]`)?.textContent ?? "";

  const clickChip = () => {
    const chip = container.querySelector('[data-testid="chip"]') as HTMLElement;
    act(() => {
      chip.dispatchEvent(new dom.window.MouseEvent("click", { bubbles: true }));
    });
  };

  return { read, clickChip };
}

function main() {
  const { read, clickChip } = render(15);

  check(
    "a ring with 15 members shows the first 10",
    read("visible").split(",").length === RING_PAGE_SIZE,
    read("visible"),
  );
  check("the overflow node reports the 5 hidden members", read("hidden") === "5", read("hidden"));
  check("the overflow node starts collapsed", read("expanded") === "no", read("expanded"));
  check("the first slice holds 10 members", read("first") === "10", read("first"));

  clickChip();

  check(
    "clicking the overflow node swaps in the 5 hidden members",
    read("visible").split(",").length === 5,
    read("visible"),
  );
  check(
    "the swapped members are the ones that were hidden",
    read("visible") === "member-11,member-12,member-13,member-14,member-15",
    read("visible"),
  );
  check("the overflow node now reports the 10 hidden members", read("hidden") === "10", read("hidden"));
  check("the overflow node is marked as expanded", read("expanded") === "yes", read("expanded"));

  clickChip();

  check(
    "clicking the overflow node again brings the original members back",
    read("visible").split(",").length === RING_PAGE_SIZE,
    read("visible"),
  );
  check(
    "the original members are the first ones of the ring",
    read("visible").startsWith("member-1,member-2"),
    read("visible"),
  );
  check("the overflow node reports 5 hidden members again", read("hidden") === "5", read("hidden"));

  const small = render(4);
  check("a ring that fits shows every member", small.read("visible").split(",").length === 4);
  check("a ring that fits has no hidden members", small.read("hidden") === "0");
  check("a ring that fits has no overflow node", small.read("expanded") === "no");

  console.log(`\n${passed} passed, ${failed} failed`);
  if (failed > 0) process.exitCode = 1;
}

main();
