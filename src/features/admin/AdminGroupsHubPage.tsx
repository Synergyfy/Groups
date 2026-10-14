import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  Building2,
  CheckCircle,
  Clock,
  FolderKanban,
  Globe,
  Mail,
  MapPin,
  Plus,
  RefreshCw,
  Search,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Star,
  Tag,
  TrendingUp,
  UserCheck,
  UserPlus,
  Users,
  Zap,
  Banknote,
  Sparkles,
} from "lucide-react";
import Badge from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import Card, { CardBody } from "../../components/ui/Card";
import SectionHeader from "../../components/ui/SectionHeader";
import StatCard from "../../components/ui/StatCard";
import Table, { type TableColumn } from "../../components/ui/Table";
import Toast from "../../components/ui/Toast";
import Modal from "../../components/ui/Modal";
import type { Group, GroupStatus, GroupType, Invitation } from "../../domain/types";
import { useAppState } from "../../store/selectors";
import { useAppStore } from "../../store/context";
import { memberCountOf } from "../groups/groupUtils";
import AdminGroupContributionCard from "./AdminGroupContributionCard";

const ADMIN_ACTOR = { id: "admin", name: "Administrator" };

type Tab =
  | "overview"
  | "all-groups"
  | "platform-groups"
  | "business-groups"
  | "members-invitations"
  | "access-rules"
  | "reports";

const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: "overview", label: "Overview", icon: <BarChart3 className="size-3.5" /> },
  { id: "all-groups", label: "All Groups", icon: <FolderKanban className="size-3.5" /> },
  { id: "platform-groups", label: "Platform Groups", icon: <Globe className="size-3.5" /> },
  { id: "business-groups", label: "Business Groups", icon: <Building2 className="size-3.5" /> },
  { id: "members-invitations", label: "Members & Invitations", icon: <Users className="size-3.5" /> },
  { id: "access-rules", label: "Access Rules", icon: <Shield className="size-3.5" /> },
  { id: "reports", label: "Reports & Activity", icon: <TrendingUp className="size-3.5" /> },
];

const SECTORS = [
  "Retail", "Food & Hospitality", "Professional Services", "Health & Wellbeing",
  "Technology", "Construction", "Creative & Media", "Education", "Finance", "Other",
];

const UK_LOCATIONS = [
  "National (UK-wide)", "London", "Manchester", "Birmingham", "Leeds",
  "Bristol", "Sheffield", "Edinburgh", "Glasgow", "Cardiff",
];

const JOIN_METHODS = [
  { value: "open", label: "Open", desc: "Eligible businesses join directly" },
  { value: "request", label: "Request to join", desc: "Admin approval required" },
  { value: "invitation", label: "Invitation only", desc: "Admin sends invites" },
];

function statusVariant(status: string): "success" | "info" | "warning" | "muted" | "danger" {
  if (status === "Active" || status === "Recruiting") return "success";
  if (status === "Pending Review") return "warning";
  if (status === "Suspended") return "danger";
  return "muted";
}

function invStatusVariant(status: string): "success" | "info" | "warning" | "muted" | "danger" {
  if (status === "accepted") return "success";
  if (status === "pending") return "warning";
  if (status === "declined") return "danger";
  return "muted";
}

