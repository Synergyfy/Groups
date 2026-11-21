import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, CheckCircle2, Users } from "lucide-react";
import Badge from "../../components/ui/Badge";
import Card, { CardBody, CardTitle } from "../../components/ui/Card";
import { errorMessage } from "../../app/api";
import {
  consumerApi,
  type ConsumerCircleDetail,
} from "../../consumer/consumerApi";

export default function ConsumerCircleDetailPage() {
  const { groupId = "" } = useParams();
  const [circle, setCircle] = useState<ConsumerCircleDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!groupId) return;
    let active = true;
    consumerApi
      .circle(groupId)
      .then((result) => {
        if (active) {
          setCircle(result);
          setError(null);
        }
      })
      .catch((cause) => {
        if (active) setError(errorMessage(cause));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [groupId]);

  if (loading) {
    return (
      <div className="rounded-2xl border border-white/10 bg-ink-900/60 p-10 text-center text-sm text-slate-400">
        Loading circle…
      </div>
    );
  }

  if (error || !circle) {
    return (
      <div className="rounded-2xl border border-white/10 bg-ink-900/60 p-10 text-center">
        <Users className="mx-auto size-8 text-slate-500" />
        <p className="mt-3 text-sm font-semibold text-white">Circle unavailable</p>
        <p className="mt-1 text-xs text-slate-400">
          {error || "This circle could not be loaded."}
        </p>
        <Link
          to="/consumer/invitations"
          className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-gold-500 px-3.5 py-2 text-xs font-bold text-ink-950"
        >
          <ArrowLeft className="size-3.5" /> Back to invitations
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <Link
        to="/consumer"
        className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-400 hover:text-white"
      >
        <ArrowLeft className="size-3.5" /> Back to dashboard
      </Link>

      <div className="rounded-2xl border border-gold-500/20 bg-gradient-to-b from-gold-500/[0.08] to-ink-900/60 p-5">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="gold">{circle.type}</Badge>
          <Badge variant="success">Member</Badge>
        </div>
        <h1 className="mt-2 text-xl font-bold text-white">{circle.name}</h1>
        <p className="mt-1 text-xs text-slate-300">
          {circle.businessName ? `Run by ${circle.businessName}` : "Community circle"} ·{" "}
          {circle.memberCount} members
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardBody className="flex flex-col gap-3">
            <CardTitle>Circle activity</CardTitle>
            {circle.activities.length === 0 ? (
              <p className="rounded-xl border border-white/5 bg-ink-950/60 p-4 text-center text-xs text-slate-500">
                No circle activity yet.
              </p>
            ) : (
              circle.activities.map((entry) => (
                <article
                  key={entry.id}
                  className="rounded-xl border border-white/5 bg-ink-950/60 p-3"
                >
                  <p className="text-xs leading-relaxed text-slate-300">{entry.message}</p>
                  <p className="mt-1 text-[10px] text-slate-500">
                    {new Date(entry.at).toLocaleString("en-GB")}
                  </p>
                </article>
              ))
            )}
          </CardBody>
        </Card>

        <Card>
          <CardBody className="flex flex-col gap-3">
            <CardTitle className="flex items-center gap-2">
              <Users className="size-4 text-gold-400" /> Members ({circle.memberCount})
            </CardTitle>
            {circle.members.length === 0 ? (
              <p className="text-xs text-slate-500">No members listed.</p>
            ) : (
              circle.members.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center gap-2.5 rounded-xl border border-white/5 bg-ink-950/60 p-2.5"
                >
                  <div className="flex size-8 items-center justify-center rounded-lg bg-gold-500/15 text-xs font-bold text-gold-400">
                    {(member.name || "M").slice(0, 1).toUpperCase()}
                  </div>
                  <p className="truncate text-xs font-semibold text-white">{member.name}</p>
                </div>
              ))
            )}
            <p className="flex items-center gap-1.5 text-[11px] text-emerald-300">
              <CheckCircle2 className="size-3.5" /> You are a member of this circle
            </p>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
