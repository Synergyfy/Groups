import { Award, Sparkles } from "lucide-react";
import Badge from "../../components/ui/Badge";
import Card, { CardBody, CardTitle } from "../../components/ui/Card";
import LinkButton from "../../components/ui/LinkButton";
import SectionHeader from "../../components/ui/SectionHeader";
import StatCard from "../../components/ui/StatCard";
import type { Tier } from "../../domain/types";
import { CAMPAIGNS, CURRENT_BUSINESS, PROGRAMMES, RELATIONSHIPS } from "../../data/businessData";

const TIER_VARIANT: Record<Tier, "gold" | "default" | "muted"> = {
  Platinum: "gold",
  Gold: "gold",
  Silver: "default",
  Bronze: "muted",
};

const STATUS_VARIANT: Record<string, "success" | "warning" | "muted"> = {
  Active: "success",
  Pending: "warning",
  Expired: "muted",
};

export default function RewardsPage() {
  const active = PROGRAMMES.filter((entry) => entry.status === "Active");
  const current = PROGRAMMES.find((entry) => entry.id === CURRENT_BUSINESS.programmeId);
  const relationship = RELATIONSHIPS.find((entry) => entry.id === CURRENT_BUSINESS.accountManagerId);

  return (
    <div className="flex flex-col gap-4">
      <SectionHeader
        title="Rewards"
        subtitle="Membership programmes and tiers attached to your business — a separate relationship from group membership."
      />

      <Card>
        <CardBody className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-base font-bold text-white">
                {current?.name ?? "No active programme"}
              </h2>
              {current && <Badge variant={TIER_VARIANT[current.tier]}>{current.tier} tier</Badge>}
              {current && (
                <Badge variant={STATUS_VARIANT[current.status] ?? "muted"}>
                  {current.status}
                </Badge>
              )}
            </div>
            <p className="mt-2 max-w-2xl text-xs leading-relaxed text-slate-400">
              Tiers reward participation across the ecosystem. Losing or leaving a group never
              changes your tier, and a tier never grants membership of a group by itself.
            </p>
            {relationship && (
              <p className="mt-2 text-[11px] text-slate-500">
                Account manager: {relationship.name} · {relationship.role}
              </p>
            )}
          </div>
          <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-ink-800 text-gold-400">
            <Award className="size-6" />
          </div>
        </CardBody>
      </Card>

      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard
          label="Programmes"
          value={PROGRAMMES.length}
          hint="Available to your business"
        />
        <StatCard
          label="Active"
          value={active.length}
          hint="Currently in force"
          accent="success"
        />
        <StatCard
          label="Current tier"
          value={current?.tier ?? "—"}
          hint="Set by the membership programme"
          accent="gold"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardBody className="flex h-full flex-col gap-3">
            <CardTitle>Membership programmes</CardTitle>
            <div className="flex flex-col gap-2">
              {PROGRAMMES.map((programme) => {
                const isCurrent = programme.id === CURRENT_BUSINESS.programmeId;
                return (
                  <div
                    key={programme.id}
                    className={`flex items-center justify-between gap-3 rounded-xl border p-3 ${
                      isCurrent
                        ? "border-gold-500/40 bg-gold-500/10"
                        : "border-white/10 bg-ink-950/60"
                    }`}
                  >
                    <div className="min-w-0">
                      <p className="truncate text-xs font-semibold text-white">{programme.name}</p>
                      <p className="mt-0.5 text-[11px] text-slate-500">{programme.id}</p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <Badge variant={TIER_VARIANT[programme.tier]}>{programme.tier}</Badge>
                      <Badge variant={STATUS_VARIANT[programme.status] ?? "muted"}>
                        {programme.status}
                      </Badge>
                      {isCurrent && <Badge variant="gold">Yours</Badge>}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardBody className="flex h-full flex-col gap-3">
            <CardTitle>Rewards vs everything else</CardTitle>
            <ul className="space-y-2 text-xs leading-relaxed text-slate-400">
              <li>
                <span className="text-slate-200">Tier</span> — comes from the programme, not from a
                single group.
              </li>
              <li>
                <span className="text-slate-200">Group membership</span> — granted by joining or
                being invited; leaving a group does not reset a tier.
              </li>
              <li>
                <span className="text-slate-200">Campaigns</span> — run against groups, they do not
                pay out tiers.
              </li>
            </ul>
            <div className="mt-auto flex flex-wrap gap-2">
              <LinkButton to="/business/community" size="sm" variant="outline">
                National Community
              </LinkButton>
              <LinkButton to="/business/campaigns" size="sm" variant="ghost">
                <Sparkles className="size-4" /> Campaigns
              </LinkButton>
            </div>
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardBody className="flex flex-col gap-3">
          <CardTitle>Campaign → Contribution → Configured reward</CardTitle>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-white/10 bg-ink-950/60 p-3">
              <p className="text-[11px] uppercase tracking-wide text-slate-500">1 · Campaign</p>
              <p className="mt-1 text-xs leading-relaxed text-slate-400">
                A FundOrDonate campaign that may reference groups.
              </p>
            </div>
            <div className="rounded-xl border border-white/10 bg-ink-950/60 p-3">
              <p className="text-[11px] uppercase tracking-wide text-slate-500">
                2 · Contribution
              </p>
              <p className="mt-1 text-xs leading-relaxed text-slate-400">
                Contributions are recorded on the platform, not inside a group.
              </p>
            </div>
            <div className="rounded-xl border border-white/10 bg-ink-950/60 p-3">
              <p className="text-[11px] uppercase tracking-wide text-slate-500">
                3 · Configured reward
              </p>
              <p className="mt-1 text-xs leading-relaxed text-slate-400">
                The reward attached to a campaign by administrators — separate from your tier.
              </p>
            </div>
          </div>
          <div className="flex flex-col gap-2">
            {CAMPAIGNS.map((campaign) => (
              <div
                key={campaign.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/10 bg-ink-950/60 p-3"
              >
                <div className="min-w-0">
                  <p className="truncate text-xs font-semibold text-white">{campaign.name}</p>
                  <p className="mt-0.5 text-[11px] text-slate-500">
                    {campaign.groupIds?.length ?? 0} referenced group
                    {(campaign.groupIds?.length ?? 0) === 1 ? "" : "s"} · {campaign.platform}
                  </p>
                </div>
                <Badge variant={STATUS_VARIANT[campaign.status] ?? "muted"}>
                  Reward on {campaign.status.toLowerCase()} campaign
                </Badge>
              </div>
            ))}
          </div>
          <p className="text-[11px] leading-relaxed text-slate-500">
            Contribution and reward ledgers live on the FundOrDonate platform. This screen shows
            the relationship only — no backend is involved in this prototype.
          </p>
        </CardBody>
      </Card>
    </div>
  );
}
