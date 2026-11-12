import { Handshake, Megaphone } from "lucide-react";
import Badge from "../../components/ui/Badge";
import Card, { CardBody, CardTitle } from "../../components/ui/Card";
import EmptyState from "../../components/ui/EmptyState";
import SectionHeader from "../../components/ui/SectionHeader";
import StatCard from "../../components/ui/StatCard";
import { useBusinessData } from "../../business/BusinessDataProvider";

const STATUS_VARIANT: Record<string, "success" | "warning" | "muted"> = {
  Active: "success",
  Draft: "warning",
  Completed: "muted",
};

export default function CampaignsPage() {
  const { campaigns: view } = useBusinessData();
  const campaigns = view?.items ?? [];
  const stats = view?.stats;

  return (
    <div className="flex flex-col gap-4">
      <SectionHeader
        title="Campaigns"
        subtitle="FundOrDonate campaign opportunities related to your business — each campaign may reference groups, but a campaign is never a group."
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard
          label="Campaigns available"
          value={stats?.total ?? campaigns.length}
          hint="Campaign records available to you"
        />
        <StatCard
          label="Active"
          value={stats?.active ?? campaigns.filter((entry) => entry.status === "Active").length}
          hint="Currently running"
          accent="success"
        />
        <StatCard
          label="My groups referenced"
          value={stats?.touchingMyGroups ?? 0}
          hint="Campaigns touching groups I own"
          accent="info"
        />
      </div>

      {campaigns.length === 0 && (
        <EmptyState
          title="No campaigns available"
          description="Campaigns appear here once an administrator publishes one."
        />
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        {campaigns.map((campaign) => {
          const linked = campaign.groups.map((group) => group.name);
          return (
            <Card key={campaign.id}>
              <CardBody className="flex h-full flex-col gap-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-ink-800 text-gold-400">
                    <Megaphone className="size-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-white">{campaign.name}</p>
                    <p className="mt-0.5 text-[11px] text-slate-500">
                      Platform: {campaign.platform} · {campaign.id}
                    </p>
                  </div>
                  <Badge variant={STATUS_VARIANT[campaign.status] ?? "muted"}>
                    {campaign.status}
                  </Badge>
                </div>

                <div className="rounded-xl border border-white/10 bg-ink-950/60 p-3">
                  <p className="text-[11px] uppercase tracking-wide text-slate-500">
                    Referenced groups
                  </p>
                  {linked.length === 0 ? (
                    <p className="mt-1 text-xs text-slate-500">
                      None — this campaign is not tied to a group.
                    </p>
                  ) : (
                    <ul className="mt-1.5 flex flex-wrap gap-1.5">
                      {linked.map((name) => (
                        <li
                          key={name}
                          className="rounded-full border border-gold-500/30 bg-gold-500/10 px-2 py-0.5 text-[10px] font-semibold text-gold-200"
                        >
                          {name}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <p className="text-[11px] leading-relaxed text-slate-500">
                  Campaigns run on FundOrDonate. They borrow a group audience — membership,
                  ownership and settings stay with the group.
                </p>
              </CardBody>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardBody className="flex flex-col gap-3">
          <CardTitle>Group ≠ Campaign</CardTitle>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-white/10 bg-ink-950/60 p-3">
              <p className="flex items-center gap-1.5 text-xs font-semibold text-white">
                <Handshake className="size-4 text-gold-400" /> A group has
              </p>
              <p className="mt-1 text-[11px] leading-relaxed text-slate-500">
                members, an owner, access rules, stages, activity and a location.
              </p>
            </div>
            <div className="rounded-xl border border-white/10 bg-ink-950/60 p-3">
              <p className="flex items-center gap-1.5 text-xs font-semibold text-white">
                <Megaphone className="size-4 text-gold-400" /> A campaign has
              </p>
              <p className="mt-1 text-[11px] leading-relaxed text-slate-500">
                a status, a platform and an optional list of groups it runs against.
              </p>
            </div>
          </div>
          {campaigns.length === 0 && (
            <EmptyState
              title="No campaigns yet"
              description="Campaign records appear here once an administrator adds them."
            />
          )}
        </CardBody>
      </Card>
    </div>
  );
}
