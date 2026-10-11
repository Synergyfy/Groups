import { Link, useParams } from "react-router-dom";
import { ArrowRight, Building2, MapPinned, Users } from "lucide-react";
import Badge from "../../components/ui/Badge";
import Card, { CardBody, CardTitle } from "../../components/ui/Card";
import SectionHeader from "../../components/ui/SectionHeader";
import StatCard from "../../components/ui/StatCard";
import { CAMPAIGNS, PROGRAMMES, RELATIONSHIPS, findDirectoryEntry } from "../../data/businessData";
import { LOCATIONS } from "../../data/locationsData";
import { useAppState, useGroup, useGroupActivity } from "../../store/selectors";
import { useDemoLoading } from "../../lib/demoDelay";
import { SkeletonCard, SkeletonRows } from "../../components/ui/Skeleton";
import { memberCountOf } from "../groups/groupUtils";
import AdminGroupTabsHeader, { AdminGroupMissingState } from "./AdminGroupTabsHeader";

function relationshipName(id?: string): string {
  if (!id) return "Not assigned";
  return RELATIONSHIPS.find((entry) => entry.id === id)?.name ?? "Not assigned";
}

export default function AdminGroupRelationshipsPage() {
  const { groupId } = useParams();
  const group = useGroup(groupId);
  const state = useAppState();
  const activity = useGroupActivity(groupId);
  const loading = useDemoLoading();

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
        title="19 — Admin Group Relationships"
        description="City, local area, business, campaign, membership, agent, account manager and consultant relationships."
      />
    );
  }

  const owner = findDirectoryEntry(group.ownerId);
  const city = group.location?.city;
  const localArea = group.location?.localArea;
  const cityEntry = LOCATIONS.cities.find((entry) => entry.name === city);
  const areaEntry = cityEntry?.areas.find((entry) => entry.name === localArea);
  const programme = PROGRAMMES.find((entry) => entry.id === group.programmeId);
  const campaigns = CAMPAIGNS.filter((entry) => entry.groupIds?.includes(group.id));
  const rule = state.adminConfig.automaticGrouping;

  const links: { label: string; value: string; to?: string }[] = [
    {
      label: "National Community",
      value: LOCATIONS.nationalCommunity,
      to: "/admin/locations",
    },
    { label: "City", value: city ?? "No city", to: city ? "/admin/locations" : undefined },
    { label: "Local area", value: localArea ?? "No local area", to: localArea ? "/admin/locations" : undefined },
    { label: "Owner business", value: owner.name, to: `/admin/groups/all` },
    { label: "Account manager", value: relationshipName(group.accountManagerId) },
    { label: "Agent", value: relationshipName(group.agentId) },
    { label: "Consultant", value: relationshipName(group.consultantId) },
    { label: "Programme", value: programme?.name ?? "No programme" },
  ];

  return (
    <div className="flex flex-col gap-4">
      <AdminGroupTabsHeader
        title="19 — Admin Group Relationships"
        subtitle={`${group.name} — every relationship the specification lists: location, business, campaign, membership, agent, account manager and consultant.`}
      />

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <StatCard
          label="Members"
          value={memberCountOf(group).toLocaleString("en-GB")}
          hint={group.source === "automatic" ? `Threshold ${rule.threshold}` : "User configured"}
          accent="gold"
        />
        <StatCard
          label="Linked campaigns"
          value={campaigns.length.toLocaleString("en-GB")}
          hint="Campaign ≠ group"
          accent="info"
        />
        <StatCard
          label="Activity entries"
          value={activity.length.toLocaleString("en-GB")}
          hint="Recorded for this group"
          accent="success"
        />
        <StatCard
          label="Source"
          value={group.source === "automatic" ? "Automatic" : "User created"}
          hint={group.source === "automatic" ? "Created by the system" : `Owner ${group.ownerName}`}
          accent="warning"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card data-tour="location">
          <CardBody className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <CardTitle>Location hierarchy</CardTitle>
            </div>
            <ol className="flex flex-col gap-2 text-xs">
              <li className="flex items-center justify-between gap-2 rounded-xl border border-white/10 bg-ink-950/60 px-3 py-2.5">
                <span className="text-slate-400">National Community</span>
                <span className="font-semibold text-white">{LOCATIONS.nationalCommunity}</span>
              </li>
              <li className="flex items-center justify-between gap-2 rounded-xl border border-white/10 bg-ink-950/60 px-3 py-2.5">
                <span className="text-slate-400">City</span>
                <span className="font-semibold text-white">
                  {city ? `${city} · ${cityEntry ? cityEntry.areas.length : 0} areas` : "No city"}
                </span>
              </li>
              <li className="flex items-center justify-between gap-2 rounded-xl border border-white/10 bg-ink-950/60 px-3 py-2.5">
                <span className="text-slate-400">Local area</span>
                <span className="font-semibold text-white">
                  {localArea
                    ? `${localArea}${areaEntry ? "" : " · outside the configured hierarchy"}`
                    : "No local area"}
                </span>
              </li>
              <li className="flex items-center justify-between gap-2 rounded-xl border border-gold-500/30 bg-gold-500/10 px-3 py-2.5">
                <span className="text-gold-200">This group</span>
                <span className="font-semibold text-white">{group.name}</span>
              </li>
            </ol>
            <p className="flex items-start gap-2 rounded-xl border border-white/10 bg-ink-950/60 p-3 text-[11px] leading-relaxed text-slate-500">
              <MapPinned className="mt-px size-3.5 shrink-0 text-gold-400" />
              A group may sit at city or local-area level, but joining one never moves your location
              relationship — that is maintained separately.
            </p>
            <Link
              to="/admin/locations"
              className="inline-flex items-center gap-1 text-xs font-medium text-gold-300 hover:text-gold-200"
            >
              Open Location Relationships <ArrowRight className="size-3.5" />
            </Link>
          </CardBody>
        </Card>

        <Card data-tour="people">
          <CardBody className="flex flex-col gap-3">
            <CardTitle>People and business relationships</CardTitle>
            <ul className="flex flex-col gap-2 text-xs">
              {links.map((entry) => (
                <li
                  key={entry.label}
                  className="flex items-center justify-between gap-2 rounded-xl border border-white/10 bg-ink-950/60 px-3 py-2.5"
                >
                  <span className="text-slate-400">{entry.label}</span>
                  {entry.to ? (
                    <Link to={entry.to} className="font-semibold text-gold-300 hover:text-gold-200">
                      {entry.value}
                    </Link>
                  ) : (
                    <span className="font-semibold text-white">{entry.value}</span>
                  )}
                </li>
              ))}
            </ul>
            <p className="flex items-start gap-2 rounded-xl border border-white/10 bg-ink-950/60 p-3 text-[11px] leading-relaxed text-slate-500">
              <Building2 className="mt-px size-3.5 shrink-0 text-gold-400" />
              The owner business is a directory entry — the same business can own several groups,
              and owning a group is what gates its controls.
            </p>
          </CardBody>
        </Card>

        <Card data-tour="campaigns">
          <CardBody className="flex flex-col gap-3">
            <CardTitle>Campaigns and programme</CardTitle>
            {campaigns.length === 0 ? (
              <p className="text-xs text-slate-400">No campaign is linked to this group.</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {campaigns.map((campaign) => (
                  <li
                    key={campaign.id}
                    className="flex items-center justify-between gap-2 rounded-xl border border-white/10 bg-ink-950/60 px-3 py-2.5 text-xs"
                  >
                    <span className="font-semibold text-white">{campaign.name}</span>
                    <div className="flex items-center gap-2">
                      <Badge variant={campaign.status === "Active" ? "success" : "muted"}>
                        {campaign.status}
                      </Badge>
                      <span className="text-[11px] text-slate-500">{campaign.platform}</span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
            <div className="flex items-center justify-between gap-2 rounded-xl border border-white/10 bg-ink-950/60 px-3 py-2.5 text-xs">
              <span className="text-slate-400">Membership programme</span>
              <span className="font-semibold text-white">
                {programme ? `${programme.name} · ${programme.tier}` : "No programme"}
              </span>
            </div>
            <p className="text-[11px] leading-relaxed text-slate-500">
              Campaign → Contribution → Configured reward is a separate chain: none of it is
              membership, and none of it changes a group's stage.
            </p>
          </CardBody>
        </Card>

        <Card data-tour="membership">
          <CardBody className="flex flex-col gap-3">
            <CardTitle>Membership relationship</CardTitle>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={group.source === "automatic" ? "info" : "gold"}>
                {group.source === "automatic" ? "Automatic" : "User created"}
              </Badge>
              <Badge variant="muted">{group.accessType} access</Badge>
              <Badge variant="muted">{group.status}</Badge>
              <Badge variant="muted">{group.stage ?? "No stage"}</Badge>
            </div>
            <dl className="flex flex-col gap-2 text-xs">
              <div className="flex items-center justify-between gap-2">
                <dt className="text-slate-400">Members</dt>
                <dd className="font-semibold text-white">{memberCountOf(group)}</dd>
              </div>
              <div className="flex items-center justify-between gap-2">
                <dt className="text-slate-400">Owner</dt>
                <dd className="font-semibold text-white">{group.ownerName}</dd>
              </div>
              <div className="flex items-center justify-between gap-2">
                <dt className="text-slate-400">Created</dt>
                <dd className="font-semibold text-white">{group.createdAt.slice(0, 10)}</dd>
              </div>
              <div className="flex items-center justify-between gap-2">
                <dt className="text-slate-400">Activity entries</dt>
                <dd className="font-semibold text-white">{activity.length}</dd>
              </div>
            </dl>
            <p className="flex items-start gap-2 rounded-xl border border-white/10 bg-ink-950/60 p-3 text-[11px] leading-relaxed text-slate-500">
              <Users className="mt-px size-3.5 shrink-0 text-gold-400" />
              Membership is the relationship between a business and a group — it never implies
              location, campaign or programme membership by itself.
            </p>
          </CardBody>
        </Card>
      </div>

      <SectionHeader
        title="Relationship rule of thumb"
        subtitle="Group ≠ location ≠ campaign ≠ programme: this screen exists so an administrator can see all four at once and never confuse them."
      />
    </div>
  );
}
