import { useState } from "react";
import { Shield, Wallet, CheckCircle2, XCircle } from "lucide-react";
import Card, { CardBody, CardTitle } from "../../components/ui/Card";
import FieldHint from "../../components/ui/FieldHint";
import SectionHeader from "../../components/ui/SectionHeader";
import StatCard from "../../components/ui/StatCard";
import TipIcon from "../../components/ui/TipIcon";
import Toast from "../../components/ui/Toast";
import { usePartners } from "../../store/selectors";
import { useAppStore } from "../../store/context";
import type { PartnerPermissions, PartnerRecord } from "../../domain/types";

const ADMIN_ACTOR = { id: "admin", name: "Administrator" };

const TIER_COLORS: Record<string, string> = {
  Free: "bg-slate-500/15 text-slate-300",
  Bronze: "bg-orange-500/15 text-orange-300",
  Silver: "bg-sky-500/15 text-sky-300",
  Gold: "bg-gold-500/15 text-gold-300",
  Platinum: "bg-purple-500/15 text-purple-300",
};

const STATUS_COLORS: Record<string, string> = {
  Active: "bg-emerald-500/15 text-emerald-300",
  Suspended: "bg-danger-500/15 text-danger-300",
  Pending: "bg-warning-500/15 text-warning-300",
  Closed: "bg-slate-500/15 text-slate-300",
};

const PERMISSION_LABELS: { key: keyof PartnerPermissions; label: string; type: "boolean" | "number" }[] = [
  { key: "canCreateGroups", label: "Create groups", type: "boolean" },
  { key: "canCreateCircles", label: "Create circles", type: "boolean" },
  { key: "canInviteMembers", label: "Invite members", type: "boolean" },
  { key: "canRemoveMembers", label: "Remove members", type: "boolean" },
  { key: "canRunPaidGroups", label: "Run paid groups", type: "boolean" },
  { key: "canRunFreeGroups", label: "Run free groups", type: "boolean" },
  { key: "canAccessCampaigns", label: "Access campaigns", type: "boolean" },
  { key: "canAccessReports", label: "Access reports", type: "boolean" },
  { key: "canSeeFinancials", label: "See financials", type: "boolean" },
  { key: "canSetContributionAmounts", label: "Set contribution amounts", type: "boolean" },
  { key: "maxGroups", label: "Max groups", type: "number" },
  { key: "maxCircles", label: "Max circles", type: "number" },
  { key: "revenueSharePercent", label: "Revenue share %", type: "number" },
];

const PERMISSION_HINTS: Record<keyof PartnerPermissions, string> = {
  canCreateGroups: "On: they can set up new groups. Off: they cannot create any groups.",
  canCreateCircles: "On: they can create circles. Off: circle creation is blocked.",
  canInviteMembers: "On: they can add people to their groups. Off: inviting is blocked.",
  canRemoveMembers: "On: they can remove members from their groups. Off: only an admin can.",
  canRunPaidGroups: "On: they can run groups that collect payments. Off: paid groups are blocked.",
  canRunFreeGroups: "On: they can run free groups. Off: running free groups is blocked.",
  canAccessCampaigns: "On: they can open and manage campaigns. Off: campaigns stay hidden.",
  canAccessReports: "On: they can open the reports area. Off: reports stay hidden.",
  canSeeFinancials: "On: they can see revenue and fee figures. Off: financial figures stay hidden.",
  canSetContributionAmounts:
    "On: they can choose what members contribute. Off: they cannot change contribution amounts.",
  maxGroups: "How many groups this partner may have at once. Creating past this is blocked.",
  maxCircles: "How many circles this partner may have at once.",
  revenueSharePercent: "The share of platform revenue this partner keeps from paid groups.",
};

