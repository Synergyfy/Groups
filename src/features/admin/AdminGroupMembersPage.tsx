import { useState } from "react";
import { useParams } from "react-router-dom";
import { UserMinus, UserPlus } from "lucide-react";
import Badge from "../../components/ui/Badge";
import Card, { CardBody, CardTitle } from "../../components/ui/Card";
import FieldHint from "../../components/ui/FieldHint";
import StatCard from "../../components/ui/StatCard";
import Table from "../../components/ui/Table";
import TipIcon from "../../components/ui/TipIcon";
import Toast from "../../components/ui/Toast";
import type { TableColumn } from "../../components/ui/Table";
import { findDirectoryEntry } from "../../data/businessData";
import { useAppState, useGroup } from "../../store/selectors";
import { useAppStore } from "../../store/context";
import { useDemoLoading } from "../../lib/demoDelay";
import { SkeletonCard, SkeletonRows } from "../../components/ui/Skeleton";
import { memberCountOf } from "../groups/groupUtils";
import AdminGroupTabsHeader, { AdminGroupMissingState } from "./AdminGroupTabsHeader";

const ADMIN_ACTOR = { id: "admin", name: "Administrator" };

interface MemberRow {
  id: string;
  name: string;
  contactName: string;
  category: string;
  city: string;
  role: "Owner" | "Member";
}

