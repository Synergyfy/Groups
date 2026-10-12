import { useState } from "react";
import { Link } from "react-router-dom";
import { CheckCircle2, XCircle, ShieldAlert, Users, MapPin } from "lucide-react";
import Card, { CardBody } from "../../components/ui/Card";
import FieldHint from "../../components/ui/FieldHint";
import SectionHeader from "../../components/ui/SectionHeader";
import StatCard from "../../components/ui/StatCard";
import Toast from "../../components/ui/Toast";
import { useAppState, usePendingReviewGroups } from "../../store/selectors";
import { useAppStore } from "../../store/context";

const ADMIN_ACTOR = { id: "admin", name: "Administrator" };

export default function AdminPendingReviewPage() {
  const state = useAppState();
  const pending = usePendingReviewGroups();
  const { dispatch } = useAppStore();
  const [feedback, setFeedback] = useState<string | null>(null);

  const suspendedCount = state.groups.filter((g) => g.status === "Suspended").length;
  const activeCount = state.groups.filter((g) => g.status === "Active").length;

  const approve = (id: string, name: string) => {
    dispatch({ type: "admin/group-approve", groupId: id, actor: ADMIN_ACTOR });
    setFeedback(`${name} approved`);
  };
  const reject = (id: string, name: string) => {
    dispatch({ type: "admin/group-close", groupId: id, actor: ADMIN_ACTOR });
    setFeedback(`${name} rejected`);
  };

  return (
    <div className="flex flex-col gap-4">
      <SectionHeader
        title="Moderation Queue"
        subtitle="Groups awaiting approval. Approve to activate, reject to close. Every action is recorded in the audit log."
        tip="Only groups in Pending Review appear here — suspended and closed groups are not in this queue."
      />

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <StatCard label="Pending Review" value={String(pending.length)} hint="Awaiting approval" accent="warning" />
        <StatCard label="Suspended" value={String(suspendedCount)} hint="Temporarily inactive" accent="danger" />
        <StatCard label="Active" value={String(activeCount)} hint="Currently running" accent="success" />
        <StatCard label="Total groups" value={String(state.groups.length)} hint="On the platform" accent="gold" />
      </div>

      <FieldHint>
        Approve makes the group active straight away. Reject closes it, and closed groups leave
        this queue.
      </FieldHint>

      {pending.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/15 bg-ink-900/40 p-10 text-center">
          <CheckCircle2 className="mx-auto size-8 text-emerald-400" />
          <p className="mt-3 text-sm font-medium text-slate-300">Queue clear</p>
          <p className="mx-auto mt-1 max-w-xs text-xs text-slate-500">No groups are currently awaiting review.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {pending.map((group) => (
            <Card key={group.id}>
              <CardBody className="flex flex-col gap-3">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <Link
                      to={`/admin/groups/${group.id}`}
                      className="text-sm font-semibold text-white hover:text-gold-200"
                    >
                      {group.name}
                    </Link>
                    <p className="mt-0.5 text-[11px] text-slate-500">
                      {group.type} · owned by {group.ownerName} · created {group.createdAt.slice(0, 10)}
                    </p>
                  </div>
                  <span className="inline-flex items-center gap-1 rounded-full bg-warning-500/15 px-2.5 py-1 text-[10px] font-semibold text-warning-300">
                    <ShieldAlert className="size-3" /> Pending Review
                  </span>
                </div>
                <p className="text-xs leading-relaxed text-slate-400">{group.purpose}</p>
                <div className="flex flex-wrap gap-2 text-[11px] text-slate-500">
                  <span className="inline-flex items-center gap-1">
                    <Users className="size-3" /> {group.memberIds.length} members
                  </span>
                  {group.location?.city && (
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="size-3" /> {group.location.city}
                    </span>
                  )}
                  <span className="rounded-full bg-white/10 px-2 py-0.5 capitalize">{group.accessType}</span>
                  {group.pricing === "paid" && (
                    <span className="rounded-full bg-gold-500/15 px-2 py-0.5 text-gold-300">Paid · £{group.contribution}</span>
                  )}
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => approve(group.id, group.name)}
                    className="inline-flex h-9 flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-lg bg-emerald-500 px-4 text-xs font-semibold text-white transition-colors hover:bg-emerald-400 sm:flex-none sm:px-6"
                  >
                    <CheckCircle2 className="size-3.5" /> Approve
                  </button>
                  <button
                    type="button"
                    onClick={() => reject(group.id, group.name)}
                    className="inline-flex h-9 flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-lg bg-danger-500 px-4 text-xs font-semibold text-white transition-colors hover:bg-danger-400 sm:flex-none sm:px-6"
                  >
                    <XCircle className="size-3.5" /> Reject
                  </button>
                  <Link
                    to={`/admin/groups/${group.id}`}
                    className="inline-flex h-9 flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-white/15 bg-white/5 px-4 text-xs font-medium text-slate-300 transition-colors hover:border-white/25 hover:text-white sm:flex-none sm:px-6"
                  >
                    Inspect
                  </Link>
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      )}

      {feedback && <Toast message={feedback} onDismiss={() => setFeedback(null)} />}
    </div>
  );
}
