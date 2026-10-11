import { useId } from "react";

export interface SparkDatum {
  label: string;
  value: number;
}

interface SparklineProps {
  data: SparkDatum[];
  accent?: string;
  height?: number;
  showLabels?: boolean;
  formatValue?: (value: number) => string;
}

export default function Sparkline({
  data,
  accent = "#e6a92b",
  height = 130,
  showLabels = true,
  formatValue = (value) => value.toLocaleString(),
}: SparklineProps) {
  const gradientId = useId();
  const width = 440;
  const padX = 14;
  const padTop = 16;
  const padBottom = showLabels ? 24 : 10;
  const chartHeight = height - padTop - padBottom;

  const values = data.map((d) => d.value);
  const min = Math.min(...values, 0);
  const max = Math.max(...values, 1);
  const range = max - min || 1;
  const step = data.length > 1 ? (width - padX * 2) / (data.length - 1) : 0;

  const points = data.map((datum, index) => {
    const x = padX + step * index;
    const y = padTop + chartHeight - ((datum.value - min) / range) * chartHeight;
    return { x, y, datum };
  });

  const linePath = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
  const areaPath =
    points.length > 0
      ? `${linePath} L ${points[points.length - 1].x} ${height - padBottom} L ${points[0].x} ${height - padBottom} Z`
      : "";

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="h-auto w-full"
      role="img"
      aria-label="Line chart"
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={accent} stopOpacity="0.35" />
          <stop offset="100%" stopColor={accent} stopOpacity="0" />
        </linearGradient>
      </defs>
      <line
        x1={padX}
        y1={height - padBottom}
        x2={width - padX}
        y2={height - padBottom}
        stroke="rgba(15,23,42,0.1)"
      />
      {areaPath && <path d={areaPath} fill={`url(#${gradientId})`} />}
      <path d={linePath} fill="none" stroke={accent} strokeWidth="2.5" strokeLinejoin="round" />
      {points.map((point, index) => {
        const last = index === points.length - 1;
        return (
          <g key={point.datum.label}>
            <circle cx={point.x} cy={point.y} r={last ? 4.5 : 3} fill={last ? accent : "#0a0f1c"} stroke={accent} strokeWidth="2" />
            <text
              x={point.x}
              y={height - padBottom + 14}
              textAnchor="middle"
              fontSize="9"
              fill="#64748b"
            >
              {point.datum.label}
            </text>
            {last && (
              <text x={point.x} y={point.y - 10} textAnchor="end" fontSize="10" fontWeight="600" fill="#0f172a">
                {formatValue(point.datum.value)}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}
