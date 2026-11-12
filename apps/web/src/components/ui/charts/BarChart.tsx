export interface BarDatum {
  label: string;
  value: number;
}

interface BarChartProps {
  data: BarDatum[];
  accent?: string;
  formatValue?: (value: number) => string;
  height?: number;
}

function truncate(label: string, max = 12): string {
  return label.length > max ? `${label.slice(0, max - 1)}…` : label;
}

export default function BarChart({
  data,
  accent = "#e6a92b",
  formatValue = (value) => String(value),
  height = 190,
}: BarChartProps) {
  const width = 440;
  const padTop = 22;
  const padBottom = 30;
  const padX = 10;
  const chartHeight = height - padTop - padBottom;
  const max = Math.max(1, ...data.map((d) => d.value));
  const slot = data.length > 0 ? (width - padX * 2) / data.length : 0;
  const barWidth = Math.min(46, slot * 0.55);

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="h-auto w-full"
      role="img"
      aria-label="Bar chart"
    >
      <line
        x1={padX}
        y1={height - padBottom}
        x2={width - padX}
        y2={height - padBottom}
        stroke="rgba(15,23,42,0.1)"
      />
      {data.map((datum, index) => {
        const barHeight = (datum.value / max) * chartHeight;
        const x = padX + slot * index + (slot - barWidth) / 2;
        const y = height - padBottom - barHeight;
        return (
          <g key={datum.label}>
            <rect
              x={x}
              y={y}
              width={barWidth}
              height={Math.max(barHeight, 2)}
              rx={4}
              fill={accent}
              opacity={0.85}
            />
            <text
              x={x + barWidth / 2}
              y={y - 6}
              textAnchor="middle"
              fontSize="10"
              fontWeight="600"
              fill="#0f172a"
            >
              {formatValue(datum.value)}
            </text>
            <text
              x={x + barWidth / 2}
              y={height - padBottom + 15}
              textAnchor="middle"
              fontSize="9"
              fill="#64748b"
            >
              {truncate(datum.label)}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