export default function AdminGroupMembersPage() {
  const { groupId } = useParams();
  const group = useGroup(groupId);
  const state = useAppState();
  const { dispatch } = useAppStore();
  const loading = useDemoLoading();
  const [feedback, setFeedback] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [addSearch, setAddSearch] = useState("");

  if (loading) {
    return (
      <div className="flex flex-col gap-4">
        <SkeletonCard />
        <SkeletonRows rows={6} />
      </div>
    );
  }

  if (!group) {
    return (
      <AdminGroupMissingState
        title="Admin Group Members"
        description="Full member register with add and remove controls."
      />
    );
  }

  const rows: MemberRow[] = group.memberIds.map((id) => {
    const entry = findDirectoryEntry(id);
    return {
      id,
      name: entry.name,
      contactName: entry.contactName,
      category: entry.category,
      city: entry.city,
      role: id === group.ownerId ? "Owner" : "Member",
    };
  });

  const cities = new Set(rows.map((row) => row.city).filter((city) => city !== "-")).size;
  const owners = rows.filter((row) => row.role === "Owner").length;
  const rule = state.adminConfig.automaticGrouping;

  const removeMember = (row: MemberRow) => {
    dispatch({
      type: "admin/member-remove",
      groupId: group.id,
      memberId: row.id,
      memberName: row.name,
      actor: ADMIN_ACTOR,
    });
    setFeedback(`${row.name} removed from ${group.name}`);
  };

  const candidates = state.businesses.filter(
    (b) =>
      !group.memberIds.includes(b.id) &&
      (!addSearch || b.name.toLowerCase().includes(addSearch.toLowerCase()) || b.contactName.toLowerCase().includes(addSearch.toLowerCase()))
  );

  const addMember = (id: string, name: string) => {
    dispatch({ type: "admin/member-add", groupId: group.id, member: { id, name }, actor: ADMIN_ACTOR });
    setFeedback(`${name} added to ${group.name}`);
    setAddOpen(false);
    setAddSearch("");
  };

  const columns: TableColumn<MemberRow>[] = [
    {
      key: "name",
      header: "Member",
      render: (row) => (
        <div className="flex items-center gap-3">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-ink-800 text-xs font-bold text-gold-400">
            {row.name.slice(0, 1).toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="truncate text-xs font-semibold text-white">{row.name}</p>
            <p className="truncate text-[11px] text-slate-500">{row.contactName}</p>
          </div>
        </div>
      ),
    },
    { key: "category", header: "Category", render: (row) => <span className="text-slate-300">{row.category}</span> },
    { key: "city", header: "City", render: (row) => <span className="text-slate-300">{row.city}</span> },
    {
      key: "role",
      header: "Role",
      render: (row) => <Badge variant={row.role === "Owner" ? "gold" : "default"}>{row.role}</Badge>,
    },
    { key: "joined", header: "Group since", render: () => <span className="text-slate-300">{group.createdAt.slice(0, 10)}</span> },
    {
      key: "actions",
      header: "Actions",
      render: (row) =>
        row.role === "Owner" ? (
          <span className="text-[11px] text-slate-600">Owner</span>
        ) : (
          <button
            type="button"
            onClick={() => removeMember(row)}
            className="inline-flex h-7 cursor-pointer items-center gap-1 rounded-md bg-danger-500/15 px-2 text-[10px] font-semibold text-danger-300 transition-colors hover:bg-danger-500/25"
          >
            <UserMinus className="size-3" /> Remove
          </button>
        ),
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      <AdminGroupTabsHeader
        title="Admin Group Members"
        subtitle={`${group.name} — member register with admin add and remove controls.`}
      />

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <StatCard label="Members" value={memberCountOf(group).toLocaleString("en-GB")} hint={group.name} accent="gold" />
        <StatCard label="Owners" value={owners.toLocaleString("en-GB")} hint="Owner controls apply" accent="info" />
        <StatCard label="Cities" value={cities.toLocaleString("en-GB")} hint="From directory entries" accent="success" />
        <StatCard
          label={group.source === "automatic" ? "Threshold" : "Target size"}
          value={group.source === "automatic" ? rule.threshold : (group.requiredSize ?? "—")}
          hint={group.source === "automatic" ? `Split at ${rule.threshold}` : "Set by owner"}
          accent="warning"
        />
      </div>

      <Card data-tour="list">
        <CardBody className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-1.5">
              <CardTitle>Member register</CardTitle>
              <TipIcon text="Add member brings a business into the group; Remove takes one out. The owner row has no Remove." />
            </div>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setAddOpen(!addOpen)}
                className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-lg border border-gold-500/30 bg-gold-500/10 px-3 text-[11px] font-semibold text-gold-300 transition-colors hover:bg-gold-500/20"
              >
                <UserPlus className="size-3.5" /> Add member
              </button>
              <TipIcon text="Opens a searchable list of businesses; adding takes effect immediately." />
            </div>
          </div>

          {addOpen && (
            <div className="rounded-xl border border-white/10 bg-ink-950/60 p-3">
              <FieldHint>
                Only businesses that are not already in this group are listed. Search matches name
                or contact.
              </FieldHint>
              <input
                type="text"
                value={addSearch}
                onChange={(e) => setAddSearch(e.target.value)}
                placeholder="Search businesses by name or contact…"
                className="w-full rounded-lg border border-white/10 bg-ink-900 px-3 py-2 text-xs text-white placeholder:text-slate-500 focus:border-gold-500/40 focus:outline-none"
              />
              <ul className="mt-2 max-h-48 overflow-y-auto">
                {candidates.length === 0 ? (
                  <li className="py-3 text-center text-[11px] text-slate-500">No matching businesses to add.</li>
                ) : (
                  candidates.map((b) => (
                    <li key={b.id}>
                      <button
                        type="button"
                        onClick={() => addMember(b.id, b.name)}
                        className="flex w-full cursor-pointer items-center justify-between gap-2 rounded-lg px-2.5 py-2 text-left transition-colors hover:bg-white/5"
                      >
                        <span>
                          <span className="block text-xs font-medium text-white">{b.name}</span>
                          <span className="block text-[10px] text-slate-500">{b.contactName} · {b.city}</span>
                        </span>
                        <UserPlus className="size-3.5 text-gold-400" />
                      </button>
                    </li>
                  ))
                )}
              </ul>
            </div>
          )}

          <Table
            columns={columns}
            rows={rows}
            rowKey={(row) => row.id}
            emptyMessage="This group has no members yet."
          />
          <FieldHint>
            Adding and removing happen straight away and are written to the audit log. The owner
            cannot be removed.
          </FieldHint>
        </CardBody>
      </Card>

      {feedback && <Toast message={feedback} onDismiss={() => setFeedback(null)} />}
    </div>
  );
}
