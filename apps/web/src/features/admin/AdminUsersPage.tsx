import { useState, useMemo } from "react";
import {
  Ban,
  Search,
  ShieldCheck,
} from "lucide-react";
import Badge, { type BadgeVariant } from "../../components/ui/Badge";
import Card, { CardBody } from "../../components/ui/Card";
import SectionHeader from "../../components/ui/SectionHeader";
import StatCard from "../../components/ui/StatCard";
import Table, { type TableColumn } from "../../components/ui/Table";
import Toast from "../../components/ui/Toast";
import { useAppState } from "../../store/selectors";

export type AdminUserRole = "business" | "consumer" | "business-invitee" | "admin";
export type AdminUserStatus = "Active" | "Pending" | "Suspended";

interface UnifiedUser {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: AdminUserRole;
  status: AdminUserStatus;
  verified: boolean;
  registeredAt: string;
  source: "business-directory" | "invitation-onboarding" | "seeded";
}

const ROLE_VARIANTS: Record<AdminUserRole, BadgeVariant> = {
  business: "gold",
  consumer: "info",
  "business-invitee": "default",
  admin: "warning",
};

const ROLE_LABELS: Record<AdminUserRole, string> = {
  business: "Business Owner",
  consumer: "Consumer",
  "business-invitee": "Invited Business",
  admin: "Administrator",
};

