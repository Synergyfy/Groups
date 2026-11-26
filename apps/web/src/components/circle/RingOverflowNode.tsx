interface RingOverflowNodeProps {
  /** Number of members folded behind this node. */
  count: number;
  /** Position on the ring, in percent of the canvas. */
  x: number;
  y: number;
  /** Diameter of the node in pixels. */
  size?: number;
  /** True when the hidden members are the ones currently on the ring. */
  expanded: boolean;
  /** Accessible label / tooltip for the node. */
  label: string;
  onToggle: () => void;
}

/**
 * The "+N" node that sits on a ring when it holds more members than fit.
 * Clicking it swaps the ring over to the hidden members, clicking it again
 * brings the original members back.
 */
export default function RingOverflowNode({
  count,
  x,
  y,
  size = 40,
  expanded = false,
  label,
  onToggle,
}: RingOverflowNodeProps) {
  return (
    <div
      className="absolute z-30 -translate-x-1/2 -translate-y-1/2"
      style={{ left: `${x}%`, top: `${y}%` }}
    >
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={expanded}
        aria-label={label}
        title={label}
        className={`flex cursor-pointer items-center justify-center rounded-full border border-dashed text-[10px] font-semibold transition-all duration-200 hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-300/70 ${
          expanded
            ? "border-gold-300/70 bg-gold-500/20 text-gold-200"
            : "border-white/30 bg-ink-800 text-slate-300 hover:border-gold-300/70 hover:bg-ink-700 hover:text-white"
        }`}
        style={{ width: size, height: size }}
      >
        +{count}
      </button>
    </div>
  );
}
