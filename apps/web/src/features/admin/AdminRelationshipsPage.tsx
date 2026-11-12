import { useState } from "react";
import { Link } from "react-router-dom";
import { Link2, Mail, Phone, Users, UserCog } from "lucide-react";
import Card, { CardBody, CardTitle } from "../../components/ui/Card";
import FieldHint from "../../components/ui/FieldHint";
import SectionHeader from "../../components/ui/SectionHeader";
import StatCard from "../../components/ui/StatCard";
import Table from "../../components/ui/Table";
import TipIcon from "../../components/ui/TipIcon";
import Toast from "../../components/ui/Toast";
import type { TableColumn } from "../../components/ui/Table";
import type { RelationshipRecord } from "../../domain/types";
import { useRelationships, useAppState } from "../../store/selectors";
import { useAppStore } from "../../store/context";

const ADMIN_ACTOR = { id: "admin", name: "Administrator" };

const KIND_LABELS: Record<string, string> = {
  "account-manager": "Account Manager",
  agent: "Agent",
  consultant: "Consultant",
};

const KIND_COLORS: Record<string, string> = {
  "account-manager": "bg-gold-500/15 text-gold-300",
  agent: "bg-sky-500/15 text-sky-300",
  consultant: "bg-emerald-500/15 text-emerald-300",
};

