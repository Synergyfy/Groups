import { useState } from "react";
import { Check, Copy, Link2 } from "lucide-react";
import Button from "./Button";

interface ShareLinkProps {
  url: string;
  label?: string;
  hint?: string;
}

export default function ShareLink({ url, label = "Group link", hint }: ShareLinkProps) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      try {
        const helper = document.createElement("textarea");
        helper.value = url;
        document.body.appendChild(helper);
        helper.select();
        document.execCommand("copy");
        helper.remove();
      } catch {
        /* clipboard unavailable — prototype keeps the link visible for manual copy */
      }
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="rounded-xl border border-gold-500/30 bg-gold-500/10 p-3">
      <p className="text-[11px] uppercase tracking-wide text-slate-500">{label}</p>
      <div className="mt-1.5 flex items-center gap-2">
        <span className="flex h-9 min-w-0 flex-1 items-center gap-2 rounded-lg border border-white/10 bg-ink-950/60 px-2.5 text-xs text-slate-300">
          <Link2 className="size-3.5 shrink-0 text-gold-400" />
          <span className="truncate">{url}</span>
        </span>
        <Button variant="primary" size="sm" onClick={copy} aria-label={`Copy ${label}`}>
          {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
          {copied ? "Copied" : "Copy"}
        </Button>
      </div>
      <p className="mt-1.5 text-[11px] text-slate-500">
        {hint ?? "Share this link — anyone who opens it lands on the group page."}
      </p>
    </div>
  );
}
