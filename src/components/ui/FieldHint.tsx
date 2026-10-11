interface FieldHintProps {
  children: string;
}

export default function FieldHint({ children }: FieldHintProps) {
  return <span className="block text-[10px] leading-snug text-slate-500">{children}</span>;
}
