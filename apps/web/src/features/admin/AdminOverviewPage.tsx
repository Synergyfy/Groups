import { Link } from "react-router-dom";
import {
  ArrowRight,
  CheckCircle2,
  Crown,
  FileCheck2,
  FolderKanban,
  LayoutDashboard,
  Mail,
  SlidersHorizontal,
  Users,
} from "lucide-react";
import Badge from "../../components/ui/Badge";
import Card, { CardBody, CardTitle } from "../../components/ui/Card";
import LinkButton from "../../components/ui/LinkButton";
import SectionHeader from "../../components/ui/SectionHeader";
import StatCard from "../../components/ui/StatCard";
import TipIcon from "../../components/ui/TipIcon";
import BarChart from "../../components/ui/charts/BarChart";
import Donut from "../../components/ui/charts/Donut";
import { SkeletonCard, SkeletonRows } from "../../components/ui/Skeleton";
import { useAdminData } from "../../admin/AdminDataProvider";

const COMPLETENESS_RULES = [
  {
    id: "rule-1",
    title: "Invitation-first onboarding without prior account",
    description:
      "A person without a Central Hub Solution account can accept an invitation, register through the flow and return directly to their invited group.",
    status: "verified",
    link: "/admin/invitations",
    linkText: "View Invitations",
  },
  {
    id: "rule-2",
    title: "Business owner and consumer role separation",
    description:
      "Business owners and consumers have separate permissions. Consumers never inherit group ownership, administrative control, or access to the business suite.",
    status: "verified",
    link: "/admin/users",
    linkText: "View Users & Roles",
  },
  {
    id: "rule-3",
    title: "Mandatory business groups & group types",
    description:
      "Admin can manage mandatory business groups (Marketing, Advertising, Partners), Consulting, Seasonal and consumer-focused groups.",
    status: "verified",
    link: "/admin/groups?tab=rules",
    linkText: "Manage Rules",
  },
  {
    id: "rule-4",
    title: "Membership entitlements",
    description:
      "Bronze, Silver, Gold and Platinum entitlements are clearly defined and configurable per plan.",
    status: "verified",
    link: "/admin/plans",
    linkText: "Review Plans",
  },
];