export default function AdminGroupsHubPage() {
  const state = useAppState();
  const { dispatch } = useAppStore();
  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [feedback, setFeedback] = useState<string | null>(null);

  const groups = state.groups;
  const invitations = state.invitations;

  const adminGroups = useMemo(
    () => groups.filter((g) => g.source === "automatic" || g.ownerId === "admin"),
    [groups]
  );
  const businessGroups = useMemo(
    () => groups.filter((g) => g.source !== "automatic" && g.ownerId !== "admin"),
    [groups]
  );
  const activeGroups = useMemo(
    () => groups.filter((g) => g.status === "Active" || g.status === "Recruiting"),
    [groups]
  );
  const suspendedGroups = useMemo(() => groups.filter((g) => g.status === "Suspended"), [groups]);
  const pendingGroups = useMemo(() => groups.filter((g) => g.status === "Pending Review"), [groups]);
  const totalMembers = useMemo(() => groups.reduce((acc, g) => acc + memberCountOf(g), 0), [groups]);
  const pendingInvitations = useMemo(() => invitations.filter((i) => i.status === "pending"), [invitations]);

  const updateStatus = (group: Group, status: GroupStatus) => {
    dispatch({ type: "admin/group-update", groupId: group.id, patch: { status }, actor: ADMIN_ACTOR });
    setFeedback(`${group.name} status updated to ${status}`);
  };

  const approveGroup = (group: Group) => {
    dispatch({ type: "admin/group-approve", groupId: group.id, actor: ADMIN_ACTOR });
    setFeedback(`Approved ${group.name}`);
  };

  return (
    <div className="flex flex-col gap-6">
      {/* spec: 14 — Admin Groups Dashboard */}
      <span className="sr-only">14 — Admin Groups Dashboard</span>
      <SectionHeader
        title="Groups Control Centre"
        subtitle="Central oversight for all platform-wide and business-created groups. Create, manage, moderate and monitor every group across the platform."
        tip="Admin-created groups are discoverable by eligible businesses. Business-created groups appear here for admin oversight and moderation."
      />

      {/* Tab Navigation */}
      <div className="overflow-x-auto">
        <div className="flex min-w-max items-center gap-1 rounded-xl border border-white/10 bg-ink-950/60 p-1">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-medium whitespace-nowrap transition-all ${
                activeTab === tab.id
                  ? "bg-gold-500/15 text-gold-300 border border-gold-500/30 shadow-sm"
                  : "text-slate-400 hover:bg-white/5 hover:text-white"
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {activeTab === "overview" && (
        <OverviewTab
          groups={groups}
          adminGroups={adminGroups}
          businessGroups={businessGroups}
          activeGroups={activeGroups}
          suspendedGroups={suspendedGroups}
          pendingGroups={pendingGroups}
          totalMembers={totalMembers}
          invitations={invitations}
          pendingInvitations={pendingInvitations}
          onApprove={approveGroup}
          onSuspend={(g) => updateStatus(g, "Suspended")}
          setTab={setActiveTab}
        />
      )}
      {activeTab === "all-groups" && (
        <AllGroupsTab groups={groups} onApprove={approveGroup} onUpdateStatus={updateStatus} setFeedback={setFeedback} />
      )}
      {activeTab === "platform-groups" && (
        <PlatformGroupsTab groups={adminGroups} state={state} dispatch={dispatch} setFeedback={setFeedback} onUpdateStatus={updateStatus} />
      )}
      {activeTab === "business-groups" && (
        <BusinessGroupsTab groups={businessGroups} onApprove={approveGroup} onUpdateStatus={updateStatus} setFeedback={setFeedback} />
      )}
      {activeTab === "members-invitations" && (
        <MembersInvitationsTab groups={groups} invitations={invitations} dispatch={dispatch} setFeedback={setFeedback} />
      )}
      {activeTab === "access-rules" && <AccessRulesTab setFeedback={setFeedback} />}
      {activeTab === "reports" && (
        <ReportsTab groups={groups} invitations={invitations} adminGroups={adminGroups} businessGroups={businessGroups} activeGroups={activeGroups} suspendedGroups={suspendedGroups} />
      )}

      {feedback && <Toast message={feedback} onDismiss={() => setFeedback(null)} />}
    </div>
  );
}

// ===========================================================================
// TAB 1 — Overview
// ===========================================================================
function OverviewTab({
  groups, adminGroups, businessGroups, activeGroups, suspendedGroups, pendingGroups,
  totalMembers, invitations: _invitations, pendingInvitations, onApprove, onSuspend, setTab,
}: {
  groups: Group[];
  adminGroups: Group[];
  businessGroups: Group[];
  activeGroups: Group[];
  suspendedGroups: Group[];
  pendingGroups: Group[];
  totalMembers: number;
  invitations: Invitation[];
  pendingInvitations: Invitation[];
  onApprove: (g: Group) => void;
  onSuspend: (g: Group) => void;
  setTab: (t: Tab) => void;
}) {
  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <StatCard label="Total Groups" value={groups.length} hint="All types, all creators" accent="gold" />
        <StatCard label="Admin-Created" value={adminGroups.length} hint="Platform-wide groups" accent="info" />
        <StatCard label="Business-Created" value={businessGroups.length} hint="By business owners" accent="success" />
        <StatCard label="Pending Review" value={pendingGroups.length} hint="Awaiting admin approval" accent={pendingGroups.length > 0 ? "warning" : "success"} />
      </div>
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <StatCard label="Active Groups" value={activeGroups.length} hint="Active & recruiting" accent="success" />
        <StatCard label="Suspended" value={suspendedGroups.length} hint="Currently restricted" accent={suspendedGroups.length > 0 ? "danger" : undefined} />
        <StatCard label="Total Members" value={totalMembers} hint="Across all groups" accent="gold" />
        <StatCard label="Pending Invitations" value={pendingInvitations.length} hint="Outstanding invites" accent={pendingInvitations.length > 0 ? "warning" : "success"} />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardBody className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex size-8 items-center justify-center rounded-lg bg-amber-500/10">
                  <AlertTriangle className="size-4 text-amber-400" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">Moderation Queue</p>
                  <p className="text-xs text-slate-400">
                    Groups awaiting admin review
                    {pendingGroups.length > 0 ? (
                      <span className="ml-1.5 text-amber-400 font-medium">· Needs attention</span>
                    ) : (
                      <span className="ml-1.5 text-slate-500">· Needs attention flag when pending</span>
                    )}
                  </p>
                </div>
              </div>
              <button type="button" onClick={() => setTab("all-groups")} className="text-xs text-gold-400 hover:text-gold-300 flex items-center gap-1">
                View all <ArrowRight className="size-3" />
              </button>
            </div>

            {pendingGroups.length === 0 ? (
              <div className="rounded-lg border border-white/5 bg-emerald-500/5 p-4 text-center">
                <CheckCircle className="mx-auto mb-1 size-5 text-emerald-400" />
                <p className="text-xs text-emerald-300">No pending groups — all clear</p>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {pendingGroups.slice(0, 5).map((g) => (
                  <div key={g.id} className="flex items-center justify-between gap-3 rounded-lg border border-white/5 bg-ink-900/50 px-3 py-2">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-medium text-white">{g.name}</p>
                      <p className="text-[11px] text-slate-500">By {g.ownerName} · {g.type}</p>
                    </div>
                    <div className="flex shrink-0 items-center gap-1.5">
                      <button type="button" onClick={() => onApprove(g)} className="rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2 py-1 text-[10px] font-semibold text-emerald-300 hover:bg-emerald-500/20">Approve</button>
                      <button type="button" onClick={() => onSuspend(g)} className="rounded-md border border-white/10 bg-white/5 px-2 py-1 text-[10px] text-rose-400 hover:bg-rose-500/10">Suspend</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardBody className="flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <div className="flex size-8 items-center justify-center rounded-lg bg-gold-500/10">
                <Star className="size-4 text-gold-400" />
              </div>
              <div>
                <p className="text-sm font-semibold text-white">By Group Type</p>
                <p className="text-xs text-slate-400">Distribution overview</p>
              </div>
            </div>
            {["Marketing", "Advertising", "Partner", "Consulting", "Seasonal"].map((type) => {
              const count = groups.filter((g) => g.type === type).length;
              const pct = groups.length ? Math.round((count / groups.length) * 100) : 0;
              return (
                <div key={type} className="flex flex-col gap-1">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-400">{type}</span>
                    <span className="font-medium text-white">{count}</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
                    <div className="h-full rounded-full bg-gradient-to-r from-gold-500 to-amber-400 transition-all" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </CardBody>
        </Card>
      </div>

      {suspendedGroups.length > 0 && (
        <Card>
          <CardBody className="flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <ShieldAlert className="size-4 text-rose-400" />
              <p className="text-sm font-semibold text-rose-300">Suspended Groups ({suspendedGroups.length})</p>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              {suspendedGroups.map((g) => (
                <div key={g.id} className="flex items-center justify-between gap-3 rounded-lg border border-rose-500/20 bg-rose-500/5 px-3 py-2">
                  <div className="min-w-0">
                    <p className="truncate text-xs font-medium text-white">{g.name}</p>
                    <p className="text-[11px] text-slate-500">{g.ownerName} · {g.type}</p>
                  </div>
                  <Link to={`/admin/groups/${g.id}`} className="shrink-0 text-xs text-gold-400 hover:text-gold-300">Review</Link>
                </div>
              ))}
            </div>
          </CardBody>
        </Card>
      )}
    </div>
  );
}

// ===========================================================================
// TAB 2 — All Groups
// ===========================================================================
function AllGroupsTab({
  groups, onApprove, onUpdateStatus, setFeedback: _setFeedback,
}: {
  groups: Group[];
  onApprove: (g: Group) => void;
  onUpdateStatus: (g: Group, s: GroupStatus) => void;
  setFeedback: (m: string) => void;
}) {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [creatorFilter, setCreatorFilter] = useState("all");
  const [pricingFilter, setPricingFilter] = useState("all");
  const [sortBy, setSortBy] = useState<"name" | "members" | "created">("created");

  const filtered = useMemo(() => {
    return groups
      .filter((g) => {
        const isAdmin = g.source === "automatic" || g.ownerId === "admin";
        if (creatorFilter === "admin" && !isAdmin) return false;
        if (creatorFilter === "business" && isAdmin) return false;
        if (typeFilter !== "all" && g.type !== typeFilter) return false;
        if (statusFilter !== "all" && g.status !== statusFilter) return false;
        if (pricingFilter === "paid" && g.pricing !== "paid") return false;
        if (pricingFilter === "free" && g.pricing === "paid") return false;
        if (search.trim()) {
          const q = search.toLowerCase();
          return g.name.toLowerCase().includes(q) || g.ownerName.toLowerCase().includes(q) || g.type.toLowerCase().includes(q);
        }
        return true;
      })
      .sort((a, b) => {
        if (sortBy === "members") return memberCountOf(b) - memberCountOf(a);
        if (sortBy === "name") return a.name.localeCompare(b.name);
        return b.createdAt.localeCompare(a.createdAt);
      });
  }, [groups, search, typeFilter, statusFilter, creatorFilter, pricingFilter, sortBy]);

  const columns: TableColumn<Group>[] = [
    {
      key: "name",
      header: "Group",
      render: (g) => (
        <div className="min-w-0">
          <Link to={`/admin/groups/${g.id}`} className="font-semibold text-white hover:text-gold-300 transition-colors block truncate">{g.name}</Link>
          <p className="text-[11px] text-slate-500 truncate">{g.purpose}</p>
        </div>
      ),
    },
    {
      key: "type",
      header: "Type / Creator",
      render: (g) => {
        const isAdmin = g.source === "automatic" || g.ownerId === "admin";
        return (
          <div className="flex flex-col gap-0.5">
            <Badge variant={["Marketing", "Advertising", "Partner"].includes(g.type) ? "gold" : "info"}>{g.type}</Badge>
            <span className="text-[10px] text-slate-500">{isAdmin ? "Admin" : "Business"}</span>
          </div>
        );
      },
    },
    {
      key: "owner",
      header: "Owner",
      render: (g) => (
        <div>
          <p className="text-xs text-slate-300">{g.ownerName}</p>
          {g.location?.city && <p className="text-[11px] text-slate-500 flex items-center gap-1"><MapPin className="size-2.5" /> {g.location.city}</p>}
        </div>
      ),
    },
    {
      key: "pricing",
      header: "Plan / Pricing",
      render: (g) => (
        <span className="inline-flex items-center gap-1">
          {g.pricing === "paid" ? (
            <Badge variant="gold">
              Paid · £{g.contribution ?? 0}
              {g.contributionFrequency === "once" ? " one-off" : g.contributionFrequency ? `/${g.contributionFrequency}` : ""}
            </Badge>
          ) : (
            <Badge variant="muted">Free</Badge>
          )}
        </span>
      ),
    },
    {
      key: "members",
      header: "Members",
      render: (g) => <span className="text-xs font-medium text-slate-300">{memberCountOf(g)}</span>,
    },
    {
      key: "status",
      header: "Status",
      render: (g) => <Badge variant={statusVariant(g.status)}>{g.status}</Badge>,
    },
    {
      key: "created",
      header: "Created",
      render: (g) => <span className="text-[11px] text-slate-500">{new Date(g.createdAt).toLocaleDateString()}</span>,
    },
    {
      key: "actions",
      header: "Actions",
      align: "right",
      render: (g) => (
        <div className="flex items-center justify-end gap-1">
          {g.status === "Pending Review" && (
            <button type="button" onClick={() => onApprove(g)} className="rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2 py-1 text-[10px] font-semibold text-emerald-300 hover:bg-emerald-500/20">Approve</button>
          )}
          {g.status !== "Suspended" ? (
            <button type="button" onClick={() => onUpdateStatus(g, "Suspended")} className="rounded-md border border-white/10 bg-white/5 px-2 py-1 text-[10px] text-rose-400 hover:bg-rose-500/10">Suspend</button>
          ) : (
            <button type="button" onClick={() => onUpdateStatus(g, "Active")} className="rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2 py-1 text-[10px] text-emerald-300 hover:bg-emerald-500/20">Reactivate</button>
          )}
          <Link to={`/admin/groups/${g.id}`} className="rounded-md border border-white/10 bg-white/5 px-2 py-1 text-[10px] text-slate-300 hover:bg-white/10">Open</Link>
        </div>
      ),
    },
  ];

  return (
    <Card>
      <CardBody className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-white">All Groups Directory</p>
            <p className="text-xs text-slate-400">{filtered.length} of {groups.length} groups shown</p>
          </div>
        </div>

        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-slate-500" />
            <input type="text" placeholder="Search by name, owner, type…" value={search} onChange={(e) => setSearch(e.target.value)} className="h-9 w-full rounded-lg border border-white/10 bg-ink-950/70 pl-9 pr-3 text-xs text-white placeholder:text-slate-500 focus:border-gold-500/50 focus:outline-none" />
          </div>
          <select value={creatorFilter} onChange={(e) => setCreatorFilter(e.target.value)} className="h-9 rounded-lg border border-white/10 bg-ink-950/70 px-3 text-xs text-slate-300 focus:border-gold-500/50 focus:outline-none">
            <option value="all">All creators</option>
            <option value="admin">Admin-created</option>
            <option value="business">Business-created</option>
          </select>
          <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="h-9 rounded-lg border border-white/10 bg-ink-950/70 px-3 text-xs text-slate-300 focus:border-gold-500/50 focus:outline-none">
            <option value="all">All types</option>
            <option value="Marketing">Marketing</option>
            <option value="Advertising">Advertising</option>
            <option value="Partner">Partner</option>
            <option value="Consulting">Consulting</option>
            <option value="Seasonal">Seasonal</option>
            <option value="B2B">B2B</option>
          </select>
          <select value={pricingFilter} onChange={(e) => setPricingFilter(e.target.value)} className="h-9 rounded-lg border border-white/10 bg-ink-950/70 px-3 text-xs text-slate-300 focus:border-gold-500/50 focus:outline-none">
            <option value="all">All pricing</option>
            <option value="paid">Paid groups</option>
            <option value="free">Free groups</option>
          </select>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="h-9 rounded-lg border border-white/10 bg-ink-950/70 px-3 text-xs text-slate-300 focus:border-gold-500/50 focus:outline-none">
            <option value="all">All statuses</option>
            <option value="Active">Active</option>
            <option value="Recruiting">Recruiting</option>
            <option value="Pending Review">Pending Review</option>
            <option value="Suspended">Suspended</option>
            <option value="Closed">Closed</option>
          </select>
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-500">
          <span>Sort by:</span>
          {(["created", "name", "members"] as const).map((s) => (
            <button key={s} type="button" onClick={() => setSortBy(s)} className={`rounded px-2 py-0.5 capitalize transition-colors ${sortBy === s ? "bg-gold-500/15 text-gold-300" : "hover:text-white"}`}>
              {s === "created" ? "Newest" : s === "members" ? "Members" : "Name"}
            </button>
          ))}
        </div>

        <Table columns={columns} rows={filtered} rowKey={(g) => g.id} emptyMessage="No groups match your filters." />
      </CardBody>
    </Card>
  );
}

// ===========================================================================
// TAB 3 — Platform Groups
// ===========================================================================
function PlatformGroupsTab({
  groups, state: _state, dispatch, setFeedback, onUpdateStatus,
}: {
  groups: Group[];
  state: any;
  dispatch: any;
  setFeedback: (m: string) => void;
  onUpdateStatus: (g: Group, s: GroupStatus) => void;
}) {
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({
    name: "", purpose: "", type: "Marketing" as string, location: "National (UK-wide)",
    sector: "All sectors", joinMethod: "open" as "open" | "request" | "invitation",
    memberLimit: "", startDate: "", endDate: "", status: "draft" as "active" | "draft",
  });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.purpose.trim()) { setFeedback("Please fill in the group name and purpose."); return; }
    dispatch({
      type: "group/create",
      owner: { id: "admin", name: "Platform Administrator" },
      input: { name: form.name.trim(), type: form.type as GroupType, purpose: form.purpose.trim(), accessType: form.joinMethod, visibility: "directory", interactionLevel: "message", pricing: "free" },
    });
    setFeedback(`Platform group "${form.name}" created!`);
    setCreateOpen(false);
    setForm({ name: "", purpose: "", type: "Marketing", location: "National (UK-wide)", sector: "All sectors", joinMethod: "open", memberLimit: "", startDate: "", endDate: "", status: "draft" });
  };

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardBody className="flex flex-col gap-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-white">Platform Groups</p>
              <p className="text-xs text-slate-400">Admin-created groups discoverable by eligible businesses based on location, sector and other criteria.</p>
            </div>
            <Button variant="primary" size="sm" onClick={() => setCreateOpen(true)}><Plus className="size-4" /> Create Platform Group</Button>
          </div>

          <div className="rounded-lg border border-sky-500/20 bg-sky-500/5 px-4 py-3">
            <div className="flex items-start gap-2.5">
              <Zap className="mt-0.5 size-4 shrink-0 text-sky-400" />
              <div>
                <p className="text-xs font-medium text-sky-300">Automatic eligibility matching</p>
                <p className="text-[11px] text-slate-400 mt-0.5">When a business updates their profile, matching active platform groups automatically appear in their "Groups to Join" dashboard. If they no longer qualify, the group is removed from recommendations. Existing membership follows the group's retention rules.</p>
              </div>
            </div>
          </div>

          {groups.length === 0 ? (
            <div className="rounded-xl border border-white/5 bg-ink-950/60 p-8 text-center">
              <Globe className="mx-auto mb-3 size-8 text-slate-600" />
              <p className="text-sm font-medium text-slate-300">No platform groups yet</p>
              <p className="mt-1 text-xs text-slate-500">Create platform-wide groups that eligible businesses can discover and join.</p>
              <Button variant="primary" size="sm" className="mt-4" onClick={() => setCreateOpen(true)}><Plus className="size-4" /> Create your first platform group</Button>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {groups.map((g) => (
                <div key={g.id} className="flex flex-col gap-3 rounded-xl border border-white/10 bg-ink-900/60 p-4 hover:border-white/20 transition-colors">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <Link to={`/admin/groups/${g.id}`} className="block truncate text-sm font-semibold text-white hover:text-gold-300 transition-colors">{g.name}</Link>
                      <p className="mt-0.5 text-[11px] text-slate-500 line-clamp-2">{g.purpose}</p>
                    </div>
                    <Badge variant={statusVariant(g.status)}>{g.status}</Badge>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    <Badge variant="gold">{g.type}</Badge>
                    {g.location?.city && <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] text-slate-400"><MapPin className="size-2.5" />{g.location.city}</span>}
                    <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] text-slate-400"><Users className="size-2.5" />{memberCountOf(g)} members</span>
                  </div>
                  <div className="flex items-center gap-1.5 border-t border-white/5 pt-2">
                    <Link to={`/admin/groups/${g.id}`} className="flex-1 rounded-md border border-white/10 bg-white/5 py-1 text-center text-[10px] text-slate-300 hover:bg-white/10 transition-colors">Edit / View</Link>
                    {g.status !== "Suspended" ? (
                      <button type="button" onClick={() => onUpdateStatus(g, "Suspended")} className="rounded-md border border-white/10 bg-white/5 px-2 py-1 text-[10px] text-rose-400 hover:bg-rose-500/10">Suspend</button>
                    ) : (
                      <button type="button" onClick={() => onUpdateStatus(g, "Active")} className="rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2 py-1 text-[10px] text-emerald-300 hover:bg-emerald-500/20">Reactivate</button>
                    )}
                    <button type="button" onClick={() => onUpdateStatus(g, "Closed")} className="rounded-md border border-white/10 bg-white/5 px-2 py-1 text-[10px] text-slate-400 hover:bg-white/10">Archive</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardBody>
      </Card>

      {createOpen && (
        <Modal open={createOpen} title="Create Platform Group" onClose={() => setCreateOpen(false)}>
          <form onSubmit={handleCreate} className="flex flex-col gap-4">
            <p className="text-xs text-slate-400 border-b border-white/10 pb-3">Platform groups are discoverable by businesses whose profile matches the eligibility criteria you set below.</p>

            <div>
              <p className="mb-2.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500">Group Identity</p>
              <div className="flex flex-col gap-3">
                <label className="flex flex-col gap-1.5">
                  <span className="text-xs font-medium text-slate-300">Group Name *</span>
                  <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. London Retail Marketing Circle" className="h-9 rounded-lg border border-white/10 bg-ink-800 px-3 text-xs text-white focus:border-gold-500/50 focus:outline-none" required />
                </label>
                <label className="flex flex-col gap-1.5">
                  <span className="text-xs font-medium text-slate-300">Purpose *</span>
                  <textarea value={form.purpose} onChange={(e) => setForm({ ...form, purpose: e.target.value })} rows={2} placeholder="Describe the group's purpose and expected benefits for members…" className="rounded-lg border border-white/10 bg-ink-800 p-3 text-xs text-white focus:border-gold-500/50 focus:outline-none" required />
                </label>
              </div>
            </div>

            <div>
              <p className="mb-2.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500">Eligibility Targeting</p>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="flex flex-col gap-1.5">
                  <span className="text-xs font-medium text-slate-300">Location</span>
                  <select value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} className="h-9 rounded-lg border border-white/10 bg-ink-800 px-3 text-xs text-slate-200 focus:border-gold-500/50 focus:outline-none">
                    {UK_LOCATIONS.map((l) => <option key={l} value={l}>{l}</option>)}
                  </select>
                </label>
                <label className="flex flex-col gap-1.5">
                  <span className="text-xs font-medium text-slate-300">Business Sector</span>
                  <select value={form.sector} onChange={(e) => setForm({ ...form, sector: e.target.value })} className="h-9 rounded-lg border border-white/10 bg-ink-800 px-3 text-xs text-slate-200 focus:border-gold-500/50 focus:outline-none">
                    <option value="All sectors">All sectors</option>
                    {SECTORS.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </label>
                <label className="flex flex-col gap-1.5">
                  <span className="text-xs font-medium text-slate-300">Group Type</span>
                  <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className="h-9 rounded-lg border border-white/10 bg-ink-800 px-3 text-xs text-slate-200 focus:border-gold-500/50 focus:outline-none">
                    <optgroup label="Mandatory Business">
                      <option value="Marketing">Marketing</option>
                      <option value="Advertising">Advertising</option>
                      <option value="Partner">Partner</option>
                    </optgroup>
                    <optgroup label="Professional">
                      <option value="Consulting">Consulting</option>
                      <option value="B2B">B2B</option>
                    </optgroup>
                    <optgroup label="Seasonal & Consumer">
                      <option value="Seasonal">Seasonal</option>
                      <option value="Customer Group">Customer Group</option>
                      <option value="Event / Expo">Event / Expo</option>
                      <option value="Affiliate">Affiliate</option>
                    </optgroup>
                  </select>
                </label>
                <label className="flex flex-col gap-1.5">
                  <span className="text-xs font-medium text-slate-300">Join Method</span>
                  <select value={form.joinMethod} onChange={(e) => setForm({ ...form, joinMethod: e.target.value as any })} className="h-9 rounded-lg border border-white/10 bg-ink-800 px-3 text-xs text-slate-200 focus:border-gold-500/50 focus:outline-none">
                    {JOIN_METHODS.map((m) => <option key={m.value} value={m.value}>{m.label} — {m.desc}</option>)}
                  </select>
                </label>
              </div>
            </div>

            <div>
              <p className="mb-2.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500">Access Period (optional)</p>
              <div className="grid gap-3 sm:grid-cols-3">
                <label className="flex flex-col gap-1.5">
                  <span className="text-xs font-medium text-slate-300">Member Limit</span>
                  <input type="number" value={form.memberLimit} onChange={(e) => setForm({ ...form, memberLimit: e.target.value })} placeholder="Unlimited" className="h-9 rounded-lg border border-white/10 bg-ink-800 px-3 text-xs text-white focus:border-gold-500/50 focus:outline-none" />
                </label>
                <label className="flex flex-col gap-1.5">
                  <span className="text-xs font-medium text-slate-300">Start Date</span>
                  <input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} className="h-9 rounded-lg border border-white/10 bg-ink-800 px-3 text-xs text-white focus:border-gold-500/50 focus:outline-none" />
                </label>
                <label className="flex flex-col gap-1.5">
                  <span className="text-xs font-medium text-slate-300">End Date</span>
                  <input type="date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} className="h-9 rounded-lg border border-white/10 bg-ink-800 px-3 text-xs text-white focus:border-gold-500/50 focus:outline-none" />
                </label>
              </div>
            </div>

            <div className="flex items-center gap-4">
              {(["draft", "active"] as const).map((s) => (
                <label key={s} className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" name="gstatus" value={s} checked={form.status === s} onChange={() => setForm({ ...form, status: s })} className="accent-gold-500" />
                  <span className="text-xs text-slate-300">{s === "draft" ? "Save as draft" : "Publish immediately"}</span>
                </label>
              ))}
            </div>

            <div className="flex justify-end gap-2 border-t border-white/10 pt-3">
              <Button variant="ghost" size="sm" type="button" onClick={() => setCreateOpen(false)}>Cancel</Button>
              <Button variant="primary" size="sm" type="submit">Create Platform Group</Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

// ===========================================================================
// TAB 4 — Business Groups
// ===========================================================================
function BusinessGroupsTab({
  groups, onApprove, onUpdateStatus, setFeedback,
}: {
  groups: Group[];
  onApprove: (g: Group) => void;
  onUpdateStatus: (g: Group, s: GroupStatus) => void;
  setFeedback: (m: string) => void;
}) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [pricingFilter, setPricingFilter] = useState("all");
  const [suspendModalOpen, setSuspendModalOpen] = useState(false);
  const [pendingTarget, setPendingTarget] = useState<Group | null>(null);
  const [suspendReason, setSuspendReason] = useState("");
  const [selectedPaidGroup, setSelectedPaidGroup] = useState<Group | null>(null);

  const filtered = useMemo(() => groups.filter((g) => {
    if (statusFilter !== "all" && g.status !== statusFilter) return false;
    if (pricingFilter === "paid" && g.pricing !== "paid") return false;
    if (pricingFilter === "free" && g.pricing === "paid") return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return g.name.toLowerCase().includes(q) || g.ownerName.toLowerCase().includes(q);
    }
    return true;
  }), [groups, search, statusFilter, pricingFilter]);

  const handleSuspend = () => {
    if (!pendingTarget) return;
    onUpdateStatus(pendingTarget, "Suspended");
    setFeedback(`${pendingTarget.name} suspended.`);
    setSuspendModalOpen(false);
    setPendingTarget(null);
    setSuspendReason("");
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-lg border border-violet-500/20 bg-violet-500/5 px-4 py-3">
        <div className="flex items-start gap-2.5">
          <Building2 className="mt-0.5 size-4 shrink-0 text-violet-400" />
          <div>
            <p className="text-xs font-medium text-violet-300">Admin oversight of business-created groups</p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Business owners can create and manage their own groups (free or paid with member contributions). Admin retains moderation, fee audit, and hierarchy oversight.
            </p>
          </div>
        </div>
      </div>

      <Card>
        <CardBody className="flex flex-col gap-4">
          <div className="grid gap-2 sm:grid-cols-4">
            <div className="relative sm:col-span-2">
              <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-slate-500" />
              <input type="text" placeholder="Search by group name or business owner…" value={search} onChange={(e) => setSearch(e.target.value)} className="h-9 w-full rounded-lg border border-white/10 bg-ink-950/70 pl-9 pr-3 text-xs text-white placeholder:text-slate-500 focus:border-gold-500/50 focus:outline-none" />
            </div>
            <select value={pricingFilter} onChange={(e) => setPricingFilter(e.target.value)} className="h-9 rounded-lg border border-white/10 bg-ink-950/70 px-3 text-xs text-slate-300 focus:border-gold-500/50 focus:outline-none">
              <option value="all">All pricing (Paid & Free)</option>
              <option value="paid">Paid groups only</option>
              <option value="free">Free groups only</option>
            </select>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="h-9 rounded-lg border border-white/10 bg-ink-950/70 px-3 text-xs text-slate-300 focus:border-gold-500/50 focus:outline-none">
              <option value="all">All statuses</option>
              <option value="Active">Active</option>
              <option value="Pending Review">Pending Review</option>
              <option value="Suspended">Suspended</option>
            </select>
          </div>

          {filtered.length === 0 ? (
            <div className="py-8 text-center">
              <Building2 className="mx-auto mb-2 size-7 text-slate-600" />
              <p className="text-sm text-slate-400">No business groups found matching these filters.</p>
            </div>
          ) : (
            <div className="flex flex-col divide-y divide-white/5">
              {filtered.map((g) => (
                <div key={g.id} className="flex flex-wrap items-center justify-between gap-3 py-3.5 first:pt-0 last:pb-0">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link to={`/admin/groups/${g.id}`} className="text-sm font-semibold text-white hover:text-gold-300 transition-colors">
                        {g.name}
                      </Link>
                      <Badge variant={statusVariant(g.status)}>{g.status}</Badge>
                      <Badge variant="info">{g.type}</Badge>
                      {g.pricing === "paid" ? (
                        <Badge variant="gold">
                          Paid · £{g.contribution ?? 0}
                          {g.contributionFrequency === "once" ? " one-off" : g.contributionFrequency ? `/${g.contributionFrequency}` : ""}
                        </Badge>
                      ) : (
                        <Badge variant="muted">Free</Badge>
                      )}
                    </div>
                    <p className="mt-1 text-[11px] text-slate-400">
                      Owner: <strong className="text-slate-200">{g.ownerName}</strong>
                      {g.location?.city ? ` · ${g.location.city}` : ""} · {memberCountOf(g)} members
                      {g.pricing === "paid" && (
                        <span className="text-gold-400 font-medium ml-1.5">
                          · Pot Target: £{(g.contribution ?? 0) * memberCountOf(g)}
                        </span>
                      )}
                    </p>
                    <p className="text-[11px] text-slate-500 truncate mt-0.5">{g.purpose}</p>
                  </div>

                  <div className="flex shrink-0 items-center gap-1.5">
                    {g.pricing === "paid" && (
                      <button
                        type="button"
                        onClick={() => setSelectedPaidGroup(g)}
                        className="inline-flex items-center gap-1 rounded-md border border-gold-500/30 bg-gold-500/10 px-2 py-1 text-[10px] font-semibold text-gold-300 hover:bg-gold-500/20 transition-colors"
                      >
                        <Banknote className="size-3" /> Paid Details
                      </button>
                    )}

                    <Link
                      to={`/admin/groups/${g.id}/members?view=circle`}
                      className="inline-flex items-center gap-1 rounded-md border border-white/10 bg-white/5 px-2 py-1 text-[10px] font-medium text-slate-300 hover:bg-white/10 transition-colors"
                    >
                      <Sparkles className="size-3 text-gold-400" /> Circle View
                    </Link>

                    {g.status === "Pending Review" && (
                      <button type="button" onClick={() => onApprove(g)} className="rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2 py-1 text-[10px] font-semibold text-emerald-300 hover:bg-emerald-500/20">
                        Approve
                      </button>
                    )}

                    {g.status !== "Suspended" ? (
                      <button type="button" onClick={() => { setPendingTarget(g); setSuspendModalOpen(true); }} className="rounded-md border border-white/10 bg-white/5 px-2 py-1 text-[10px] text-rose-400 hover:bg-rose-500/10">
                        Suspend
                      </button>
                    ) : (
                      <button type="button" onClick={() => onUpdateStatus(g, "Active")} className="rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2 py-1 text-[10px] text-emerald-300 hover:bg-emerald-500/20">
                        Reactivate
                      </button>
                    )}

                    <Link to={`/admin/groups/${g.id}`} className="rounded-md border border-white/10 bg-white/5 px-2 py-1 text-[10px] text-slate-300 hover:bg-white/10">
                      Inspect
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardBody>
      </Card>

      {/* Paid Group Details & Contribution Process Modal */}
      {selectedPaidGroup && (
        <Modal
          open={!!selectedPaidGroup}
          title={`${selectedPaidGroup.name} — Paid Contribution Details`}
          onClose={() => setSelectedPaidGroup(null)}
        >
          <div className="flex flex-col gap-4 max-h-[80vh] overflow-y-auto pr-1">
            <AdminGroupContributionCard group={selectedPaidGroup} showHeader={true} />
            <div className="flex justify-between items-center border-t border-white/10 pt-3">
              <Link
                to={`/admin/groups/${selectedPaidGroup.id}/members?view=circle`}
                className="inline-flex items-center gap-1.5 text-xs text-gold-300 hover:underline"
              >
                <Sparkles className="size-3.5" /> View Members Circle (Owner at Center)
              </Link>
              <Button variant="ghost" size="sm" onClick={() => setSelectedPaidGroup(null)}>
                Close
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {suspendModalOpen && pendingTarget && (
        <Modal open={suspendModalOpen} title={`Suspend: ${pendingTarget.name}`} onClose={() => setSuspendModalOpen(false)}>
          <div className="flex flex-col gap-4">
            <p className="text-xs text-slate-400">Suspending this group will stop it from accepting new members or invitations. Existing members will see a suspension notice.</p>
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-medium text-slate-300">Reason for suspension</span>
              <textarea rows={3} value={suspendReason} onChange={(e) => setSuspendReason(e.target.value)} placeholder="Provide a reason for the admin audit trail…" className="rounded-lg border border-white/10 bg-ink-800 p-3 text-xs text-white focus:border-rose-500/50 focus:outline-none" />
            </label>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={() => setSuspendModalOpen(false)}>Cancel</Button>
              <button type="button" onClick={handleSuspend} className="rounded-lg bg-rose-500/20 border border-rose-500/30 px-4 py-1.5 text-xs font-semibold text-rose-300 hover:bg-rose-500/30 transition-colors">Confirm Suspension</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ===========================================================================
// TAB 5 — Members & Invitations
// ===========================================================================
function MembersInvitationsTab({
  groups, invitations, dispatch, setFeedback,
}: {
  groups: Group[];
  invitations: Invitation[];
  dispatch: any;
  setFeedback: (m: string) => void;
}) {
  const [subTab, setSubTab] = useState<"members" | "invitations" | "join-requests">("members");
  const [search, setSearch] = useState("");
  const [invStatusFilter, setInvStatusFilter] = useState("all");

  const allMembers = useMemo(() => {
    const result: { memberId: string; groupName: string; groupId: string }[] = [];
    groups.forEach((g) => g.memberIds.forEach((mid) => result.push({ memberId: mid, groupName: g.name, groupId: g.id })));
    return result;
  }, [groups]);

  const filteredInvitations = useMemo(() => {
    return invitations.filter((inv) => {
      if (invStatusFilter !== "all" && inv.status !== invStatusFilter) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        return inv.inviteeName.toLowerCase().includes(q) || inv.invitedByName.toLowerCase().includes(q) || (inv.inviteeEmail ?? "").toLowerCase().includes(q);
      }
      return true;
    });
  }, [invitations, invStatusFilter, search]);

  const joinRequests = useMemo(() => invitations.filter((i) => i.kind === "request" && i.status === "pending"), [invitations]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-1">
        {[
          { id: "members" as const, label: `Members (${allMembers.length})` },
          { id: "invitations" as const, label: `Invitations (${invitations.length})` },
          { id: "join-requests" as const, label: `Join Requests (${joinRequests.length})` },
        ].map((t) => (
          <button key={t.id} type="button" onClick={() => setSubTab(t.id)} className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${subTab === t.id ? "bg-gold-500/15 text-gold-300 border border-gold-500/30" : "text-slate-400 hover:bg-white/5 hover:text-white"}`}>{t.label}</button>
        ))}
      </div>

      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-slate-500" />
        <input type="text" placeholder={subTab === "members" ? "Search member ID…" : "Search by name or email…"} value={search} onChange={(e) => setSearch(e.target.value)} className="h-9 w-full max-w-sm rounded-lg border border-white/10 bg-ink-950/70 pl-9 pr-3 text-xs text-white placeholder:text-slate-500 focus:border-gold-500/50 focus:outline-none" />
      </div>

      {subTab === "members" && (
        <Card>
          <CardBody>
            {allMembers.length === 0 ? (
              <p className="py-6 text-center text-sm text-slate-400">No members across any group.</p>
            ) : (
              <div className="flex flex-col divide-y divide-white/5">
                {allMembers.filter((m) => !search || m.memberId.toLowerCase().includes(search.toLowerCase())).slice(0, 50).map((m, idx) => (
                  <div key={`${m.memberId}-${m.groupId}-${idx}`} className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="flex size-8 items-center justify-center rounded-full bg-gradient-to-br from-gold-500/20 to-amber-600/20 text-xs font-bold text-gold-300 shrink-0">{m.memberId.slice(0, 2).toUpperCase()}</div>
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-white">{m.memberId}</p>
                        <p className="text-[11px] text-slate-500">Group: {m.groupName}</p>
                      </div>
                    </div>
                    <Link to={`/admin/groups/${m.groupId}/members`} className="text-[10px] text-gold-400 hover:text-gold-300 shrink-0">View group</Link>
                  </div>
                ))}
              </div>
            )}
          </CardBody>
        </Card>
      )}

      {subTab === "invitations" && (
        <Card>
          <CardBody className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center gap-1.5">
              {["all", "pending", "accepted", "declined", "cancelled"].map((s) => (
                <button key={s} type="button" onClick={() => setInvStatusFilter(s)} className={`rounded-full px-2.5 py-1 text-[10px] font-medium capitalize transition-colors ${invStatusFilter === s ? "bg-gold-500/15 text-gold-300" : "bg-white/5 text-slate-400 hover:text-white"}`}>{s}</button>
              ))}
            </div>
            {filteredInvitations.length === 0 ? (
              <p className="py-6 text-center text-sm text-slate-400">No invitations match your filters.</p>
            ) : (
              <div className="flex flex-col divide-y divide-white/5">
                {filteredInvitations.slice(0, 50).map((inv) => (
                  <div key={inv.id} className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="text-xs font-medium text-white">{inv.inviteeName}</span>
                        <Badge variant={invStatusVariant(inv.status)}>{inv.status}</Badge>
                        {inv.inviteeRole && <Badge variant="muted">{inv.inviteeRole}</Badge>}
                      </div>
                      <p className="mt-0.5 text-[11px] text-slate-500">{inv.inviteeEmail && `${inv.inviteeEmail} · `}Invited by {inv.invitedByName} · {new Date(inv.createdAt).toLocaleDateString()}</p>
                    </div>
                    <div className="flex shrink-0 items-center gap-1.5">
                      {inv.status === "pending" && (
                        <button type="button" onClick={() => { dispatch({ type: "invitation/cancel", invitationId: inv.id, actor: ADMIN_ACTOR }); setFeedback(`Invitation to ${inv.inviteeName} revoked.`); }} className="rounded-md border border-white/10 bg-white/5 px-2 py-1 text-[10px] text-rose-400 hover:bg-rose-500/10">Revoke</button>
                      )}
                      {inv.groupId && <Link to={`/admin/groups/${inv.groupId}`} className="text-[10px] text-gold-400 hover:text-gold-300">View group</Link>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardBody>
        </Card>
      )}

      {subTab === "join-requests" && (
        <Card>
          <CardBody>
            {joinRequests.length === 0 ? (
              <div className="py-8 text-center">
                <CheckCircle className="mx-auto mb-2 size-6 text-emerald-400" />
                <p className="text-sm text-slate-400">No pending join requests</p>
              </div>
            ) : (
              <div className="flex flex-col divide-y divide-white/5">
                {joinRequests.map((req) => (
                  <div key={req.id} className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0">
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-white">{req.inviteeName}</p>
                      <p className="text-[11px] text-slate-500">{req.inviteeEmail} · Requested {new Date(req.createdAt).toLocaleDateString()}</p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button type="button" className="rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2 py-1 text-[10px] text-emerald-300 hover:bg-emerald-500/20" onClick={() => setFeedback(`Join request from ${req.inviteeName} approved`)}>Approve</button>
                      <button type="button" className="rounded-md border border-white/10 bg-white/5 px-2 py-1 text-[10px] text-rose-400 hover:bg-rose-500/10" onClick={() => setFeedback(`Join request from ${req.inviteeName} declined`)}>Decline</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardBody>
        </Card>
      )}

      <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 px-3 py-2.5">
        <p className="text-[11px] text-amber-300/80"><strong>Note:</strong> Removing a member from a group does not delete their platform account or remove them from unrelated groups. Removal affects only this group membership.</p>
      </div>
    </div>
  );
}

// ===========================================================================
// TAB 6 — Access Rules
// ===========================================================================
function AccessRulesTab({ setFeedback }: { setFeedback: (m: string) => void }) {
  const [eligibilityMode, setEligibilityMode] = useState<"location" | "sector" | "membership">("location");

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-lg border border-sky-500/20 bg-sky-500/5 px-4 py-3">
        <div className="flex items-start gap-2.5">
          <Shield className="mt-0.5 size-4 shrink-0 text-sky-400" />
          <div>
            <p className="text-xs font-medium text-sky-300">Centralised eligibility and access rules</p>
            <p className="text-[11px] text-slate-400 mt-0.5">Configure who can discover, join and remain in each group. Eligibility matching updates automatically when a business changes their profile. Existing membership follows the group's defined retention rules rather than automatic removal.</p>
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardBody className="flex flex-col gap-4">
            <div className="flex items-center gap-2">
              <div className="flex size-8 items-center justify-center rounded-lg bg-gold-500/10"><UserCheck className="size-4 text-gold-400" /></div>
              <div>
                <p className="text-sm font-semibold text-white">Eligibility Matching</p>
                <p className="text-xs text-slate-400">Criteria for discovering platform groups</p>
              </div>
            </div>
            <div className="flex gap-1">
              {(["location", "sector", "membership"] as const).map((m) => (
                <button key={m} type="button" onClick={() => setEligibilityMode(m)} className={`flex-1 rounded-lg py-1.5 text-xs font-medium capitalize transition-colors ${eligibilityMode === m ? "bg-gold-500/15 text-gold-300" : "text-slate-400 hover:text-white hover:bg-white/5"}`}>{m}</button>
              ))}
            </div>
            {eligibilityMode === "location" && (
              <div className="flex flex-col gap-2">
                {["National (UK-wide)", "City-level", "Local area / borough", "High street / postcode"].map((l) => (
                  <label key={l} className="flex items-center gap-2.5 cursor-pointer"><input type="checkbox" defaultChecked className="accent-gold-500 size-3.5" /><span className="text-xs text-slate-300">{l}</span></label>
                ))}
              </div>
            )}
            {eligibilityMode === "sector" && (
              <div className="grid grid-cols-2 gap-2">
                {SECTORS.map((s) => (<label key={s} className="flex items-center gap-2 cursor-pointer"><input type="checkbox" defaultChecked className="accent-gold-500 size-3.5" /><span className="text-xs text-slate-300 truncate">{s}</span></label>))}
              </div>
            )}
            {eligibilityMode === "membership" && (
              <div className="flex flex-col gap-2">
                {["Any registered business", "Bronze and above", "Silver and above", "Gold and above", "Platinum only"].map((m, i) => (
                  <label key={m} className="flex items-center gap-2.5 cursor-pointer"><input type="radio" name="memLevel" className="accent-gold-500 size-3.5" defaultChecked={i === 0} /><span className="text-xs text-slate-300">{m}</span></label>
                ))}
              </div>
            )}
            <button type="button" onClick={() => setFeedback("Eligibility rules saved.")} className="mt-auto rounded-lg bg-gold-500/10 border border-gold-500/20 py-2 text-xs font-medium text-gold-300 hover:bg-gold-500/20 transition-colors">Save eligibility rules</button>
          </CardBody>
        </Card>

        <Card>
          <CardBody className="flex flex-col gap-4">
            <div className="flex items-center gap-2">
              <div className="flex size-8 items-center justify-center rounded-lg bg-violet-500/10"><UserPlus className="size-4 text-violet-400" /></div>
              <div>
                <p className="text-sm font-semibold text-white">Join Methods</p>
                <p className="text-xs text-slate-400">Default joining behaviour for new groups</p>
              </div>
            </div>
            <div className="flex flex-col gap-3">
              {JOIN_METHODS.map((m) => (
                <label key={m.value} className="flex items-start gap-3 cursor-pointer rounded-lg border border-white/5 bg-ink-900/40 p-3 hover:border-white/10 transition-colors">
                  <input type="radio" name="joinDefault" value={m.value} defaultChecked={m.value === "request"} className="accent-gold-500 mt-0.5 size-3.5 shrink-0" />
                  <div>
                    <p className="text-xs font-medium text-white">{m.label}</p>
                    <p className="text-[11px] text-slate-500">{m.desc}</p>
                  </div>
                </label>
              ))}
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardBody className="flex flex-col gap-4">
            <div className="flex items-center gap-2">
              <div className="flex size-8 items-center justify-center rounded-lg bg-amber-500/10"><Clock className="size-4 text-amber-400" /></div>
              <div>
                <p className="text-sm font-semibold text-white">Temporary Access Durations</p>
                <p className="text-xs text-slate-400">Duration options available for limited-access groups</p>
              </div>
            </div>
            <div className="flex flex-col gap-2">
              {["7 days", "14 days", "30 days", "90 days", "Custom duration"].map((d) => (
                <label key={d} className="flex items-center gap-2.5 cursor-pointer"><input type="checkbox" defaultChecked={["7 days", "14 days"].includes(d)} className="accent-gold-500 size-3.5" /><span className="text-xs text-slate-300">{d}</span></label>
              ))}
            </div>
            <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 px-3 py-2">
              <p className="text-[11px] text-amber-300/80">Temporary access durations and their relationship to paid membership must be confirmed with the platform owner before enabling.</p>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardBody className="flex flex-col gap-4">
            <div className="flex items-center gap-2">
              <div className="flex size-8 items-center justify-center rounded-lg bg-rose-500/10"><RefreshCw className="size-4 text-rose-400" /></div>
              <div>
                <p className="text-sm font-semibold text-white">Expiry & Retention Rules</p>
                <p className="text-xs text-slate-400">What happens when eligibility changes or access expires</p>
              </div>
            </div>
            <div className="flex flex-col gap-3">
              {[
                { title: "On eligibility loss", desc: "Remove from recommendations only — existing membership retained until further review", recommended: true },
                { title: "On access expiry", desc: "Notify member 7 days before expiry, then archive membership", recommended: true },
                { title: "Re-entry after expiry", desc: "Allow if the business re-qualifies at the time of re-application", recommended: false },
              ].map((rule) => (
                <div key={rule.title} className="rounded-lg border border-white/5 bg-ink-900/40 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-medium text-white">{rule.title}</p>
                    {rule.recommended && <Badge variant="gold">Recommended</Badge>}
                  </div>
                  <p className="mt-1 text-[11px] text-slate-500">{rule.desc}</p>
                </div>
              ))}
            </div>
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardBody className="flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <div className="flex size-8 items-center justify-center rounded-lg bg-emerald-500/10"><ShieldCheck className="size-4 text-emerald-400" /></div>
            <div>
              <p className="text-sm font-semibold text-white">Business Group Creation Permissions</p>
              <p className="text-xs text-slate-400">Control which business owners can create their own groups on the platform</p>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            {[
              { label: "All business owners", desc: "Any registered business can create groups" },
              { label: "Verified businesses only", desc: "Business must be verified before creating groups" },
              { label: "Gold & Platinum members", desc: "Restricted to premium membership tiers" },
            ].map((opt, i) => (
              <label key={opt.label} className="flex cursor-pointer flex-col gap-1 rounded-lg border border-white/5 bg-ink-900/40 p-3 hover:border-white/10 transition-colors">
                <div className="flex items-center gap-2">
                  <input type="radio" name="bizCreate" defaultChecked={i === 1} className="accent-gold-500 size-3.5 shrink-0" />
                  <span className="text-xs font-medium text-white">{opt.label}</span>
                </div>
                <p className="pl-5 text-[11px] text-slate-500">{opt.desc}</p>
              </label>
            ))}
          </div>
          <div className="flex justify-end">
            <button type="button" onClick={() => setFeedback("Access rules saved.")} className="rounded-lg bg-gold-500/10 border border-gold-500/20 px-4 py-2 text-xs font-medium text-gold-300 hover:bg-gold-500/20 transition-colors">Save access rules</button>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}

// ===========================================================================
// TAB 7 — Reports & Activity
// ===========================================================================
function ReportsTab({
  groups, invitations, adminGroups, businessGroups, activeGroups, suspendedGroups,
}: {
  groups: Group[];
  invitations: Invitation[];
  adminGroups: Group[];
  businessGroups: Group[];
  activeGroups: Group[];
  suspendedGroups: Group[];
}) {
  const [dateRange, setDateRange] = useState("30d");

  const acceptedInv = invitations.filter((i) => i.status === "accepted");
  const pendingInv = invitations.filter((i) => i.status === "pending");
  const declinedInv = invitations.filter((i) => i.status === "declined");

  const byType = useMemo(() => {
    const map: Record<string, number> = {};
    groups.forEach((g) => { map[g.type] = (map[g.type] ?? 0) + 1; });
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [groups]);

  const byLocation = useMemo(() => {
    const map: Record<string, number> = {};
    groups.forEach((g) => { const loc = g.location?.city ?? "No location set"; map[loc] = (map[loc] ?? 0) + 1; });
    return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 6);
  }, [groups]);

  const lowParticipation = groups.filter((g) => memberCountOf(g) < 2 && g.status === "Active");

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold text-white">Reports & Platform Activity</p>
        <div className="flex items-center gap-1">
          {["7d", "30d", "90d", "all"].map((r) => (
            <button key={r} type="button" onClick={() => setDateRange(r)} className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${dateRange === r ? "bg-gold-500/15 text-gold-300 border border-gold-500/30" : "text-slate-400 hover:text-white hover:bg-white/5"}`}>{r === "all" ? "All time" : `Last ${r}`}</button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <StatCard label="Platform Groups" value={adminGroups.length} hint="Admin-created" accent="gold" />
        <StatCard label="Business Groups" value={businessGroups.length} hint="Owner-created" accent="info" />
        <StatCard label="Active Groups" value={activeGroups.length} hint="Currently active" accent="success" />
        <StatCard label="Suspended" value={suspendedGroups.length} hint="Under restriction" accent={suspendedGroups.length > 0 ? "danger" : undefined} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardBody className="flex flex-col gap-4">
            <div className="flex items-center gap-2"><Mail className="size-4 text-gold-400" /><p className="text-sm font-semibold text-white">Invitation Activity</p></div>
            <div className="flex flex-col gap-2">
              {[
                { label: "Total sent", value: invitations.length, color: "text-white" },
                { label: "Accepted", value: acceptedInv.length, color: "text-emerald-400" },
                { label: "Pending", value: pendingInv.length, color: "text-amber-400" },
                { label: "Declined / Cancelled", value: declinedInv.length, color: "text-rose-400" },
              ].map((row) => (
                <div key={row.label} className="flex items-center justify-between">
                  <span className="text-xs text-slate-400">{row.label}</span>
                  <span className={`text-sm font-semibold ${row.color}`}>{row.value}</span>
                </div>
              ))}
            </div>
            {invitations.length > 0 && (
              <>
                <div className="h-2 overflow-hidden rounded-full bg-white/10">
                  <div className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-emerald-400 transition-all" style={{ width: `${Math.round((acceptedInv.length / invitations.length) * 100)}%` }} />
                </div>
                <p className="text-[11px] text-slate-500">Acceptance rate: {Math.round((acceptedInv.length / invitations.length) * 100)}%</p>
              </>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardBody className="flex flex-col gap-4">
            <div className="flex items-center gap-2"><Tag className="size-4 text-gold-400" /><p className="text-sm font-semibold text-white">Groups by Type</p></div>
            <div className="flex flex-col gap-2">
              {byType.map(([type, count]) => {
                const pct = groups.length ? Math.round((count / groups.length) * 100) : 0;
                return (
                  <div key={type} className="flex flex-col gap-1">
                    <div className="flex items-center justify-between text-[11px]"><span className="text-slate-400">{type}</span><span className="font-medium text-white">{count}</span></div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-gradient-to-r from-gold-500 to-amber-400 transition-all" style={{ width: `${pct}%` }} /></div>
                  </div>
                );
              })}
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardBody className="flex flex-col gap-4">
            <div className="flex items-center gap-2"><MapPin className="size-4 text-gold-400" /><p className="text-sm font-semibold text-white">Groups by Location</p></div>
            {byLocation.length === 0 ? (
              <p className="text-xs text-slate-400">No location data available.</p>
            ) : (
              <div className="flex flex-col gap-2">
                {byLocation.map(([loc, count]) => (
                  <div key={loc} className="flex items-center justify-between">
                    <span className="text-xs text-slate-400">{loc}</span>
                    <span className="text-xs font-semibold text-white">{count}</span>
                  </div>
                ))}
              </div>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardBody className="flex flex-col gap-4">
            <div className="flex items-center gap-2"><ShieldAlert className="size-4 text-gold-400" /><p className="text-sm font-semibold text-white">Moderation Summary</p></div>
            <div className="flex flex-col gap-2">
              {[
                { label: "Groups suspended", value: suspendedGroups.length },
                { label: "Pending review", value: groups.filter((g) => g.status === "Pending Review").length },
                { label: "Closed / archived", value: groups.filter((g) => g.status === "Closed").length },
              ].map((row) => (
                <div key={row.label} className="flex items-center justify-between rounded-lg border border-white/5 bg-ink-900/40 px-3 py-2">
                  <span className="text-xs text-slate-400">{row.label}</span>
                  <span className="text-sm font-bold text-white">{row.value}</span>
                </div>
              ))}
            </div>
            <div className="flex justify-end">
              <Link to="/admin/audit-log" className="text-xs text-gold-400 hover:text-gold-300 flex items-center gap-1">View full audit log <ArrowRight className="size-3" /></Link>
            </div>
          </CardBody>
        </Card>
      </div>

      {lowParticipation.length > 0 && (
        <Card>
          <CardBody>
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="size-4 text-amber-400" />
              <p className="text-sm font-semibold text-amber-300">Low-participation groups ({lowParticipation.length})</p>
            </div>
            <p className="text-xs text-slate-400 mb-3">These active groups have fewer than 2 members and may need attention or archiving.</p>
            <div className="flex flex-col gap-1.5">
              {lowParticipation.slice(0, 5).map((g) => (
                <div key={g.id} className="flex items-center justify-between gap-3 rounded-lg border border-white/5 bg-ink-900/40 px-3 py-2">
                  <div>
                    <p className="text-xs font-medium text-white">{g.name}</p>
                    <p className="text-[11px] text-slate-500">{g.type} · {memberCountOf(g)} member(s)</p>
                  </div>
                  <Link to={`/admin/groups/${g.id}`} className="text-[10px] text-gold-400 hover:text-gold-300">Review</Link>
                </div>
              ))}
            </div>
          </CardBody>
        </Card>
      )}

      <div className="flex justify-end gap-2">
        <button type="button" className="rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-xs text-slate-300 hover:bg-white/10 transition-colors">Export groups CSV</button>
        <button type="button" className="rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-xs text-slate-300 hover:bg-white/10 transition-colors">Export invitations CSV</button>
      </div>
    </div>
  );
}
