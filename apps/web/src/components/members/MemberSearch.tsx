import { useMemo, useRef, useState } from "react";
import { ChevronRight, Search, X } from "lucide-react";
import Avatar from "../ui/Avatar";
import Badge from "../ui/Badge";
import TipIcon from "../ui/TipIcon";

export interface MemberSearchItem {
  id: string;
  name: string;
  contactName: string;
  category: string;
  city: string;
  joinedAt?: string;
  isOwner?: boolean;
  isSelf?: boolean;
  online?: boolean;
}

interface MemberSearchProps {
  members: MemberSearchItem[];
  open: boolean;
  onToggle: () => void;
  onSelect: (id: string) => void;
  label?: string;
}

export default function MemberSearch({
  members,
  open,
  onToggle,
  onSelect,
  label = "Search members",
}: MemberSearchProps) {
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const results = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return members;
    return members.filter((member) =>
      [member.name, member.contactName, member.category, member.city].some((value) =>
        value.toLowerCase().includes(needle)
      )
    );
  }, [members, query]);

  const toggle = () => {
    onToggle();
    if (open) setQuery("");
    else window.setTimeout(() => inputRef.current?.focus(), 0);
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-medium text-slate-400">
          {label}
          <span className="ml-1.5 text-slate-500">{members.length}</span>
          <TipIcon
            text="Filters members by name, business, category or city."
            className="ml-1.5"
          />
        </p>
        <button
          type="button"
          onClick={toggle}
          aria-label={open ? "Close member search" : "Search for a member"}
          aria-expanded={open}
          className="flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-lg border border-white/10 bg-ink-850 text-slate-400 transition-colors hover:border-gold-500/40 hover:text-gold-200 focus-visible:outline-2 focus-visible:outline-gold-500"
        >
          {open ? <X className="size-4" /> : <Search className="size-4" />}
        </button>
      </div>

      {open && (
        <>
          <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-ink-950/70 px-3 focus-within:border-gold-500/40">
            <Search className="size-4 shrink-0 text-slate-500" />
            <input
              ref={inputRef}
              type="text"
              enterKeyHint="search"
              placeholder="Type a name, category or city"
              aria-label="Search for a member"
              className="h-10 w-full min-w-0 bg-transparent text-sm text-white placeholder:text-slate-500 focus:outline-none"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
            {query.length > 0 && (
              <button
                type="button"
                onClick={() => setQuery("")}
                aria-label="Clear search"
                className="flex size-6 shrink-0 cursor-pointer items-center justify-center rounded-full text-slate-500 transition-colors hover:bg-white/10 hover:text-white"
              >
                <X className="size-3.5" />
              </button>
            )}
          </div>

          <ul className="flex flex-col gap-1.5">
            {results.map((member) => (
              <li key={member.id}>
                <button
                  type="button"
                  onClick={() => onSelect(member.id)}
                  className="group flex w-full cursor-pointer items-center gap-3 rounded-xl border border-white/10 bg-ink-950/60 px-3 py-2 text-left transition-colors hover:border-gold-500/40 hover:bg-ink-850/70 focus-visible:outline-2 focus-visible:outline-gold-500"
                >
                  <Avatar
                    id={member.id}
                    name={member.name}
                    className="size-8 shrink-0 rounded-full text-[10px] font-bold text-white"
                  />
                  <span className="min-w-0 flex-1 truncate text-xs">
                    <span className="font-semibold text-white">{member.name}</span>
                    <span className="text-slate-500">
                      {" "}
                      · {member.category} · {member.city}
                    </span>
                  </span>
                  {member.isOwner && <Badge variant="gold">Owner</Badge>}
                  {member.isSelf && !member.isOwner && <Badge variant="info">You</Badge>}
                  {member.online && (
                    <span
                      className="size-2 shrink-0 rounded-full bg-emerald-400"
                      title="Online"
                    />
                  )}
                  <ChevronRight className="size-4 shrink-0 text-slate-600 transition-transform group-hover:translate-x-0.5" />
                </button>
              </li>
            ))}
            {results.length === 0 && (
              <li className="rounded-xl border border-dashed border-white/15 p-4 text-center text-xs text-slate-500">
                No member matches “{query.trim()}”.
              </li>
            )}
          </ul>
        </>
      )}
    </div>
  );
}