export default function AdminOverviewPage() {
  const { data, loading } = useAdminData();
  const metrics = data?.overview?.metrics;

  const totalBusinessOwners = metrics?.businessOwners ?? 0;
  const totalConsumers = metrics?.consumers ?? 0;
  const totalGroups = metrics?.totalGroups ?? 0;
  const totalInvitations = metrics?.invitations ?? 0;
  const activeMemberships = metrics?.activeMemberships ?? 0;
  const pendingRequests = metrics?.pendingRequests ?? 0;

  const byTypeBars = (data?.overview?.groupsByType ?? []).slice(0, 5);
  const statusSegments = data?.overview?.groupsByStatus ?? [];
  const completeness = data?.settingsReport?.completeness ?? [];
  const verifiedCount = completeness.filter(
    (rule) => rule.status === "Verified",
  ).length;

  if (loading) {
    return (
      <div className="flex flex-col gap-4">
        <SkeletonCard />
        <div className="grid grid-cols-2 gap-3 xl:grid-cols-3">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
        <SkeletonRows rows={5} />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <SectionHeader
        title="Admin Dashboard — Overview"
        subtitle="Consolidated administrator overview of groups, memberships, access, invitations and platform health."
        tip="Organised cleanly into the 8 core administration modules requested for Henry's sign-off."
        actions={
          <LinkButton to="/admin/groups" size="sm">
            Manage groups <ArrowRight className="size-3.5" />
          </LinkButton>
        }
      />

      {/* --- Section 1: The 6 Key Totals --------------------------------- */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
        <StatCard
          label="Business owners"
          value={totalBusinessOwners.toLocaleString("en-GB")}
          hint="Registered & active owners"
          accent="gold"
        />
        <StatCard
          label="Consumers"
          value={totalConsumers.toLocaleString("en-GB")}
          hint="Invited consumer members"
          accent="info"
        />
        <StatCard
          label="Total groups"
          value={totalGroups.toLocaleString("en-GB")}
          hint="Mandatory, business & consumer"
          accent="gold"
        />
        <StatCard
          label="Invitations"
          value={totalInvitations.toLocaleString("en-GB")}
          hint="Tracked invitation links"
          accent="info"
        />
        <StatCard
          label="Active memberships"
          value={activeMemberships.toLocaleString("en-GB")}
          hint="Total member seats"
          accent="success"
        />
        <StatCard
          label="Pending requests"
          value={pendingRequests.toLocaleString("en-GB")}
          hint="Review queue & invites"
          accent={pendingRequests > 0 ? "warning" : "success"}
        />
      </div>

      {/* --- Quick Hub Navigation (The 8 Clean Sections) -------------------- */}
      <Card>
        <CardBody className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <CardTitle>Admin Dashboard Navigation</CardTitle>
            <Badge variant="gold">8 Clean Sections</Badge>
          </div>
          <p className="text-xs text-slate-400">
            Direct access to all sections defined in Henry's groups and membership consolidation.
          </p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <ModuleCard
              title="Overview"
              to="/admin/overview"
              description="Platform totals, health metrics, and completeness status."
              icon={<LayoutDashboard className="size-4 text-gold-400" />}
              active
            />
            <ModuleCard
              title="Users"
              to="/admin/users"
              description="Business owners, consumers, registrations, status & roles."
              icon={<Users className="size-4 text-gold-400" />}
            />
            <ModuleCard
              title="Groups"
              to="/admin/groups"
              description="Mandatory, consulting, seasonal, consumer & moderation."
              icon={<FolderKanban className="size-4 text-gold-400" />}
            />
            <ModuleCard
              title="Invitations"
              to="/admin/invitations"
              description="Links, pending/accepted, expired, and non-account support."
              icon={<Mail className="size-4 text-gold-400" />}
            />
            <ModuleCard
              title="Plans"
              to="/admin/plans"
              description="Named plans with Standard/Pro/Pro+ variants & renewals."
              icon={<Crown className="size-4 text-gold-400" />}
            />
            <ModuleCard
              title="Settings & Reports"
              to="/admin/settings-reports"
              description="Group defaults, notifications, invitation text & reports."
              icon={<SlidersHorizontal className="size-4 text-gold-400" />}
            />
          </div>
        </CardBody>
      </Card>

      {/* --- Final Completeness Check Panel -------------------------------- */}
      <Card>
        <CardBody className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-3">
            <div className="flex items-center gap-2">
              <FileCheck2 className="size-5 text-gold-400" />
              <div>
                <CardTitle>Final Completeness Check (Sign-off Criteria)</CardTitle>
                <p className="text-xs text-slate-400">
                  Confirmed status of the five critical platform rules required before development sign-off.
                </p>
              </div>
            </div>
            <Badge variant={verifiedCount === completeness.length && completeness.length > 0 ? "success" : "warning"}>
              {verifiedCount} / {completeness.length || COMPLETENESS_RULES.length} Rules Verified
            </Badge>
          </div>

          <div className="grid gap-3 lg:grid-cols-2">
            {completeness.length === 0 ? (
              <p className="text-xs text-slate-400">
                Completeness checks are not available yet.
              </p>
            ) : null}
            {completeness.map((rule, idx) => {
              const meta = COMPLETENESS_RULES.find((entry) => entry.id === rule.id);
              const isVerified = rule.status === "Verified";
              return (
              <div
                key={rule.id}
                className="flex flex-col justify-between rounded-xl border border-white/10 bg-ink-950/50 p-3.5 transition-colors hover:border-gold-500/30"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-[10px] font-bold text-emerald-300">
                        {idx + 1}
                      </span>
                      <p className="text-xs font-semibold text-white">{meta?.title ?? rule.title}</p>
                    </div>
                    <span className={`inline-flex items-center gap-1 text-[11px] font-medium ${isVerified ? "text-emerald-400" : "text-amber-400"}`}>
                      <CheckCircle2 className="size-3.5" /> {rule.status}
                    </span>
                  </div>
                  {meta ? (
                    <p className="mt-2 text-[11px] leading-relaxed text-slate-400">
                      {meta.description}
                    </p>
                  ) : null}
                </div>
                <div className="mt-3 flex items-center justify-end">
                  {meta ? (
                    <Link
                      to={meta.link}
                      className="inline-flex items-center gap-1 text-[11px] font-medium text-gold-400 transition-colors hover:text-gold-300"
                    >
                      {meta.linkText} <ArrowRight className="size-3" />
                    </Link>
                  ) : null}
                </div>
              </div>
              );
            })}
          </div>
        </CardBody>
      </Card>

      {/* --- Charts & Visual Breakdown ------------------------------------- */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardBody className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <CardTitle>Top Group Types</CardTitle>
              <TipIcon text="Distribution of groups across mandatory, consulting, seasonal, and consumer types." />
            </div>
            <BarChart data={byTypeBars} height={180} />
          </CardBody>
        </Card>

        <Card>
          <CardBody className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <CardTitle>Group Status Breakdown</CardTitle>
              <TipIcon text="Active, recruiting, pending review and closed groups across the platform." />
            </div>
            <div className="flex flex-col items-center justify-center py-2 sm:flex-row sm:gap-6">
              <Donut data={statusSegments} size={150} thickness={24} />
              <div className="mt-3 flex flex-col gap-1.5 sm:mt-0">
                {statusSegments.map((s) => (
                  <div key={s.label} className="flex items-center gap-2 text-xs">
                    <span
                      className="size-2.5 rounded-full"
                      style={{ backgroundColor: s.color }}
                    />
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
  );
}

function ModuleCard({
  title,
  description,
  to,
  icon,
  active,
}: {
  title: string;
  description: string;
  to: string;
  icon: React.ReactNode;
  active?: boolean;
}) {
  return (
    <Link
      to={to}
      className={`group flex flex-col justify-between rounded-xl border p-3.5 transition-all ${
        active
          ? "border-gold-500/40 bg-gold-500/[0.08]"
          : "border-white/10 bg-ink-950/60 hover:border-gold-500/30 hover:bg-white/5"
      }`}
    >
      <div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {icon}
            <span className="text-xs font-bold text-white group-hover:text-gold-300">
              {title}
            </span>
          </div>
          <ArrowRight className="size-3 text-slate-500 transition-transform group-hover:translate-x-0.5 group-hover:text-gold-400" />
        </div>
        <p className="mt-2 text-[11px] leading-relaxed text-slate-400">{description}</p>
      </div>
    </Link>
  );
}