export default function AdminPartnersPage() {
  const partners = usePartners();
  const { dispatch } = useAppStore();
  const [expanded, setExpanded] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  const active = partners.filter((p) => p.status === "Active").length;
  const suspended = partners.filter((p) => p.status === "Suspended").length;
  const freePartners = partners.filter((p) => p.tier === "Free").length;
  const paidPartners = partners.filter((p) => p.tier !== "Free").length;
  const totalMonthlyFees = partners.filter((p) => p.status === "Active").reduce((sum, p) => sum + p.feeMonthly, 0);

  const togglePermission = (partner: PartnerRecord, key: keyof PartnerPermissions) => {
    const current = partner.permissions[key];
    const nextValue = typeof current === "boolean" ? !current : current;
    dispatch({
      type: "admin/partner-update",
      partnerId: partner.id,
      patch: { permissions: { ...partner.permissions, [key]: nextValue } },
      actor: ADMIN_ACTOR,
    });
    setFeedback(`${partner.businessName}: ${key} updated`);
  };

  const setStatus = (partner: PartnerRecord, status: PartnerRecord["status"]) => {
    dispatch({ type: "admin/partner-update", partnerId: partner.id, patch: { status }, actor: ADMIN_ACTOR });
    setFeedback(`${partner.businessName} set to ${status}`);
  };

  return (
    <div className="flex flex-col gap-4">
      <SectionHeader
        title="Partner Administration"
        subtitle="Full control over partner records: tier, status, permissions and financial rules for both free and paid partners."
        tip="Every change saves as you make it — there is no separate save step, and each one is written to the audit log."
      />

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-5">
        <StatCard label="Total partners" value={String(partners.length)} hint="All registered" accent="gold" />
        <StatCard label="Active" value={String(active)} hint="Currently running" accent="success" />
        <StatCard label="Suspended" value={String(suspended)} hint="Blocked from actions" accent="danger" />
        <StatCard label="Free / Paid" value={`${freePartners} / ${paidPartners}`} hint="By tier" accent="info" />
        <StatCard label="Monthly fees" value={`£${totalMonthlyFees}`} hint="From active partners" accent="warning" />
      </div>

      {/* Free vs Paid comparison */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardBody className="flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <Shield className="size-4 text-sky-400" />
              <CardTitle>Free Partners — what they CAN do</CardTitle>
              <TipIcon text="The standard Free tier limits. You can override any of these for a single partner below." />
            </div>
            <ul className="flex flex-col gap-1.5 text-xs text-slate-300">
              <li>✓ Create up to 3 groups</li>
              <li>✓ Create up to 2 circles</li>
              <li>✓ Invite members</li>
              <li>✓ Run free groups only</li>
              <li>✓ Access community features</li>
            </ul>
            <p className="mt-1 text-[11px] font-semibold text-danger-300">Cannot:</p>
            <ul className="flex flex-col gap-1.5 text-xs text-slate-400">
              <li>✗ Run paid groups</li>
              <li>✗ Remove members</li>
              <li>✗ Access campaigns or reports</li>
              <li>✗ See financial data</li>
              <li>✗ Set contribution amounts</li>
            </ul>
          </CardBody>
        </Card>

        <Card>
          <CardBody className="flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <Wallet className="size-4 text-gold-400" />
              <CardTitle>Paid Partners — what they CAN do</CardTitle>
              <TipIcon text="Paid tiers unlock these; group limits and revenue share vary by tier." />
            </div>
            <ul className="flex flex-col gap-1.5 text-xs text-slate-300">
              <li>✓ Create up to 25 groups (tier-dependent)</li>
              <li>✓ Create up to 15 circles</li>
              <li>✓ Invite and remove members</li>
              <li>✓ Run both paid and free groups</li>
              <li>✓ Access campaigns and reports</li>
              <li>✓ See financial data</li>
              <li>✓ Set contribution amounts</li>
              <li>✓ Earn revenue share (5–20% by tier)</li>
            </ul>
          </CardBody>
        </Card>
      </div>

      {/* Partner list */}
      <div className="flex flex-col gap-3">
        {partners.map((partner) => (
          <Card key={partner.id}>
            <CardBody className="flex flex-col gap-3">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-white">{partner.businessName}</p>
                  <p className="mt-0.5 text-[11px] text-slate-500">
                    Partner since {partner.joinedAt.slice(0, 10)}
                    {partner.programmeId && ` · Programme linked`}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${TIER_COLORS[partner.tier]}`}>
                    {partner.tier}
                  </span>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${STATUS_COLORS[partner.status]}`}>
                    {partner.status}
                  </span>
                  <span className="text-[11px] text-slate-400">£{partner.feeMonthly}/mo</span>
                </div>
              </div>

              {partner.notes && (
                <p className="rounded-lg border border-warning-500/20 bg-warning-500/5 px-3 py-2 text-[11px] text-warning-300">
                  {partner.notes}
                </p>
              )}

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setExpanded(expanded === partner.id ? null : partner.id)}
                  className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-lg border border-white/10 bg-ink-950/60 px-3 text-[11px] font-medium text-slate-300 transition-colors hover:border-white/20 hover:text-white"
                >
                  {expanded === partner.id ? "Hide permissions" : "Edit permissions"}
                </button>
                {partner.status === "Active" ? (
                  <button
                    type="button"
                    onClick={() => setStatus(partner, "Suspended")}
                    className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-lg border border-danger-500/30 bg-danger-500/10 px-3 text-[11px] font-medium text-danger-300 transition-colors hover:bg-danger-500/20"
                  >
                    <XCircle className="size-3.5" /> Suspend
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setStatus(partner, "Active")}
                    className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 text-[11px] font-medium text-emerald-300 transition-colors hover:bg-emerald-500/20"
                  >
                    <CheckCircle2 className="size-3.5" /> Activate
                  </button>
                )}
                <TipIcon text="Suspend marks the partner Suspended straight away; Activate puts them back to Active. Both are logged." />
              </div>

              {expanded === partner.id && (
                <div className="rounded-xl border border-white/10 bg-ink-950/60 p-3">
                  <div className="mb-2 flex items-center gap-1.5">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                      Permissions — click to toggle
                    </p>
                    <TipIcon text="Switches flip on click. The numbers are shown for reference and cannot be edited here." />
                  </div>
                  <div className="grid gap-1.5 sm:grid-cols-2">
                    {PERMISSION_LABELS.map(({ key, label, type }) => {
                      const value = partner.permissions[key];
                      return (
                        <div key={key}>
                          <button
                            type="button"
                            onClick={() => togglePermission(partner, key)}
                            className="flex w-full cursor-pointer items-center justify-between gap-2 rounded-lg bg-white/5 px-3 py-2 text-left transition-colors hover:bg-white/10"
                          >
                            <span className="text-xs text-slate-300">{label}</span>
                            {type === "boolean" ? (
                              <span
                                className={`inline-flex h-5 w-9 shrink-0 items-center rounded-full px-0.5 transition-colors ${
                                  value ? "bg-emerald-500/30" : "bg-white/10"
                                }`}
                              >
                                <span
                                  className={`size-4 rounded-full transition-transform ${
                                    value ? "translate-x-4 bg-emerald-400" : "translate-x-0 bg-slate-500"
                                  }`}
                                />
                              </span>
                            ) : (
                              <span className="rounded bg-white/10 px-2 py-0.5 text-xs font-semibold text-gold-300">
                                {String(value)}
                              </span>
                            )}
                          </button>
                          <FieldHint>{PERMISSION_HINTS[key]}</FieldHint>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </CardBody>
          </Card>
        ))}
      </div>

      {feedback && <Toast message={feedback} onDismiss={() => setFeedback(null)} />}
    </div>
  );
}
