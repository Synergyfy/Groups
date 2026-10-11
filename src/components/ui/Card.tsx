import type { HTMLAttributes, ReactNode } from "react";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}

export default function Card({ className = "", children, ...rest }: CardProps) {
  return (
    <div
      className={`rounded-2xl border border-white/10 bg-ink-900/70 ${className}`}
      {...rest}
    >
      {children}
    </div>
  );
}

export function CardTitle({ className = "", children }: CardProps) {
  return (
    <h3 className={`text-sm font-semibold text-white ${className}`}>{children}</h3>
  );
}

export function CardBody({ className = "", children, ...rest }: CardProps) {
  return (
    <div className={`p-4 sm:p-5 ${className}`} {...rest}>
      {children}
    </div>
  );
}
