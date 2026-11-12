import { useLayoutEffect, useRef, useState } from "react";
import type { ReactNode } from "react";

const EDGE_MARGIN = 8;

interface NodePopoverProps {
  anchor: HTMLElement | null;
  children: ReactNode;
  className?: string;
  width?: number;
  gap?: number;
  active?: boolean;
}

export default function NodePopover({
  anchor,
  children,
  className = "",
  width = 224,
  gap = 10,
  active = false,
}: NodePopoverProps) {
  const popRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null);

  useLayoutEffect(() => {
    const place = () => {
      const el = popRef.current;
      const parent = el?.parentElement;
      if (!el || !parent || !anchor) return;
      const vw = document.documentElement.clientWidth;
      const vh = document.documentElement.clientHeight;
      el.style.width = `${Math.min(width, vw - EDGE_MARGIN * 2)}px`;
      const a = anchor.getBoundingClientRect();
      const p = el.getBoundingClientRect();
      const host = parent.getBoundingClientRect();
      const maxX = Math.max(EDGE_MARGIN, vw - p.width - EDGE_MARGIN);
      const maxY = Math.max(EDGE_MARGIN, vh - p.height - EDGE_MARGIN);

      const leftViewport = Math.min(
        Math.max(EDGE_MARGIN, a.left + a.width / 2 - p.width / 2),
        maxX
      );
      let topViewport = a.bottom + gap;
      if (topViewport + p.height > vh - EDGE_MARGIN) {
        topViewport = a.top - gap - p.height;
      }
      topViewport = Math.min(Math.max(EDGE_MARGIN, topViewport), maxY);

      setPos({ left: leftViewport - host.left, top: topViewport - host.top });
    };

    place();
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    const timer = active ? window.setInterval(place, 250) : null;
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
      if (timer !== null) window.clearInterval(timer);
    };
  }, [anchor, gap, active, width]);

  return (
    <div
      ref={popRef}
      className={`absolute ${className}`}
      style={{
        left: pos?.left ?? 0,
        top: pos?.top ?? 0,
        visibility: pos ? "visible" : "hidden",
      }}
    >
      {children}
    </div>
  );
}