export default function AdminRelationshipsPage() {
  const relationships = useRelationships();
  const state = useAppState();
  const { dispatch } = useAppStore();
  const [feedback, setFeedback] = useState<string | null>(null);
  const [assignGroupId, setAssignGroupId] = useState<string>("");
  const [assignKind, setAssignKind] = useState<"account-manager" | "agent" | "consultant">("account-manager");
  const [assignRelId, setAssignRelId] = useState<string>("");

  const amCount = relationships.filter((r) => r.kind === "account-manager").length;
  const agentCount = relationships.filter((r) => r.kind === "agent").length;
  const consultantCount = relationships.filter((r) => r.kind === "consultant").length;

  const assign = () => {
    if (!assignGroupId || !assignRelId) return;
    const group = state.groups.find((g) => g.id === assignGroupId);
    const rel = relationships.find((r) => r.id === assignRelId);
    if (!group || !rel) return;
    dispatch({
      type: "admin/relationship-assign",
      groupId: assignGroupId,
      kind: assignKind,
      relationshipId: assignRelId,
      actor: ADMIN_ACTOR,
    });
    setFeedback(`${KIND_LABELS[assignKind]} ${rel.name} assigned to ${group.name}`);
    setAssignGroupId("");
    setAssignRelId("");
  };

  const columns: TableColumn<RelationshipRecord>[] = [
    {
      key: "name",
      header: "Name",
      render: (r) => (
        <div className="flex items-center gap-3">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-ink-800 text-xs font-bold text-gold-400">
            {r.name.slice(0, 1).toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="truncate text-xs font-semibold text-white">{r.name}</p>
            <p className="truncate text-[11px] text-slate-500">{r.role}</p>
          </div>
        </div>
      ),
    },
    {
      key: "kind",
      header: "Type",
      render: (r) => (
        <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${KIND_COLORS[r.kind]}`}>
          {KIND_LABELS[r.kind]}
        </span>
      ),
    },
    {
      key: "email",
      header: "Contact",
      render: (r) => (
        <div className="flex flex-col gap-0.5">
          <span className="inline-flex items-center gap-1 text-[11px] text-slate-300">
            <Mail className="size-3" /> {r.email}
          </span>
          {r.phone && (
            <span className="inline-flex items-center gap-1 text-[11px] text-slate-500">
              <Phone className="size-3" /> {r.phone}
            </span>
          )}
        </div>
      ),
    },
    {
      key: "groups",
      header: "Active groups",
      render: (r) => <span className="text-slate-300">{r.activeGroups}</span>,
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      <SectionHeader
        title="Relationship Administration"
        subtitle="Account managers, agents and consultants — who supports which groups, and assign new relationships."
        tip="Only one person holds each role per group — assigning again replaces whoever is there now."
      />

      <div className="grid grid-cols-3 gap-3">
        <StatCard label="Account Managers" value={String(amCount)} hint="Strategic support" accent="gold" />
        <StatCard label="Agents" value={String(agentCount)} hint="Operational support" accent="info" />
        <StatCard label="Consultants" value={String(consultantCount)} hint="Business mentoring" accent="success" />
      </div>

      {/* Assign a relationship */}
      <Card>
        <CardBody className="flex flex-col gap-3">
          <div className="flex items-center gap-1.5">
            <UserCog className="size-4 text-gold-400" />
            <CardTitle>Assign a relationship to a group</CardTitle>
            <TipIcon text="Pick a group, then a role, then a person for that role — then press Assign." />
          </div>
          <div className="grid gap-2 sm:grid-cols-3">
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-1.5">
                <span className="font-semibold text-white">Group</span>
                <TipIcon text="The group that will show this person on its Relationships tab." />
              </div>
              <select
                value={assignGroupId}
                onChange={(e) => setAssignGroupId(e.target.value)}
                className="rounded-lg border border-white/10 bg-ink-900 px-3 py-2 text-xs text-white focus:border-gold-500/40 focus:outline-none"
              >
                <option value="">Select a group…</option>
                {state.groups.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-1.5">
                <span className="font-semibold text-white">Role</span>
                <TipIcon text="Choosing a role filters the person list to that type." />
              </div>
              <select
                value={assignKind}
                onChange={(e) => setAssignKind(e.target.value as typeof assignKind)}
                className="rounded-lg border border-white/10 bg-ink-900 px-3 py-2 text-xs text-white focus:border-gold-500/40 focus:outline-none"
              >
                <option value="account-manager">Account Manager</option>
                <option value="agent">Agent</option>
                <option value="consultant">Consultant</option>
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-1.5">
                <span className="font-semibold text-white">Person</span>
                <TipIcon text="Only people of the selected role are offered here." />
              </div>
              <select
                value={assignRelId}
                onChange={(e) => setAssignRelId(e.target.value)}
                className="rounded-lg border border-white/10 bg-ink-900 px-3 py-2 text-xs text-white focus:border-gold-500/40 focus:outline-none"
              >
                <option value="">Select a person…</option>
                {relationships
                  .filter((r) => r.kind === assignKind)
                  .map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name}
                    </option>
                  ))}
              </select>
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={assign}
                disabled={!assignGroupId || !assignRelId}
                className="inline-flex h-9 w-fit cursor-pointer items-center gap-1.5 rounded-lg bg-gold-500 px-4 text-xs font-semibold text-ink-950 transition-colors hover:bg-gold-400 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Link2 className="size-3.5" /> Assign
              </button>
              <TipIcon text="Links the person to the group straight away and records the change in the audit log." />
            </div>
            <FieldHint>Assign stays disabled until a group and a person are chosen.</FieldHint>
          </div>
        </CardBody>
      </Card>

      {/* Relationship list */}
      <Card>
        <CardBody className="flex flex-col gap-3">
          <div className="flex items-center gap-1.5">
            <Users className="size-4 text-gold-400" />
            <CardTitle>Relationship register</CardTitle>
            <TipIcon text="The full list the assign form above draws its people from." />
          </div>
          <Table
            columns={columns}
            rows={relationships}
            rowKey={(r) => r.id}
            emptyMessage="No relationships recorded."
          />
          <p className="text-[11px] leading-relaxed text-slate-500">
            Assignments appear on each group's Relationships tab.{" "}
            <Link to="/admin/groups" className="text-gold-300 hover:text-gold-200">
              Browse groups
            </Link>
          </p>
        </CardBody>
      </Card>

      {feedback && <Toast message={feedback} onDismiss={() => setFeedback(null)} />}
    </div>
  );
}
