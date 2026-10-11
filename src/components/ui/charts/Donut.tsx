export interface DonutDatum {
  label: string;
  value: number;
  color?: string;
}

const DEFAULT_COLORS = ["#e6a92b", "#a78bfa", "#34d399", "#38bdf8", "#fb7185", "#94a3b8"];

interface DonutSegment {
  datum: DonutDatum;
  dash: string;
  rotation: number;
  color: string;
}

function computeSegments(
  data: DonutDatum[],
  total: number,
  circumference: number
): DonutSegment[] {
  const safeTotal = total > 0 ? total : 1;
  let offset = 0;
  return data.map((datum, index) => {
    const fraction = datum.value / safeTotal;
    const length = fraction * circumference;
    const rotation = (offset / safeTotal) * 360 - 90;
    offset += datum.value;
    return {
      datum,
      dash: `${length} ${circumference - length}`,
      rotation,
      color: datum.color ?? DEFAULT_COLORS[index % DEFAULT_COLORS.length],
    };
  });
}

interface DonutProps {
  data: DonutDatum[];
  size?: number;
  thickness?: number;
  centerValue?: string;
  centerLabel?: string;
}

export default function Donut({
  data,
  size = 148,
  thickness = 18,
  centerValue,
  centerLabel,
}: DonutProps) {
  const total = data.reduce((sum, datum) => sum + datum.value, 0);
  const radius = (size - thickness) / 2;
  const circumference = 2 * Math.PI * radius;
  const segments = computeSegments(data, total, circumference);

  return (
    <svg
      viewBox={`0 0 ${size} ${size}`}
      width={size}
      height={size}
      role="img"
      aria-label="Donut chart"
    >
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="rgba(15,23,42,0.06)"
        strokeWidth={thickness}
      />
      {segments.map((segment) => (
        <circle
          key={segment.datum.label}
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={segment.color}
          strokeWidth={thickness}
          strokeDasharray={segment.dash}
          transform={`rotate(${segment.rotation} ${size / 2} ${size / 2})`}
          strokeLinecap="butt"
        />
      ))}
      {centerValue && (
        <text
          x={size / 2}
          y={size / 2 - 2}
          textAnchor="middle"
          fontSize="20"
          fontWeight="700"
          fill="#0f172a"
        >
          {centerValue}
        </text>
      )}
      {centerLabel && (
        <text
          x={size / 2}
          y={size / 2 + 15}
          textAnchor="middle"
          fontSize="9"
          fill="#475569"
        >
          {centerLabel}
        </text>
      )}
    </svg>
  );
}

interface ChartLegendProps {
  data: DonutDatum[];
}

export function ChartLegend({ data }: ChartLegendProps) {
  return (
    <ul className="space-y-2">
      {data.map((datum, index) => (
        <li key={datum.label} className="flex items-center justify-between gap-3 text-xs">
          <span className="flex items-center gap-2 text-slate-400">
            <span
              className="size-2.5 shrink-0 rounded-sm"
              style={{ backgroundColor: datum.color ?? DEFAULT_COLORS[index % DEFAULT_COLORS.length] }}
            />
            {datum.label}
          </span>
          <span className="font-semibold text-white">{datum.value}</span>
        </li>
      ))}
    </ul>
  );
}
