import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  Banknote,
  Bell,
  CheckCircle2,
  FileCheck2,
  Mail,
  Save,
  Sliders,
  SlidersHorizontal,
  TrendingUp,
} from "lucide-react";
import Badge from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import Card, { CardBody, CardTitle } from "../../components/ui/Card";
import SectionHeader from "../../components/ui/SectionHeader";
import StatCard from "../../components/ui/StatCard";
import Table, { type TableColumn } from "../../components/ui/Table";
import Toast from "../../components/ui/Toast";
import BarChart from "../../components/ui/charts/BarChart";
import Donut from "../../components/ui/charts/Donut";
import { errorMessage } from "../../app/api";
import { adminApi, type AdminPaymentOverview, type AdminPaymentRow } from "../../admin/adminApi";
import { useAdminData } from "../../admin/AdminDataProvider";
import { formatMinor } from "../payments/paymentsApi";

const SIGN_OFF_RULES = [
  {
    id: "rule-1",
    title: "1. Invitation-first onboarding without prior account",
    ruleText:
      "A person without a Central Hub Solution account can accept an invitation, register and return to the correct group.",
    status: "Verified",
    evidence:
      "Implemented in InviteLandingPage.tsx. When an invitee opens /invite/:id, their invitation is preserved while they register a free PlatformAccount, automatically binding their account and redirecting to the invited group.",
    link: "/admin/invitations",
    linkText: "Test Invitation Flow",
  },
  {
    id: "rule-2",
    title: "2. Business owner and consumer role & permission separation",
    ruleText:
      "Business owners and consumers have the correct roles and separate permissions.",
    status: "Verified",
    evidence:
      "ParticipantRole explicitly distinguishes 'business-invitee' vs 'consumer'. Consumers join strictly into group.memberIds (never group.ownerId), and have read-only access to group content without settings or business suite access.",
    link: "/admin/users",
    linkText: "Check Users & Roles",
  },
  {
    id: "rule-3",
    title: "3. Mandatory business groups & full group type management",
    ruleText:
      "Admin can manage mandatory business groups and other group types.",
    status: "Verified",
    evidence:
      "Admin controls mandatory groups (Marketing, Advertising, Partners), Consulting, Seasonal (Friends & Family), and Consumer-focused groups, with full lifecycle (create, edit, approve, suspend, close).",
    link: "/admin/groups?tab=rules",
    linkText: "Manage Group & Circle Rules",
  },
  {
    id: "rule-4",
    title: "4. Plan entitlements",
    ruleText:
      "Plan entitlements are clearly defined.",
    status: "Verified",
    evidence:
      "Bronze, Silver, Gold and Platinum entitlements are mapped per plan and editable in AdminPlansPage.tsx.",
    link: "/admin/plans",
    linkText: "Review Plans",
  },
];

