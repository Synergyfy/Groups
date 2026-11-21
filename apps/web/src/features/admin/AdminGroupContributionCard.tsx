import { useEffect, useState } from "react";
import {
  Banknote,
  CheckCircle2,
  Clock,
  Coins,
  PieChart,
  TrendingUp,
  Users,
} from "lucide-react";
import Badge from "../../components/ui/Badge";
import Card, { CardBody, CardTitle } from "../../components/ui/Card";
import ProgressBar from "../../components/ui/ProgressBar";
import Table, { type TableColumn } from "../../components/ui/Table";
import Toast from "../../components/ui/Toast";
import type { Group } from "../../domain/types";
import { useAdminDirectoryEntry } from "../../admin/AdminDataProvider";
import { adminApi } from "../../admin/adminApi";

export interface MemberContributionRecord {
  memberId: string;
  name: string;
  contactName: string;
  category: string;
  city: string;
  role: "Owner" | "Member";
  amount: number;
  status: "paid" | "pending" | "overdue";
  paidDate?: string;
  dueDate: string;
  paymentMethod: string;
}

function mapContributionRows(
  rows: Array<{
    memberId: string;
    fullName: string;
    status: string;
    amount: number;
    paidAt?: string | null;
  }>,
  group: Group,
  findDirectoryEntry: (id: string) => {
    name: string;
    contactName: string;
    category: string;
    city: string;
  },
): MemberContributionRecord[] {
  return rows.map((row) => {
    const entry = findDirectoryEntry(row.memberId);
    const status =
      row.status === "paid" || row.status === "overdue"
        ? row.status
        : "pending";
    return {
      memberId: row.memberId,
      name: row.fullName || entry.name,
      contactName: entry.contactName,
      category: entry.category,
      city: entry.city,
      role: row.memberId === group.ownerId ? "Owner" : "Member",
      amount: row.amount,
      status,
      paidDate: row.paidAt ? row.paidAt.slice(0, 10) : undefined,
      dueDate: "—",
      paymentMethod: status === "paid" ? "MCOM Pay / recorded" : "Awaiting payment",
    };
  });
}

