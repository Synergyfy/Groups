export interface TabItem {
  id: string;
  label: string;
  count?: number;
}

interface TabsProps {
  items: TabItem[];
  value: string;
  onChange: (id: string) => void;
}

export default function Tabs({ items, value, onChange }: TabsProps) {
  return (
    <div
      role="tablist"
      className="flex gap-1 overflow-x-auto rounded-xl border border-white/10 bg-ink-900/70 p-1"
    >
      {items.map((item) => {
        const active = item.id === value;
        return (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(item.id)}
            className={`inline-flex h-10 shrink-0 cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-lg px-3.5 text-xs font-medium transition-colors ${
              active
                ? "bg-gold-500/15 text-gold-200 border border-gold-500/30"
                : "border border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            {item.label}
            {item.count !== undefined && (
              <span
                className={`rounded-full px-1.5 py-px text-[10px] font-semibold ${
                  active ? "bg-gold-500/25 text-gold-200" : "bg-white/10 text-slate-400"
                }`}
              >
                {item.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