export default function AdminSettingsReportsPage() {
  const { data, refresh } = useAdminData();
  const [activeTab, setActiveTab] = useState<"settings" | "reports" | "completeness">("settings");
  const [feedback, setFeedback] = useState<string | null>(null);
  const [payments, setPayments] = useState<AdminPaymentOverview | null>(null);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [refundingId, setRefundingId] = useState<string | null>(null);

  useEffect(() => {
    if (activeTab !== "reports" || payments) return;
    let active = true;
    adminApi
      .paymentOverview()
      .then((result) => {
        if (active) {
          setPayments(result);
          setPaymentError(null);
        }
      })
      .catch((cause) => {
        if (active) setPaymentError(errorMessage(cause));
      });
    return () => {
      active = false;
    };
  }, [activeTab, payments]);

  const refreshPayments = async () => {
    const result = await adminApi.paymentOverview();
    setPayments(result);
    setPaymentError(null);
  };

  const handleRefund = async (row: AdminPaymentRow) => {
    const remaining = Number(row.amountMinor) - Number(row.refundedMinor);
    if (
      !window.confirm(
        `Refund ${formatMinor(remaining)} of ${formatMinor(row.amountMinor)} for ${row.reference}?`,
      )
    ) {
      return;
    }
    setRefundingId(row.id);
    try {
      await adminApi.refundPayment(row.id, {
        reason: "Refund issued from the admin console",
      });
      await refreshPayments();
      setFeedback("Refund issued through MCOM Pay.");
    } catch (cause) {
      setFeedback(errorMessage(cause));
    } finally {
      setRefundingId(null);
    }
  };

  const paymentColumns: TableColumn<AdminPaymentRow>[] = [
    {
      key: "createdAt",
      header: "Date",
      render: (row) => (
        <span className="text-[11px] text-slate-400">
          {new Date(row.createdAt).toLocaleDateString("en-GB")}
        </span>
      ),
    },
    {
      key: "reference",
      header: "Payment",
      render: (row) => (
        <div>
          <p className="text-xs font-semibold text-white">
            {row.group?.name ?? row.planName ?? row.purpose}
          </p>
          <p className="text-[10px] text-slate-500">
            {row.reference} · {row.method}
          </p>
        </div>
      ),
    },
    {
      key: "payer",
      header: "Payer",
      render: (row) => (
        <span className="text-[11px] text-slate-300">
          {row.payer?.name ?? "Guest"}
        </span>
      ),
    },
    {
      key: "payee",
      header: "Payee",
      render: (row) => (
        <div>
          <p className="text-[11px] text-slate-300">
            {row.payee?.name ?? "247GBS payable"}
          </p>
          <p className="text-[10px] text-slate-500">
            {row.payee ? row.payee.type : "app balance"}
          </p>
        </div>
      ),
    },
    {
      key: "amount",
      header: "Amount",
      align: "right",
      render: (row) => (
        <div>
          <p className="text-xs font-semibold text-white">
            {formatMinor(row.amountMinor)}
          </p>
          <p className="text-[10px] text-slate-500">
            fee {formatMinor(row.feeMinor ?? 0)}
          </p>
        </div>
      ),
    },
    {
      key: "settlement",
      header: "Payee settlement",
      render: (row) =>
        row.payee ? (
          <Badge
            variant={
              row.settlementState === "SETTLED"
                ? "success"
                : row.settlementState === "FAILED"
                  ? "danger"
                  : "warning"
            }
          >
            {row.settlementState ?? "PENDING"}
          </Badge>
        ) : (
          <span className="text-[10px] text-slate-600">app payable</span>
        ),
    },
    {
      key: "status",
      header: "Status",
      render: (row) => (
        <Badge
          variant={
            row.status === "PAID"
              ? "success"
              : row.status === "FAILED"
                ? "danger"
                : row.status === "PENDING"
                  ? "warning"
                  : "muted"
          }
        >
          {row.status.replaceAll("_", " ")}
        </Badge>
      ),
    },
    {
      key: "actions",
      header: "",
      align: "right",
      render: (row) =>
        row.status === "PAID" || row.status === "PARTIALLY_REFUNDED" ? (
          <Button
            size="sm"
            variant="ghost"
            disabled={refundingId === row.id}
            onClick={() => void handleRefund(row)}
          >
            {refundingId === row.id ? "Refunding…" : "Refund"}
          </Button>
        ) : (
          <span className="text-[10px] text-slate-600">—</span>
        ),
    },
  ];

  const settings = (data?.adminConfig.platformSettings ?? {}) as {
    defaultRequiredSize?: number;
    defaultPricing?: "free" | "paid";
    defaultVisibility?: "directory" | "members";
    defaultGreeting?: string;
    smsFallback?: boolean;
    notifyOnNewRegistration?: boolean;
    notifyOnModerationQueue?: boolean;
  };

  // Settings state
  const [defaultRequiredSize, setDefaultRequiredSize] = useState(
    settings.defaultRequiredSize ?? 12,
  );
  const [defaultPricing, setDefaultPricing] = useState<"free" | "paid">(
    settings.defaultPricing ?? "free",
  );
  const [defaultVisibility, setDefaultVisibility] = useState<"directory" | "members">(
    settings.defaultVisibility ?? "directory",
  );
  const [defaultGreeting, setDefaultGreeting] = useState(
    settings.defaultGreeting ??
      "You have been invited to join this group on Groups & Circles, the group platform from Central Hub Solution."
  );
  const [smsFallback, setSmsFallback] = useState(settings.smsFallback ?? true);
  const [notifyOnNewRegistration, setNotifyOnNewRegistration] = useState(
    settings.notifyOnNewRegistration ?? true,
  );
  const [notifyOnModerationQueue, setNotifyOnModerationQueue] = useState(
    settings.notifyOnModerationQueue ?? true,
  );

  const saveSettings = async () => {
    try {
      await adminApi.patchConfig({
        platformSettings: {
          defaultRequiredSize,
          defaultPricing,
          defaultVisibility,
          defaultGreeting,
          smsFallback,
          notifyOnNewRegistration,
          notifyOnModerationQueue,
        },
      });
      await refresh();
      setFeedback("Platform settings and invitation defaults saved successfully.");
    } catch {
      setFeedback("Could not save the platform settings.");
    }
  };

  const stats = data?.settingsReport?.stats;
  const completenessByRule = new Map(
    (data?.settingsReport?.completeness ?? []).map((rule) => [
      rule.id,
      rule.status,
    ]),
  );
  const verifiedRules = [...completenessByRule.values()].filter(
    (status) => status === "Verified",
  ).length;

  const growthBars =
    data?.settingsReport?.growth ?? [];
  const invStatus = data?.settingsReport?.invitationBreakdown ?? [];

  return (
    <div className="flex flex-col gap-6">
      <SectionHeader
        title="Settings and Reports"
        subtitle="Configure group defaults, invitation messages, access settings and notifications. Report on registrations, plans, groups, invitations and participation."
        tip="Includes the official 5-rule Final Completeness Check required before development sign-off."
        actions={
          activeTab === "settings" ? (
            <Button variant="primary" size="sm" onClick={saveSettings}>
              <Save className="size-4" /> Save Settings
            </Button>
          ) : undefined
        }
      />

      {/* --- Navigation Tabs -------------------------------------------- */}
      <div className="flex flex-wrap items-center gap-2 border-b border-white/10 pb-2">
        <button
          type="button"
          onClick={() => setActiveTab("settings")}
          className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
            activeTab === "settings"
              ? "bg-gold-500/15 text-gold-300 border border-gold-500/30"
              : "text-slate-400 hover:text-white"
          }`}
        >
          <SlidersHorizontal className="size-4" /> Platform &amp; Invitation Settings
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("reports")}
          className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
            activeTab === "reports"
              ? "bg-gold-500/15 text-gold-300 border border-gold-500/30"
              : "text-slate-400 hover:text-white"
          }`}
        >
          <TrendingUp className="size-4" /> Platform Reports &amp; Metrics
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("completeness")}
          className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
            activeTab === "completeness"
              ? "bg-gold-500/15 text-gold-300 border border-gold-500/30"
              : "text-slate-400 hover:text-white"
          }`}
        >
          <FileCheck2 className="size-4" /> Final Completeness Check (5 Rules)
        </button>
      </div>

      {/* --- TAB 1: Platform Settings ----------------------------------- */}
      {activeTab === "settings" && (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardBody className="flex flex-col gap-4">
              <div className="flex items-center gap-2 border-b border-white/10 pb-2">
                <Sliders className="size-4 text-gold-400" />
                <CardTitle>Group Defaults &amp; Access Settings</CardTitle>
              </div>

              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-medium text-slate-300">Default Target Group Size</span>
                <input
                  type="number"
                  value={defaultRequiredSize}
                  onChange={(e) => setDefaultRequiredSize(Number(e.target.value))}
                  className="h-10 rounded-lg border border-white/10 bg-ink-800 px-3 text-xs text-white focus:outline-none"
                  min={2}
                  max={100}
                />
                <span className="text-[10px] text-slate-500">
                  Target member seats pre-filled in group creation wizards.
                </span>
              </label>

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="flex flex-col gap-1.5">
                  <span className="text-xs font-medium text-slate-300">Default Pricing Mode</span>
                  <select
                    value={defaultPricing}
                    onChange={(e) => setDefaultPricing(e.target.value as "free" | "paid")}
                    className="h-10 rounded-lg border border-white/10 bg-ink-800 px-3 text-xs text-slate-200 focus:outline-none"
                  >
                    <option value="free">Free to Join</option>
                    <option value="paid">Paid Contribution</option>
                  </select>
                </label>

                <label className="flex flex-col gap-1.5">
                  <span className="text-xs font-medium text-slate-300">Default Visibility</span>
                  <select
                    value={defaultVisibility}
                    onChange={(e) => setDefaultVisibility(e.target.value as "directory" | "members")}
                    className="h-10 rounded-lg border border-white/10 bg-ink-800 px-3 text-xs text-slate-200 focus:outline-none"
                  >
                    <option value="directory">Platform Directory</option>
                    <option value="members">Members Only</option>
                  </select>
                </label>
              </div>

              <div className="flex flex-col gap-2 pt-2 border-t border-white/10">
                <span className="text-xs font-semibold text-white">Delivery Channels</span>
                <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={smsFallback}
                    onChange={(e) => setSmsFallback(e.target.checked)}
                    className="size-4 accent-gold-500 rounded"
                  />
                  <span>Allow SMS mobile number invitation fallback</span>
                </label>
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardBody className="flex flex-col gap-4">
              <div className="flex items-center gap-2 border-b border-white/10 pb-2">
                <Mail className="size-4 text-gold-400" />
                <CardTitle>Invitation Messages &amp; Explainer Copy</CardTitle>
              </div>

              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-medium text-slate-300">
                  Standard Invitation Landing Greeting
                </span>
                <textarea
                  value={defaultGreeting}
                  onChange={(e) => setDefaultGreeting(e.target.value)}
                  rows={4}
                  className="rounded-lg border border-white/10 bg-ink-800 p-3 text-xs text-white focus:outline-none"
                />
                <span className="text-[10px] text-slate-500">
                  Shown to consumers who open an invitation link without prior knowledge of Central Hub Solution.
                </span>
              </label>

              <div className="flex flex-col gap-2 pt-2 border-t border-white/10">
                <div className="flex items-center gap-2">
                  <Bell className="size-4 text-gold-400" />
                  <span className="text-xs font-semibold text-white">Admin Notification Triggers</span>
                </div>
                <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={notifyOnNewRegistration}
                    onChange={(e) => setNotifyOnNewRegistration(e.target.checked)}
                    className="size-4 accent-gold-500 rounded"
                  />
                  <span>Alert admin when a new user registers through an invitation link</span>
                </label>
                <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={notifyOnModerationQueue}
                    onChange={(e) => setNotifyOnModerationQueue(e.target.checked)}
                    className="size-4 accent-gold-500 rounded"
                  />
                  <span>Alert admin when a group enters &apos;Pending Review&apos; status</span>
                </label>
              </div>
            </CardBody>
          </Card>
        </div>
      )}

      {/* --- TAB 2: Platform Reports ------------------------------------ */}
      {activeTab === "reports" && (
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3 xl:grid-cols-3">
            <StatCard
              label="Registered entities"
              value={stats?.registeredEntities ?? 0}
              hint="Businesses + consumers"
              accent="gold"
            />
            <StatCard
              label="Plan subscribers"
              value={stats?.totalPlanSubscribers ?? 0}
              hint="Active plan subscribers"
              accent="success"
            />
            <StatCard
              label="Programme fees"
              value={`£${(stats?.programmeMonthlyFees ?? 0).toLocaleString(
                "en-GB",
                { maximumFractionDigits: 2 }
              )}`}
              hint="Monthly across active programmes"
              accent="warning"
            />
            <StatCard
              label="Partner fees"
              value={`£${(stats?.partnerMonthlyFees ?? 0).toLocaleString(
                "en-GB",
                { maximumFractionDigits: 2 }
              )}`}
              hint="Monthly across active partners"
              accent="info"
            />
            <StatCard
              label="Invitations sent"
              value={stats?.invitationsSent ?? 0}
              hint="Delivery track record"
              accent="info"
            />
            <StatCard
              label="Invitation conversion"
              value={`${stats?.invitationConversion ?? 0}%`}
              hint="Accepted invitation rate"
              accent="gold"
            />
          </div>

          <Card>
            <CardBody className="flex flex-col gap-4">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-3">
                <div className="flex items-center gap-2">
                  <Banknote className="size-4 text-gold-400" />
                  <div>
                    <CardTitle>MCOM Pay settlement</CardTitle>
                    <p className="text-xs text-slate-400">
                      Payee splits, app payable and refunds from the central ledger.
                    </p>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => void refreshPayments().catch((cause) => setPaymentError(errorMessage(cause)))}
                >
                  Refresh
                </Button>
              </div>

              {paymentError ? (
                <p className="text-xs text-danger-400">{paymentError}</p>
              ) : null}

              {payments?.balance.available === false ? (
                <p className="text-xs text-warning-400">{payments.balance.message}</p>
              ) : null}

              <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
                <StatCard
                  label="Available payable"
                  value={formatMinor(payments?.balance.data?.availableMinor ?? 0)}
                  hint="Ready for an MCOM-approved payout"
                  accent="success"
                />
                <StatCard
                  label="Pending payout"
                  value={formatMinor(payments?.balance.data?.pendingPayoutMinor ?? 0)}
                  hint="Requested, awaiting approval"
                  accent="warning"
                />
                <StatCard
                  label="Paid out"
                  value={formatMinor(payments?.balance.data?.paidOutMinor ?? 0)}
                  hint="Settled to the bank"
                  accent="info"
                />
                <StatCard
                  label="Net collected"
                  value={formatMinor(payments?.summary.netMinor ?? 0)}
                  hint={`Gross ${formatMinor(payments?.summary.grossMinor ?? 0)} · refunded ${formatMinor(payments?.summary.refundedMinor ?? 0)}`}
                  accent="gold"
                />
              </div>
              <p className="text-[10px] text-slate-500">
                Payouts are approved on the MCOM side. Contact MCOM support to
                release the available app balance; payee splits are already
                settled to the group owner.
              </p>

              <div>
                <div className="mb-2 flex items-center justify-between">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-white">
                    Recent payments
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    Group contributions are split to the owner automatically.
                  </p>
                </div>
                <Table
                  columns={paymentColumns}
                  rows={payments?.recent ?? []}
                  rowKey={(row) => row.id}
                  emptyMessage="No MCOM Pay payments yet."
                />
              </div>
            </CardBody>
          </Card>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardBody className="flex flex-col gap-3">
                <CardTitle>Platform Group Growth</CardTitle>
                <p className="text-xs text-slate-400">Total groups created over recent months.</p>
                <BarChart data={growthBars} height={180} />
              </CardBody>
            </Card>

            <Card>
              <CardBody className="flex flex-col gap-3">
                <CardTitle>Invitation Conversion Breakdown</CardTitle>
                <p className="text-xs text-slate-400">Status of all invitations dispatched across the network.</p>
                <div className="flex flex-col items-center justify-center py-2 sm:flex-row sm:gap-6">
                  <Donut data={invStatus} size={150} thickness={24} />
                  <div className="mt-3 flex flex-col gap-2 sm:mt-0">
                    {invStatus.map((s) => (
                      <div key={s.label} className="flex items-center gap-2 text-xs">
                        <span className="size-2.5 rounded-full" style={{ backgroundColor: s.color }} />
                        <span className="text-slate-400">{s.label}:</span>
                        <span className="font-semibold text-white">{s.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </CardBody>
            </Card>
          </div>
        </div>
      )}

      {/* --- TAB 3: Final Completeness Check ---------------------------- */}
      {activeTab === "completeness" && (
        <Card>
          <CardBody className="flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div>
                <CardTitle>Final Completeness Check — Sign-Off Verification</CardTitle>
                <p className="text-xs text-slate-400">
                  Confirmation of the five platform rules before development sign-off.
                </p>
              </div>
              <Badge variant={verifiedRules === SIGN_OFF_RULES.length ? "success" : "warning"}>
                {verifiedRules} / {SIGN_OFF_RULES.length} Rules Verified
              </Badge>
            </div>

            <div className="flex flex-col gap-3.5">
              {SIGN_OFF_RULES.map((rule) => {
                const status = completenessByRule.get(rule.id) ?? "Not configured";
                const verified = status === "Verified";
                return (
                <div
                  key={rule.id}
                  className="rounded-xl border border-white/10 bg-ink-950/60 p-4 transition-colors hover:border-gold-500/30"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-bold text-white">{rule.title}</p>
                    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ${verified ? "bg-emerald-500/15 text-emerald-300" : "bg-amber-500/15 text-amber-300"}`}>
                      <CheckCircle2 className="size-3.5" /> {status}
                    </span>
                  </div>

                  <p className="mt-2 text-xs font-medium text-gold-300/90">{rule.ruleText}</p>
                  <p className="mt-1 text-[11px] leading-relaxed text-slate-400">{rule.evidence}</p>

                  <div className="mt-3 flex justify-end">
                    <Link
                      to={rule.link}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-gold-400 hover:text-gold-300"
                    >
                      {rule.linkText} <ArrowRight className="size-3.5" />
                    </Link>
                  </div>
                </div>
                );
              })}
            </div>
          </CardBody>
        </Card>
      )}

      {feedback && <Toast message={feedback} onDismiss={() => setFeedback(null)} />}
    </div>
  );
}