export default function AdminGroupContributionCard({
  group,
  showHeader = true,
}: {
  group: Group;
  showHeader?: boolean;
}) {
  const [feedback, setFeedback] = useState<string | null>(null);
  const [savingMemberId, setSavingMemberId] = useState<string | null>(null);
  const findDirectoryEntry = useAdminDirectoryEntry();
  const [ledger, setLedger] = useState<MemberContributionRecord[]>([]);

  useEffect(() => {
    let active = true;
    adminApi
      .groupContribution(group.id)
      .then((result) => {
        if (!active) return;
        setLedger(mapContributionRows(result.rows, group, findDirectoryEntry));
      })
      .catch(() => {
        if (active) setLedger([]);
      });
    return () => {
      active = false;
    };
  }, [group, findDirectoryEntry]);

  const isPaid = group.pricing === "paid";
  const amount = group.contribution ?? 0;
  const frequency = group.contributionFrequency ?? "monthly";
  const totalMembers = ledger.length;
  const paidCount = ledger.filter((m) => m.status === "paid").length;
  const pendingCount = ledger.filter((m) => m.status === "pending").length;
  const overdueCount = ledger.filter((m) => m.status === "overdue").length;

  const targetPot = amount * totalMembers;
  const collectedPot = amount * paidCount;
  const pendingPot = targetPot - collectedPot;
  const progressPct = targetPot > 0 ? Math.round((collectedPot / targetPot) * 100) : 100;

  const handleMarkPaid = async (memberId: string) => {
    setSavingMemberId(memberId);
    try {
      await adminApi.updateGroupMemberContribution(group.id, memberId, "paid");
      setLedger((prev) =>
        prev.map((item) =>
          item.memberId === memberId
            ? {
                ...item,
                status: "paid",
                paidDate: new Date().toISOString().slice(0, 10),
                paymentMethod: "MCOM Pay / recorded",
              }
            : item,
        ),
      );
      setFeedback("Contribution marked as paid.");
    } catch {
      setFeedback("Could not update the contribution. Please try again.");
    } finally {
      setSavingMemberId(null);
    }
  };

  const columns: TableColumn<MemberContributionRecord>[] = [
    {
      key: "name",
      header: "Member",
      render: (m) => (
        <div>
          <div className="flex items-center gap-1.5">
            <span className="font-semibold text-white">{m.name}</span>
            {m.role === "Owner" && (
              <Badge variant="gold">Owner</Badge>
            )}
          </div>
          <p className="text-[11px] text-slate-500">
            {m.contactName} · {m.city}
          </p>
        </div>
      ),
    },
    {
      key: "amount",
      header: "Contribution",
      render: (m) => (
        <span className="font-semibold text-white">£{m.amount}</span>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (m) => (
        <Badge
          variant={
            m.status === "paid"
              ? "success"
              : m.status === "pending"
              ? "warning"
              : "danger"
          }
        >
          {m.status === "paid" ? "Paid" : m.status === "pending" ? "Pending" : "Overdue"}
        </Badge>
      ),
    },
    {
      key: "schedule",
      header: "Date / Due",
      render: (m) => (
        <span className="text-[11px] text-slate-400">
          {m.status === "paid"
            ? `Paid on ${m.paidDate ?? "—"}`
            : `Due: ${m.dueDate}`}
        </span>
      ),
    },
    {
      key: "method",
      header: "Payment Method",
      render: (m) => (
        <span className="text-xs text-slate-300">{m.paymentMethod}</span>
      ),
    },
    {
      key: "actions",
      header: "Admin Action",
      align: "right",
      render: (m) => (
        <div className="flex items-center justify-end gap-1.5">
          {m.status !== "paid" ? (
            <button
              type="button"
              disabled={savingMemberId === m.memberId}
              onClick={() => void handleMarkPaid(m.memberId)}
              className="inline-flex items-center gap-1 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2 py-1 text-[10px] font-semibold text-emerald-300 hover:bg-emerald-500/20 disabled:opacity-50"
            >
              <CheckCircle2 className="size-2.5" />{" "}
              {savingMemberId === m.memberId ? "Saving…" : "Mark Paid"}
            </button>
          ) : (
            <span className="text-[10px] text-emerald-400 flex items-center gap-1">
              <CheckCircle2 className="size-3" /> Settled
            </span>
          )}
        </div>
      ),
    },
  ];

  if (!isPaid) {
    return (
      <Card>
        <CardBody className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex size-8 items-center justify-center rounded-lg bg-emerald-500/10">
                <Coins className="size-4 text-emerald-400" />
              </div>
              <div>
                <CardTitle>Group Pricing & Contribution</CardTitle>
                <p className="text-xs text-slate-400">Zero member fee structure</p>
              </div>
            </div>
            <Badge variant="muted">Free Group</Badge>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            This group is configured as a <strong className="text-white">Free Group</strong>. Members do not contribute financially to participate.
            All group collaboration, messaging, and community tools are free of charge.
          </p>
        </CardBody>
      </Card>
    );
  }

  return (
    <Card className="border border-gold-500/30 bg-gradient-to-br from-ink-900/90 via-ink-950/90 to-amber-950/20 shadow-xl">
      <CardBody className="flex flex-col gap-5">
        {showHeader && (
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-4">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-xl bg-gold-500/15 border border-gold-500/30 text-gold-300">
                <Banknote className="size-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-white">Paid Group Contribution Details</h3>
                  <Badge variant="gold">Paid Group</Badge>
                  <span className="rounded-full bg-gold-500/20 px-2 py-0.5 text-[10px] font-semibold text-gold-200">
                    {frequency === "once" ? "One-off Fee" : `Recurring (${frequency})`}
                  </span>
                </div>
                <p className="text-xs text-slate-400">
                  Full administrative transparency into fees, collection cycles, and member payments
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xl font-black text-gold-300">£{amount}</p>
              <p className="text-[11px] text-slate-400">
                per member {frequency === "once" ? "one-off" : `every ${frequency}`}
              </p>
            </div>
          </div>
        )}

        {/* 4 Key Contribution Stats */}
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <div className="rounded-xl border border-white/10 bg-ink-900/80 p-3.5">
            <span className="flex items-center gap-1.5 text-xs text-slate-400">
              <Coins className="size-3.5 text-gold-400" /> Member Contribution
            </span>
            <p className="mt-1 text-lg font-bold text-white">£{amount}</p>
            <p className="text-[11px] text-slate-500">
              {frequency === "once"
                ? "Paid once upon joining"
                : `Billed recurring ${frequency}`}
            </p>
          </div>

          <div className="rounded-xl border border-white/10 bg-ink-900/80 p-3.5">
            <span className="flex items-center gap-1.5 text-xs text-slate-400">
              <PieChart className="size-3.5 text-sky-400" /> Target Period Pot
            </span>
            <p className="mt-1 text-lg font-bold text-white">£{targetPot}</p>
            <p className="text-[11px] text-slate-500">
              {totalMembers} contributing member{totalMembers === 1 ? "" : "s"}
            </p>
          </div>

          <div className="rounded-xl border border-white/10 bg-ink-900/80 p-3.5">
            <span className="flex items-center gap-1.5 text-xs text-slate-400">
              <CheckCircle2 className="size-3.5 text-emerald-400" /> Collected So Far
            </span>
            <p className="mt-1 text-lg font-bold text-emerald-400">£{collectedPot}</p>
            <p className="text-[11px] text-slate-500">
              {paidCount} settled ({progressPct}%)
            </p>
          </div>

          <div className="rounded-xl border border-white/10 bg-ink-900/80 p-3.5">
            <span className="flex items-center gap-1.5 text-xs text-slate-400">
              <Clock className="size-3.5 text-amber-400" /> Pending / Outstanding
            </span>
            <p className="mt-1 text-lg font-bold text-amber-300">£{pendingPot}</p>
            <p className="text-[11px] text-slate-500">
              {pendingCount} pending · {overdueCount} overdue
            </p>
          </div>
        </div>

        {/* Contribution Process & Workflow */}
        <div className="rounded-xl border border-white/10 bg-ink-900/50 p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <TrendingUp className="size-4 text-gold-400" />
              <h4 className="text-xs font-semibold text-white uppercase tracking-wider">
                Contribution Process & Cycle Status
              </h4>
            </div>
            <span className="text-xs font-semibold text-gold-300">
              {collectedPot} / £{targetPot} ({progressPct}% collected)
            </span>
          </div>

          <ProgressBar value={collectedPot} max={targetPot || 1} />

          <div className="mt-4 grid gap-3 sm:grid-cols-3 text-xs">
            <div className="rounded-lg border border-white/5 bg-ink-950/60 p-2.5">
              <span className="text-[11px] text-slate-400 block mb-1">How often do members pay?</span>
              <p className="font-semibold text-white">
                {frequency === "once"
                  ? "One-off on joining"
                  : `Recurring: Every ${frequency}`}
              </p>
              <p className="text-[10px] text-slate-500 mt-0.5">
                {frequency === "monthly"
                  ? "Cycle resets 1st of every calendar month"
                  : frequency === "weekly"
                  ? "Cycle resets every Monday"
                  : "Single fee covering permanent membership"}
              </p>
            </div>

            <div className="rounded-lg border border-white/5 bg-ink-950/60 p-2.5">
              <span className="text-[11px] text-slate-400 block mb-1">Disbursement / Payout Schedule</span>
              <p className="font-semibold text-white">Not configured</p>
              <p className="text-[10px] text-slate-500 mt-0.5">
                No payout schedule is configured for this group in the platform.
              </p>
            </div>

            <div className="rounded-lg border border-white/5 bg-ink-950/60 p-2.5">
              <span className="text-[11px] text-slate-400 block mb-1">Collection Channel</span>
              <p className="font-semibold text-white">MCOM Pay + admin override</p>
              <p className="text-[10px] text-slate-500 mt-0.5">
                Members can pay contributions through MCOM Pay (Stripe, PayPal or
                MCOM Wallet). Administrators can still record offline payments.
              </p>
            </div>
          </div>
        </div>

        {/* Member Payment Ledger */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Users className="size-4 text-slate-400" />
              <h4 className="text-xs font-semibold text-white uppercase tracking-wider">
                Member Contribution Register ({totalMembers} members)
              </h4>
            </div>
            <p className="text-[11px] text-slate-500">
              Live payment tracking for current billing cycle
            </p>
          </div>

          <Table columns={columns} rows={ledger} rowKey={(m) => m.memberId} />
        </div>

        {feedback && <Toast message={feedback} onDismiss={() => setFeedback(null)} />}
      </CardBody>
    </Card>
  );
}
