import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Calendar,
  CheckCircle2,
  Globe,
  LogOut,
  MapPin,
  MessageSquare,
  Send,
  ShieldCheck,
  Users,
} from "lucide-react";
import Badge from "../../components/ui/Badge";
import { ApiError, errorMessage } from "../../app/api";
import {
  consumerApi,
  type ConsumerGroupActivity,
  type ConsumerGroupDetail,
} from "../../consumer/consumerApi";
import { useConsumerData } from "../../consumer/ConsumerDataProvider";
import PaymentDialog, {
  type PaymentTarget,
} from "../payments/PaymentDialog";
import { paymentRequiredDetails } from "../payments/paymentsApi";

export default function ConsumerGroupDetailPage() {
  const { groupId = "" } = useParams();
  const navigate = useNavigate();
  const { refresh } = useConsumerData();

  const [group, setGroup] = useState<ConsumerGroupDetail | null>(null);
  const [activity, setActivity] = useState<ConsumerGroupActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [posting, setPosting] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [paymentTarget, setPaymentTarget] = useState<PaymentTarget | null>(null);

  const load = useCallback(async () => {
    try {
      const detail = await consumerApi.group(groupId);
      setGroup(detail);
      setError(null);
      if (detail.joined) {
        try {
          setActivity(await consumerApi.groupActivity(groupId));
        } catch {
          setActivity([]);
        }
      } else {
        setActivity([]);
      }
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setLoading(false);
    }
  }, [groupId]);

  useEffect(() => {
    // Initial fetch; the async loader only updates state after the request.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (groupId) void load();
  }, [groupId, load]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 3000);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const memberCount = group?.memberCount ?? group?.members.length ?? 0;
  const accessLabel = useMemo(() => {
    switch (group?.accessType) {
      case "open":
        return "Open to join";
      case "request":
        return "Request to join";
      case "eligibility":
        return "Eligibility rules apply";
      case "invitation":
        return "Invitation only";
      default:
        return "Group access";
    }
  }, [group?.accessType]);

  const handleJoin = async () => {
    if (!group) return;
    try {
      await consumerApi.join(group.id);
      await refresh();
      setToast(`You joined ${group.name}.`);
      await load();
    } catch (cause) {
      const required = paymentRequiredDetails(cause);
      if (required) {
        setPaymentTarget({
          kind: "CONTRIBUTION",
          groupId: required.groupId,
          groupName: group.name,
          amountPounds: required.amountPounds,
          frequency: required.frequency,
          onPaid: async () => {
            await consumerApi.join(group.id);
            await refresh();
            await load();
            setToast(`Contribution paid — you joined ${group.name}.`);
          },
        });
        setPaymentOpen(true);
        return;
      }
      if (cause instanceof ApiError) {
        setToast(errorMessage(cause));
      } else {
        setToast("Could not join this group.");
      }
    }
  };

  const handleLeave = async () => {
    if (!group) return;
    if (!window.confirm(`Leave "${group.name}"?`)) return;
    try {
      await consumerApi.leave(group.id);
      await refresh();
      navigate("/consumer/my-groups", { replace: true });
    } catch (cause) {
      setToast(errorMessage(cause));
    }
  };

  const handlePost = async (event: React.FormEvent) => {
    event.preventDefault();
    const text = message.trim();
    if (!group || !text) return;
    setPosting(true);
    try {
      await consumerApi.postActivity(group.id, text);
      setMessage("");
      setActivity(await consumerApi.groupActivity(group.id));
      setToast("Post shared with the group.");
    } catch (cause) {
      setToast(errorMessage(cause));
    } finally {
      setPosting(false);
    }
  };

  if (loading) {
    return (
      <div className="rounded-2xl border border-white/10 bg-ink-900/60 p-10 text-center text-sm text-slate-400">
        Loading group…
      </div>
    );
  }

  if (error || !group) {
    return (
      <div className="rounded-2xl border border-white/10 bg-ink-900/60 p-10 text-center">
        <ShieldCheck className="mx-auto size-8 text-slate-500" />
        <p className="mt-3 text-sm font-semibold text-white">Group unavailable</p>
        <p className="mt-1 text-xs text-slate-400">{error || "This group could not be loaded."}</p>
        <Link
          to="/consumer/my-groups"
          className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-gold-500 px-3.5 py-2 text-xs font-bold text-ink-950"
        >
          <ArrowLeft className="size-3.5" /> Back to My Groups
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5 pb-8">
      {toast && (
        <div className="fixed right-5 top-5 z-50 flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/20 px-4 py-2.5 text-xs font-semibold text-emerald-200 shadow-xl backdrop-blur-md">
          <CheckCircle2 className="size-4 text-emerald-400" /> {toast}
        </div>
      )}

      <div className="flex items-center justify-between">
        <Link
          to="/consumer/my-groups"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-400 hover:text-white"
        >
          <ArrowLeft className="size-3.5" /> Back to My Groups
        </Link>
        <span className="text-[11px] text-slate-500">Consumer member view</span>
      </div>

      {!group.joined && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-gold-500/40 bg-gold-500/10 p-4">
          <div>
            <p className="text-xs font-bold text-gold-200">You are previewing this group</p>
            <p className="mt-0.5 text-[11px] text-gold-300/80">
              Join to see the member feed and participate in group activity.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void handleJoin()}
            className="cursor-pointer rounded-xl bg-gold-500 px-4 py-2 text-xs font-bold text-ink-950 hover:bg-gold-400"
          >
            {group.accessType === "request" ? "Request to join" : "Join group"}
          </button>
        </div>
      )}

      <div className="overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-ink-900/90 via-ink-900/70 to-gold-500/[0.08] p-5 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex size-14 shrink-0 items-center justify-center rounded-2xl border border-gold-500/30 bg-gradient-to-br from-gold-500/20 to-amber-600/20 text-xl font-bold text-gold-300">
              {group.name.slice(0, 1).toUpperCase()}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="gold">{group.type}</Badge>
                <Badge variant={group.joined ? "success" : "neutral"}>{group.status}</Badge>
                {group.city && (
                  <span className="inline-flex items-center gap-1 text-[11px] text-slate-300">
                    <MapPin className="size-3 text-gold-400" /> {group.city}
                  </span>
                )}
                {group.joined && (
                  <span className="inline-flex items-center gap-1 rounded-md bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold text-emerald-300">
                    <CheckCircle2 className="size-2.5" /> Joined
                  </span>
                )}
              </div>
              <h1 className="mt-2 text-xl font-extrabold tracking-tight text-white sm:text-2xl">
                {group.name}
              </h1>
              <p className="mt-1 text-xs text-slate-400">
                Organized by{" "}
                <span className="font-semibold text-slate-200">
                  {group.ownerName || "Group owner"}
                </span>{" "}
                · {memberCount} members
              </p>
            </div>
          </div>

          {group.joined && (
            <button
              type="button"
              onClick={() => void handleLeave()}
              className="inline-flex cursor-pointer items-center gap-1.5 self-start rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-slate-400 transition-colors hover:border-rose-500/40 hover:bg-rose-500/10 hover:text-rose-300"
            >
              <LogOut className="size-3.5" /> Leave
            </button>
          )}
        </div>

        <p className="mt-4 border-t border-white/10 pt-3.5 text-xs leading-relaxed text-slate-300">
          {group.purpose || group.description || "This group has not added a description yet."}
        </p>

        <div className="mt-4 flex flex-wrap gap-4 text-[11px] text-slate-400">
          <span className="inline-flex items-center gap-1.5">
            <Globe className="size-3.5 text-emerald-400" /> {accessLabel}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Users className="size-3.5 text-sky-400" /> {memberCount} members
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Calendar className="size-3.5 text-gold-400" /> Created {group.createdAt.slice(0, 10)}
          </span>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <section className="flex flex-col gap-4 lg:col-span-2">
          <div className="rounded-2xl border border-white/10 bg-ink-900/60 p-4">
            <h2 className="flex items-center gap-2 text-sm font-bold text-white">
              <MessageSquare className="size-4 text-gold-400" /> Group activity
            </h2>

            {group.joined ? (
              <form onSubmit={(event) => void handlePost(event)} className="mt-3 flex flex-col gap-2">
                <textarea
                  rows={2}
                  value={message}
                  onChange={(event) => setMessage(event.target.value)}
                  placeholder={`Share an update with ${group.name}…`}
                  className="w-full resize-none rounded-xl border border-white/10 bg-ink-950 p-3 text-xs text-white placeholder-slate-500 outline-none focus:border-gold-500/50"
                />
                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={posting || !message.trim()}
                    className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl bg-gold-500 px-3.5 py-1.5 text-xs font-bold text-ink-950 disabled:opacity-40"
                  >
                    <Send className="size-3" /> {posting ? "Posting…" : "Post update"}
                  </button>
                </div>
              </form>
            ) : (
              <p className="mt-3 rounded-xl border border-white/5 bg-ink-950/60 p-3 text-xs text-slate-400">
                Join this group to read and post in the member feed.
              </p>
            )}

            <div className="mt-4 flex flex-col gap-2">
              {activity.length === 0 ? (
                <p className="rounded-xl border border-white/5 bg-ink-950/60 p-4 text-center text-xs text-slate-500">
                  No activity yet.
                </p>
              ) : (
                activity.map((entry) => (
                  <article
                    key={entry.id}
                    className="rounded-xl border border-white/5 bg-ink-950/60 p-3"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-semibold text-white">{entry.actorName}</p>
                      <span className="text-[10px] text-slate-500">
                        {new Date(entry.at).toLocaleString("en-GB")}
                      </span>
                    </div>
                    <p className="mt-1 whitespace-pre-line text-xs leading-relaxed text-slate-300">
                      {entry.message}
                    </p>
                  </article>
                ))
              )}
            </div>
          </div>
        </section>

        <aside className="flex flex-col gap-4">
          <div className="rounded-2xl border border-white/10 bg-ink-900/60 p-4">
            <h2 className="flex items-center gap-2 text-sm font-bold text-white">
              <Users className="size-4 text-gold-400" /> Members ({memberCount})
            </h2>
            <div className="mt-3 flex flex-col gap-2">
              {group.members.length === 0 ? (
                <p className="text-xs text-slate-500">No members listed.</p>
              ) : (
                group.members.slice(0, 20).map((member) => (
                  <div
                    key={member.id}
                    className="flex items-center gap-2.5 rounded-xl border border-white/5 bg-ink-950/60 p-2.5"
                  >
                    <div className="flex size-8 items-center justify-center rounded-lg bg-gold-500/15 text-xs font-bold text-gold-400">
                      {(member.fullName || "M").slice(0, 1).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-xs font-semibold text-white">
                        {member.fullName || "Group member"}
                      </p>
                      <p className="text-[10px] capitalize text-slate-500">{member.role}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </aside>
      </div>

      <PaymentDialog
        open={paymentOpen}
        onClose={() => setPaymentOpen(false)}
        target={paymentTarget}
      />
    </div>
  );
}
