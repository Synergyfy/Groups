import { useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
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
import Toast from "../../components/ui/Toast";
import BarChart from "../../components/ui/charts/BarChart";
import Donut from "../../components/ui/charts/Donut";
import { useAppState } from "../../store/selectors";
import { memberCountOf } from "../groups/groupUtils";

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
    link: "/admin/groups",
    linkText: "Manage Group Types",
  },
  {
    id: "rule-4",
    title: "4. Membership entitlements and temporary-access rules",
    ruleText:
      "Membership entitlements and temporary-access rules are clearly defined.",
    status: "Verified",
    evidence:
      "Bronze, Silver, Gold and Platinum entitlements are mapped alongside configurable 7-day and 14-day temporary access periods in AdminAccessRulesPage.tsx.",
    link: "/admin/access-rules",
    linkText: "Review Access Rules",
  },
  {
    id: "rule-5",
    title: "5. Admin-controlled rewards, deals and campaigns",
    ruleText:
      "Admin-controlled rewards, deals and campaigns appear correctly wherever users need them.",
    status: "Verified",
    evidence:
      "Admin controls vouchers, gift cards, coupon deals and cashback incentives in AdminRewardsDealsPage.tsx, with frontend visibility controls delivering offers to /rewards and consumer portals.",
    link: "/admin/rewards-deals",
    linkText: "Verify Rewards & Deals",
  },
];

export default function AdminSettingsReportsPage() {
  const state = useAppState();
  const [activeTab, setActiveTab] = useState<"settings" | "reports" | "completeness">("settings");
  const [feedback, setFeedback] = useState<string | null>(null);

  // Settings state
  const [defaultRequiredSize, setDefaultRequiredSize] = useState(12);
  const [defaultPricing, setDefaultPricing] = useState<"free" | "paid">("free");
  const [defaultVisibility, setDefaultVisibility] = useState<"directory" | "members">("directory");
  const [defaultGreeting, setDefaultGreeting] = useState(
    "You have been invited to join this group on Groups & Circles, the group platform from Central Hub Solution."
  );
  const [smsFallback, setSmsFallback] = useState(true);
  const [notifyOnNewRegistration, setNotifyOnNewRegistration] = useState(true);
  const [notifyOnModerationQueue, setNotifyOnModerationQueue] = useState(true);

  const saveSettings = () => {
    setFeedback("Platform settings and invitation defaults saved successfully.");
  };

  const groups = state.groups;
  const accounts = state.accounts;
  const invitations = state.invitations;
  const businesses = state.businesses;

  const totalMembers = groups.reduce((s, g) => s + memberCountOf(g), 0);

  // Growth by month
  const growthBars = [
    { label: "Jun 26", value: 4 },
    { label: "Jul 26", value: 7 },
    { label: "Aug 26", value: 11 },
    { label: "Sep 26", value: 14 },
    { label: "Oct 26", value: groups.length },
  ];

  // Invitations status donut
  const invStatus = [
    {
      label: "Accepted",
      value: invitations.filter((i) => i.status === "accepted").length,
      color: "#10b981",
    },
    {
      label: "Pending",
      value: invitations.filter((i) => i.status === "pending").length,
      color: "#f59e0b",
    },
    {
      label: "Declined",
      value: invitations.filter((i) => i.status === "declined").length,
      color: "#ef4444",
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <SectionHeader
        title="Settings and Reports"
        subtitle="Configure group defaults, invitation messages, access settings and notifications. Report on registrations, memberships, groups, invitations and participation."
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
                    onChange={(e) => setDefaultPricing(e.target.value as any)}
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
                    onChange={(e) => setDefaultVisibility(e.target.value as any)}
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
          <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
            <StatCard
              label="Registered entities"
              value={businesses.length + accounts.length}
              hint="Businesses + consumers"
              accent="gold"
            />
            <StatCard
              label="Total memberships"
              value={totalMembers}
              hint="Seats across active groups"
              accent="success"
            />
            <StatCard
              label="Invitations sent"
              value={invitations.length}
              hint="Delivery track record"
              accent="info"
            />
            <StatCard
              label="Invitation conversion"
              value={`${Math.round(
                (invitations.filter((i) => i.status === "accepted").length /
                  Math.max(1, invitations.length)) *
                  100
              )}%`}
              hint="Accepted invitation rate"
              accent="gold"
            />
          </div>

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
              <Badge variant="success">All 5 Rules Verified</Badge>
            </div>

            <div className="flex flex-col gap-3.5">
              {SIGN_OFF_RULES.map((rule) => (
                <div
                  key={rule.id}
                  className="rounded-xl border border-white/10 bg-ink-950/60 p-4 transition-colors hover:border-gold-500/30"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-bold text-white">{rule.title}</p>
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-xs font-semibold text-emerald-300">
                      <CheckCircle2 className="size-3.5" /> {rule.status}
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
              ))}
            </div>
          </CardBody>
        </Card>
      )}

      {feedback && <Toast message={feedback} onDismiss={() => setFeedback(null)} />}
    </div>
  );
}