export default function AdminUsersPage() {
  const state = useAppState();

  const [activeTab, setActiveTab] = useState<"all" | "business" | "consumer" | "registrations">("all");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [feedback, setFeedback] = useState<string | null>(null);

  // Local overrides for status / verified toggles in demo
  const [statusOverrides, setStatusOverrides] = useState<Record<string, AdminUserStatus>>({});
  const [verifiedOverrides, setVerifiedOverrides] = useState<Record<string, boolean>>({});

  // Merge platform accounts + businesses into a unified list
  const unifiedUsers = useMemo<UnifiedUser[]>(() => {
    const list: UnifiedUser[] = [];

    // 1. Business directory accounts
    for (const b of state.businesses) {
      list.push({
        id: b.id,
        name: b.name,
        email: b.email,
        phone: b.phone,
        role: "business",
        status: (b.status === "Closed" ? "Suspended" : b.status) as AdminUserStatus,
        verified: b.verified,
        registeredAt: b.joinedAt,
        source: "business-directory",
      });
    }

    // 2. Platform accounts (created via invitation onboarding or seeded)
    for (const a of state.accounts) {
      // Don't duplicate if already in businesses
      if (!list.some((u) => u.email.toLowerCase() === a.email.toLowerCase())) {
        list.push({
          id: a.id,
          name: a.name,
          email: a.email,
          phone: a.phone,
          role: a.role as AdminUserRole,
          status: "Active",
          verified: true,
          registeredAt: a.createdAt.slice(0, 10),
          source: "invitation-onboarding",
        });
      }
    }

    // 3. Demo Admin account
    list.push({
      id: "admin-root",
      name: "Platform Administrator",
      email: "admin@centralsolution.demo",
      role: "admin",
      status: "Active",
      verified: true,
      registeredAt: "2026-01-01",
      source: "seeded",
    });

    return list;
  }, [state.businesses, state.accounts]);

  // Apply filters
  const filteredUsers = useMemo(() => {
    return unifiedUsers
      .map((user) => ({
        ...user,
        status: statusOverrides[user.id] ?? user.status,
        verified: verifiedOverrides[user.id] ?? user.verified,
      }))
      .filter((user) => {
        // Tab filter
        if (activeTab === "business" && user.role !== "business") return false;
        if (activeTab === "consumer" && user.role !== "consumer") return false;
        if (activeTab === "registrations" && user.source !== "invitation-onboarding") return false;

        // Dropdown filters
        if (statusFilter !== "all" && user.status !== statusFilter) return false;
        if (roleFilter !== "all" && user.role !== roleFilter) return false;

        // Search query
        if (search.trim()) {
          const q = search.toLowerCase();
          const matchName = user.name.toLowerCase().includes(q);
          const matchEmail = user.email.toLowerCase().includes(q);
          const matchPhone = user.phone ? user.phone.includes(q) : false;
          if (!matchName && !matchEmail && !matchPhone) return false;
        }

        return true;
      });
  }, [unifiedUsers, activeTab, statusFilter, roleFilter, search, statusOverrides, verifiedOverrides]);

  const toggleStatus = (user: UnifiedUser) => {
    const current = statusOverrides[user.id] ?? user.status;
    const next: AdminUserStatus = current === "Active" ? "Suspended" : "Active";
    setStatusOverrides((prev) => ({ ...prev, [user.id]: next }));
    setFeedback(`${user.name} status updated to ${next}`);
  };

  const toggleVerified = (user: UnifiedUser) => {
    const current = verifiedOverrides[user.id] ?? user.verified;
    setVerifiedOverrides((prev) => ({ ...prev, [user.id]: !current }));
    setFeedback(`${user.name} verification toggled`);
  };

  const businessCount = unifiedUsers.filter((u) => u.role === "business").length;
  const consumerCount = unifiedUsers.filter((u) => u.role === "consumer").length;
  const registrationCount = unifiedUsers.filter((u) => u.source === "invitation-onboarding").length;

  const columns: TableColumn<UnifiedUser>[] = [
    {
      key: "name",
      header: "User / Account",
      render: (u) => (
        <div className="flex items-center gap-2.5">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-ink-800 text-xs font-bold text-gold-400">
            {u.name.slice(0, 1).toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="truncate text-xs font-semibold text-white">{u.name}</p>
            <p className="truncate text-[11px] text-slate-500">{u.email}</p>
          </div>
        </div>
      ),
    },
    {
      key: "role",
      header: "Role",
      render: (u) => <Badge variant={ROLE_VARIANTS[u.role]}>{ROLE_LABELS[u.role]}</Badge>,
    },
    {
      key: "status",
      header: "Status",
      render: (u) => {
        const s = statusOverrides[u.id] ?? u.status;
        return (
          <span
            className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
              s === "Active"
                ? "bg-emerald-500/15 text-emerald-300"
                : s === "Pending"
                  ? "bg-amber-500/15 text-amber-300"
                  : "bg-rose-500/15 text-rose-300"
            }`}
          >
            {s}
          </span>
        );
      },
    },
    {
      key: "phone",
      header: "Mobile",
      render: (u) => <span className="text-slate-400 text-xs">{u.phone ?? "—"}</span>,
    },
    {
      key: "verified",
      header: "Verified",
      render: (u) => {
        const v = verifiedOverrides[u.id] ?? u.verified;
        return v ? (
          <span className="inline-flex items-center gap-1 text-[11px] text-emerald-300">
            <ShieldCheck className="size-3" /> Yes
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 text-[11px] text-slate-500">
            <Ban className="size-3" /> No
          </span>
        );
      },
    },
    {
      key: "registeredAt",
      header: "Registered",
      render: (u) => <span className="text-slate-400 text-xs">{u.registeredAt}</span>,
    },
    {
      key: "actions",
      header: "Actions",
      align: "right",
      render: (u) => {
        if (u.role === "admin") return <span className="text-[10px] text-slate-500">Protected</span>;
        const s = statusOverrides[u.id] ?? u.status;
        return (
          <div className="flex items-center justify-end gap-1.5">
            <button
              type="button"
              onClick={() => toggleStatus(u)}
              className={`rounded-lg border px-2.5 py-1 text-[10px] font-medium transition-colors ${
                s === "Active"
                  ? "border-rose-500/30 bg-rose-500/10 text-rose-300 hover:bg-rose-500/20"
                  : "border-emerald-500/30 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20"
              }`}
            >
              {s === "Active" ? "Suspend" : "Activate"}
            </button>
            <button
              type="button"
              onClick={() => toggleVerified(u)}
              className="rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-[10px] text-slate-400 hover:bg-white/10 hover:text-white"
            >
              Verify
            </button>
          </div>
        );
      },
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <SectionHeader
        title="Users — Business Owners & Consumers"
        subtitle="View and manage business-owner accounts, consumer accounts, registrations, account status and user roles."
        tip="Role boundaries are strictly preserved: consumers invited to groups cannot assume business or admin rights."
      />

      {/* --- Stat Cards ------------------------------------------------ */}
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <StatCard
          label="Total users"
          value={unifiedUsers.length}
          hint="All registered platform entities"
          accent="gold"
        />
        <StatCard
          label="Business owners"
          value={businessCount}
          hint="With group creation capabilities"
          accent="gold"
        />
        <StatCard
          label="Consumers"
          value={consumerCount}
          hint="Group participants without owner rights"
          accent="info"
        />
        <StatCard
          label="Onboarding signups"
          value={registrationCount}
          hint="Joined via invitation links"
          accent="success"
        />
      </div>

      {/* --- Role Separation Guardrail Card ------------------------------- */}
      <div className="flex items-start gap-3 rounded-xl border border-info-500/30 bg-info-500/10 p-4">
        <ShieldCheck className="mt-0.5 size-5 shrink-0 text-info-400" />
        <div>
          <p className="text-xs font-semibold text-info-300">
            Role & Permission Separation Principle
          </p>
          <p className="mt-1 text-[11px] leading-relaxed text-slate-300">
            Every user account belongs to a verified tier. When a business owner invites consumers
            into a customer or Friends &amp; Family group, the invited consumers join as{" "}
            <strong>Consumer members only</strong>. They never become group owners, never gain
            business dashboard access, and never receive administrator privileges.
          </p>
        </div>
      </div>

      {/* --- Tabs & Filter Controls --------------------------------------- */}
      <Card>
        <CardBody className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-3">
            <div className="flex flex-wrap items-center gap-1.5">
              <TabButton
                label="All Users"
                count={unifiedUsers.length}
                active={activeTab === "all"}
                onClick={() => setActiveTab("all")}
              />
              <TabButton
                label="Business Owners"
                count={businessCount}
                active={activeTab === "business"}
                onClick={() => setActiveTab("business")}
              />
              <TabButton
                label="Consumers"
                count={consumerCount}
                active={activeTab === "consumer"}
                onClick={() => setActiveTab("consumer")}
              />
              <TabButton
                label="Invitation Registrations"
                count={registrationCount}
                active={activeTab === "registrations"}
                onClick={() => setActiveTab("registrations")}
              />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-3 size-4 text-slate-500" />
              <input
                type="text"
                placeholder="Search by name, email or phone..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-10 w-full rounded-lg border border-white/10 bg-ink-950/70 pl-9 pr-3 text-xs text-white placeholder:text-slate-500 focus:border-gold-500/50 focus:outline-none"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-10 rounded-lg border border-white/10 bg-ink-950/70 px-3 text-xs text-slate-300 focus:border-gold-500/50 focus:outline-none"
            >
              <option value="all">All statuses</option>
              <option value="Active">Active</option>
              <option value="Pending">Pending</option>
              <option value="Suspended">Suspended</option>
            </select>

            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="h-10 rounded-lg border border-white/10 bg-ink-950/70 px-3 text-xs text-slate-300 focus:border-gold-500/50 focus:outline-none"
            >
              <option value="all">All roles</option>
              <option value="business">Business Owners</option>
              <option value="consumer">Consumers</option>
              <option value="business-invitee">Invited Businesses</option>
              <option value="admin">Administrators</option>
            </select>

            <div className="flex items-center justify-end text-xs text-slate-500">
              Showing {filteredUsers.length} of {unifiedUsers.length}
            </div>
          </div>

          <Table
            columns={columns}
            rows={filteredUsers}
            rowKey={(u) => u.id}
            emptyMessage="No accounts match your selected filters."
          />
        </CardBody>
      </Card>

      {feedback && <Toast message={feedback} onDismiss={() => setFeedback(null)} />}
    </div>
  );
}

function TabButton({
  label,
  count,
  active,
  onClick,
}: {
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
        active
          ? "bg-gold-500/15 text-gold-300 border border-gold-500/30"
          : "text-slate-400 hover:bg-white/5 hover:text-white"
      }`}
    >
      <span>{label}</span>
      <span
        className={`rounded-full px-1.5 py-0.2 text-[10px] ${
          active ? "bg-gold-500/20 text-gold-200" : "bg-white/10 text-slate-400"
        }`}
      >
        {count}
      </span>
    </button>
  );
}
