import { useState } from "react";
import { ScrollText, CheckCircle2, XCircle } from "lucide-react";
import Badge from "../../components/ui/Badge";
import Card, { CardBody } from "../../components/ui/Card";
import SectionHeader from "../../components/ui/SectionHeader";
import StatCard from "../../components/ui/StatCard";
import TipIcon from "../../components/ui/TipIcon";
import Toast from "../../components/ui/Toast";
import { useProgrammes } from "../../store/selectors";
import { useAppStore } from "../../store/context";

const ADMIN_ACTOR = { id: "admin", name: "Administrator" };

export default function AdminProgrammesPage() {
  const programmes = useProgrammes();
  const { dispatch } = useAppStore();
  const [feedback, setFeedback] = useState<string | null>(null);

  const totalMonthlyRevenue = programmes.filter((p) => p.status === "Active").reduce((sum, p) => sum + p.monthlyFee * p.groupCount, 0);
  const activeCount = programmes.filter((p) => p.status === "Active").length;

  const toggleStatus = (id: string, name: string, current: string) => {
    const next = current === "Active" ? "Closed" : "Active";
    dispatch({ type: "admin/programme-update", programmeId: id, patch: { status: next as "Active" | "Closed" }, actor: ADMIN_ACTOR });
    setFeedback(`${name} set to ${next}`);
  };

  return (
    <div className="flex flex-col gap-4">
      <SectionHeader
        title="Programme Administration"
        subtitle="Manage membership programmes: pricing, benefits, status and group assignments."
        tip="Closing or activating takes effect immediately and is recorded in the audit log."
      />

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <StatCard label="Programmes" value={String(programmes.length)} hint="Total" accent="gold" />
        <StatCard label="Active" value={String(activeCount)} hint="Currently running" accent="success" />
        <StatCard label="Monthly revenue" value={`£${totalMonthlyRevenue}`} hint="Fee × groups" accent="warning" />
        <StatCard label="Total groups" value={String(programmes.reduce((s, p) => s + p.groupCount, 0))} hint="Assigned across programmes" accent="info" />
      </div>

      <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
        {programmes.map((programme) => (
          <Card key={programme.id}>
            <CardBody className="flex flex-col gap-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-gold-500/30 bg-gold-500/10 text-gold-400">
                  <ScrollText className="size-5" />
                </div>
                <Badge variant={programme.status === "Active" ? "success" : "muted"}>{programme.status}</Badge>
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <p className="text-sm font-semibold text-white">{programme.name}</p>
                  <TipIcon text="Fee and group count feed the monthly revenue figure above." />
                </div>
                <p className="mt-0.5 text-[11px] text-slate-500">{programme.tier} tier</p>
              </div>
              <p className="text-xs leading-relaxed text-slate-400">{programme.description}</p>
              <div className="flex items-center gap-3 text-xs">
                <span className="text-gold-300 font-semibold">£{programme.monthlyFee}/mo</span>
                <span className="text-slate-400">{programme.groupCount} groups</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {programme.benefits.map((benefit) => (
                  <span key={benefit} className="rounded-full bg-white/5 px-2 py-0.5 text-[10px] text-slate-300">
                    {benefit}
                  </span>
                ))}
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => toggleStatus(programme.id, programme.name, programme.status)}
                  className={`inline-flex h-8 w-full cursor-pointer items-center justify-center gap-1.5 rounded-lg border px-3 text-[11px] font-medium transition-colors ${
                    programme.status === "Active"
                      ? "border-danger-500/30 bg-danger-500/10 text-danger-300 hover:bg-danger-500/20"
                      : "border-emerald-500/30 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20"
                  }`}
                >
                  {programme.status === "Active" ? (
                    <>
                      <XCircle className="size-3.5" /> Close programme
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="size-3.5" /> Activate programme
                    </>
                  )}
                </button>
                <TipIcon text="Closing marks it Closed and drops it from active counts; you can reopen it at any time." />
              </div>
            </CardBody>
          </Card>
        ))}
      </div>

      {feedback && <Toast message={feedback} onDismiss={() => setFeedback(null)} />}
    </div>
  );
}
