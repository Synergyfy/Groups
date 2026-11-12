import { useState } from "react";
import { CheckCircle2, Search, ShieldCheck, XCircle, Ban } from "lucide-react";
import Badge from "../../components/ui/Badge";
import Card, { CardBody, CardTitle } from "../../components/ui/Card";
import FieldHint from "../../components/ui/FieldHint";
import SectionHeader from "../../components/ui/SectionHeader";
import StatCard from "../../components/ui/StatCard";
import Table from "../../components/ui/Table";
import TipIcon from "../../components/ui/TipIcon";
import Toast from "../../components/ui/Toast";
import type { TableColumn } from "../../components/ui/Table";
import type { BusinessRecord } from "../../domain/types";
import { useBusinesses } from "../../store/selectors";
import { useAppStore } from "../../store/context";

const ADMIN_ACTOR = { id: "admin", name: "Administrator" };

const STATUS_COLORS: Record<string, string> = {
  Active: "bg-emerald-500/15 text-emerald-300",
  Pending: "bg-warning-500/15 text-warning-300",
  Suspended: "bg-danger-500/15 text-danger-300",
  Closed: "bg-slate-500/15 text-slate-300",
};

export default function AdminBusinessesPage() {
  const businesses = useBusinesses();
  const { dispatch } = useAppStore();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [feedback, setFeedback] = useState<string | null>(null);

  const filtered = businesses.filter((b) => {
    if (statusFilter !== "all" && b.status !== statusFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return b.name.toLowerCase().includes(q) || b.contactName.toLowerCase().includes(q) || b.city.toLowerCase().includes(q);
    }
    return true;
  });

  const updateStatus = (business: BusinessRecord, status: BusinessRecord["status"]) => {
    dispatch({ type: "admin/business-update", businessId: business.id, patch: { status }, actor: ADMIN_ACTOR });
    setFeedback(`${business.name} set to ${status}`);
  };

  const toggleVerified = (business: BusinessRecord) => {
    dispatch({ type: "admin/business-update", businessId: business.id, patch: { verified: !business.verified }, actor: ADMIN_ACTOR });
    setFeedback(`${business.name} ${business.verified ? "unverified" : "verified"}`);
  };

  const active = businesses.filter((b) => b.status === "Active").length;
  const verified = businesses.filter((b) => b.verified).length;
  const cities = new Set(businesses.map((b) => b.city)).size;

  const columns: TableColumn<BusinessRecord>[] = [
    {
      key: "name",
      header: "Business",
      render: (b) => (
        <div className="flex items-center gap-3">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-ink-800 text-xs font-bold text-gold-400">
            {b.name.slice(0, 1).toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="truncate text-xs font-semibold text-white">{b.name}</p>
            <p className="truncate text-[11px] text-slate-500">{b.contactName}</p>
          </div>
        </div>
      ),
    },
    { key: "city", header: "City", render: (b) => <span className="text-slate-300">{b.city}</span> },
    { key: "category", header: "Category", render: (b) => <span className="text-slate-300">{b.category}</span> },
    {
      key: "tier",
      header: "Tier",
      render: (b) => <Badge variant={b.tier === "Gold" ? "gold" : b.tier === "Free" ? "muted" : "info"}>{b.tier}</Badge>,
    },
    {
      key: "status",
      header: "Status",
      render: (b) => (
        <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${STATUS_COLORS[b.status]}`}>
          {b.status}
        </span>
      ),
    },
    {
      key: "verified",
      header: "Verified",
      render: (b) =>
        b.verified ? (
          <span className="inline-flex items-center gap-1 text-[11px] text-emerald-300">
            <ShieldCheck className="size-3" /> Yes
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 text-[11px] text-slate-500">
            <Ban className="size-3" /> No
          </span>
        ),
    },
    {
      key: "partner",
      header: "Partner",
      render: (b) => (b.isPartner ? <Badge variant="gold">Partner</Badge> : <span className="text-[11px] text-slate-600">—</span>),
    },
    {
      key: "actions",
      header: "Actions",
      render: (b) => (
        <div className="flex gap-1.5">
          <button
            type="button"
            onClick={() => toggleVerified(b)}
            className={`inline-flex h-7 cursor-pointer items-center gap-1 rounded-md px-2 text-[10px] font-semibold transition-colors ${
              b.verified
                ? "bg-slate-500/15 text-slate-300 hover:bg-slate-500/25"
                : "bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25"
            }`}
          >
            {b.verified ? "Unverify" : "Verify"}
          </button>
          {b.status === "Active" ? (
            <button
              type="button"
              onClick={() => updateStatus(b, "Suspended")}
              className="inline-flex h-7 cursor-pointer items-center gap-1 rounded-md bg-danger-500/15 px-2 text-[10px] font-semibold text-danger-300 transition-colors hover:bg-danger-500/25"
            >
              <XCircle className="size-3" /> Suspend
            </button>
          ) : (
            <button
              type="button"
              onClick={() => updateStatus(b, "Active")}
              className="inline-flex h-7 cursor-pointer items-center gap-1 rounded-md bg-emerald-500/15 px-2 text-[10px] font-semibold text-emerald-300 transition-colors hover:bg-emerald-500/25"
            >
              <CheckCircle2 className="size-3" /> Activate
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      <SectionHeader
        title="Business Directory"
        subtitle="Every business on the platform with admin controls: verify, suspend, activate and inspect."
        tip="Status and verification changes save straight away and are written to the audit log."
      />

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <StatCard label="Total businesses" value={String(businesses.length)} hint="Registered" accent="gold" />
        <StatCard label="Active" value={String(active)} hint="Currently operating" accent="success" />
        <StatCard label="Verified" value={String(verified)} hint="Identity confirmed" accent="info" />
        <StatCard label="Cities" value={String(cities)} hint="Geographic spread" accent="warning" />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, contact or city…"
            className="w-full rounded-lg border border-white/10 bg-ink-900 py-2 pl-9 pr-3 text-xs text-white placeholder:text-slate-500 focus:border-gold-500/40 focus:outline-none"
          />
        </div>
        <div className="flex gap-1">
          {["all", "Active", "Pending", "Suspended", "Closed"].map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setStatusFilter(s)}
              className={`rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors ${
                statusFilter === s
                  ? "border-gold-500/40 bg-gold-500/15 text-gold-200"
                  : "border-white/10 bg-white/5 text-slate-400 hover:border-white/20"
              }`}
            >
              {s === "all" ? "All" : s}
            </button>
          ))}
        </div>
        <TipIcon text="Search matches name, contact or city. Filters only change this list, never the records." />
      </div>

      <Card>
        <CardBody className="flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-1.5">
              <CardTitle>Businesses ({filtered.length})</CardTitle>
              <TipIcon text="The count follows your current search and status filter." />
            </div>
            <FieldHint>
              Verify marks identity as checked; Suspend and Activate switch status straight away —
              both are logged.
            </FieldHint>
          </div>
          <Table
            columns={columns}
            rows={filtered}
            rowKey={(b) => b.id}
            emptyMessage="No businesses match this filter."
          />
        </CardBody>
      </Card>

      {feedback && <Toast message={feedback} onDismiss={() => setFeedback(null)} />}
    </div>
  );
}
