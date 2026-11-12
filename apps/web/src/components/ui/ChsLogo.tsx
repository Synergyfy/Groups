import { Link } from "react-router-dom";

export default function ChsLogo({
  size = "md",
  showText = true,
  linkTo = "/",
  className = "",
}: {
  size?: "sm" | "md" | "lg";
  showText?: boolean;
  linkTo?: string;
  className?: string;
}) {
  const sizeMap = {
    sm: { icon: "size-6", text: "text-xs", sub: "text-[9px]" },
    md: { icon: "size-8", text: "text-sm", sub: "text-[10px]" },
    lg: { icon: "size-12", text: "text-lg", sub: "text-xs" },
  };

  const current = sizeMap[size];

  const content = (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <div className="relative flex shrink-0 items-center justify-center">
        <svg
          viewBox="0 0 32 32"
          className={`${current.icon} shrink-0 transition-transform hover:scale-105`}
          aria-label="Central Hub Solution (CHS)"
        >
          {/* Outer ring */}
          <circle cx="16" cy="16" r="15" fill="#0a0f1c" stroke="#e6a92b" strokeWidth="2" />
          {/* Orbital dashed ring */}
          <circle
            cx="16"
            cy="16"
            r="8.5"
            fill="none"
            stroke="#f2c15c"
            strokeWidth="1.5"
            strokeDasharray="3 3"
          />
          {/* Core hub */}
          <circle cx="16" cy="16" r="4" fill="#e6a92b" />
          {/* Orbital satellite dot */}
          <circle cx="24.5" cy="16" r="1.5" fill="#34d399" />
        </svg>
      </div>

      {showText && (
        <div className="min-w-0">
          <span className={`block font-extrabold tracking-tight text-white ${current.text}`}>
            Central Hub Solution
          </span>
          <span className={`block font-medium tracking-wide text-gold-300 uppercase ${current.sub}`}>
            CHS Groups &amp; Circles
          </span>
        </div>
      )}
    </div>
  );

  if (linkTo) {
    return (
      <Link to={linkTo} className="inline-flex items-center outline-none focus-visible:ring-2 focus-visible:ring-gold-400 rounded-lg">
        {content}
      </Link>
    );
  }

  return content;
}
