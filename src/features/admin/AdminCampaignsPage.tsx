import { useState } from "react";
import { Megaphone, CheckCircle2, XCircle } from "lucide-react";
import Badge from "../../components/ui/Badge";
import Card, { CardBody } from "../../components/ui/Card";
import SectionHeader from "../../components/ui/SectionHeader";
import StatCard from "../../components/ui/StatCard";
import TipIcon from "../../components/ui/TipIcon";
import Toast from "../../components/ui/Toast";
import { useCampaigns, useAppState } from "../../store/selectors";
import { useAppStore } from "../../store/context";

const ADMIN_ACTOR = { id: "admin", name: "Administrator" };

export default function AdminCampaignsPage() {
  const campaigns = useCampaigns();
  const state = useAppState();
  const { dispatch } = useAppStore();
  const [feedback, setFeedback] = useState<string | null>(null);

  const active = campaigns.filter((c) => c.status === "Active").length;
  const totalBudget = campaigns.reduce((sum, c) => sum + (c.budget ?? 0), 0);
  const linkedGroups = campaigns.reduce((sum, c) => sum + c.groupIds.length, 0);

  const groupName = (id: string) => state.groups.find((g) => g.id === id)?.name ?? id;

  const toggleStatus = (id: string, name: string, current: string) => {
    const next = current === "Active" ? "Closed" : "Active";
    dispatch({ type: "admin/campaign-update", campaignId: id, patch: { status: next as "Active" | "Closed" }, actor: ADMIN_ACTOR });
    setFeedback(`${name} set to ${next}`);
  };

  return (
    <div className="flex flex-col gap-4">
      <SectionHeader
        title="Campaign Administration"
        subtitle="Manage campaigns across the platform: status, budgets, linked groups and date ranges."
        tip="Everything here is view-only — the activate or close button below is the only control."
      />

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <StatCard label="Campaigns" value={String(campaigns.length)} hint="Total" accent="gold" />
        <StatCard label="Active" value={String(active)} hint="Currently running" accent="success" />
        <StatCard label="Total budget" value={`£${totalBudget.toLocaleString("en-GB")}`} hint="Across all campaigns" accent="warning" />
        <StatCard label="Linked groups" value={String(linkedGroups)} hint="Group associations" accent="info" />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {campaigns.map((campaign) => (
          <Card key={campaign.id}>
            <CardBody className="flex flex-col gap-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-gold-500/30 bg-gold-500/10 text-gold-400">
                  <Megaphone className="size-5" />
                </div>
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-white/5 px-2 py-0.5 text-[10px] text-slate-300">{campaign.platform}</span>
                  <Badge variant={campaign.status === "Active" ? "success" : "muted"}>{campaign.status}</Badge>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <p className="text-sm font-semibold text-white">{campaign.name}</p>
                <TipIcon text="Budget and dates come from the campaign record and cannot be edited here." />
              </div>
              <div className="flex flex-wrap gap-3 text-xs text-slate-400">
                {campaign.budget && <span>Budget: £{campaign.budget.toLocaleString("en-GB")}</span>}
                {campaign.startDate && <span>Start: {campaign.startDate}</span>}
                {campaign.endDate && <span>End: {campaign.endDate}</span>}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {campaign.groupIds.length === 0 ? (
                  <span className="text-[11px] text-slate-500">No linked groups</span>
                ) : (
                  campaign.groupIds.map((gid) => (
                    <span key={gid} className="rounded-full bg-white/5 px-2 py-0.5 text-[10px] text-slate-300">
                      {groupName(gid)}
                    </span>
                  ))
                )}
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => toggleStatus(campaign.id, campaign.name, campaign.status)}
                  className={`inline-flex h-8 w-full cursor-pointer items-center justify-center gap-1.5 rounded-lg border px-3 text-[11px] font-medium transition-colors ${
                    campaign.status === "Active"
                      ? "border-danger-500/30 bg-danger-500/10 text-danger-300 hover:bg-danger-500/20"
                      : "border-emerald-500/30 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20"
                  }`}
                >
                  {campaign.status === "Active" ? (
                    <>
                      <XCircle className="size-3.5" /> Close campaign
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="size-3.5" /> Activate campaign
                    </>
                  )}
                </button>
                <TipIcon text="Status chip and the Active count above update immediately; you can switch back at any time." />
              </div>
            </CardBody>
          </Card>
        ))}
      </div>

      {feedback && <Toast message={feedback} onDismiss={() => setFeedback(null)} />}
    </div>
  );
}
