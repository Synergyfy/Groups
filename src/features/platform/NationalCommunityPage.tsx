import { Users } from "lucide-react";
import Badge from "../../components/ui/Badge";
import Card, { CardBody, CardTitle } from "../../components/ui/Card";
import EmptyState from "../../components/ui/EmptyState";
import LinkButton from "../../components/ui/LinkButton";
import SectionHeader from "../../components/ui/SectionHeader";
import StatCard from "../../components/ui/StatCard";
import { CURRENT_BUSINESS } from "../../data/businessData";
import { useAppState, useGroupStats } from "../../store/selectors";
import GroupListItem from "../groups/GroupListItem";

const ACTOR_ID = CURRENT_BUSINESS.id;

export default function NationalCommunityPage() {
  const { groups } = useAppState();
  const stats = useGroupStats(ACTOR_ID);

  const community = CURRENT_BUSINESS.nationalCommunity;
  const communityGroups = groups.filter((group) => group.type === "National Community");
  const communityMembers = communityGroups.reduce(
    (total, group) => total + group.memberIds.length,
    0
  );

  return (
    <div className="flex flex-col gap-4">
      <SectionHeader
        title="National Community"
        subtitle="Your membership of the ecosystem-wide National Community — shared by every business, independent of the groups you join."
      />

      <Card>
        <CardBody className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-base font-bold text-white">{community.name}</h2>
              <Badge variant="success">{community.status}</Badge>
            </div>
            <p className="mt-2 max-w-2xl text-xs leading-relaxed text-slate-400">
              Membership is granted with your registration and never expires. You cannot create,
              leave or delete the National Community — it is the container every other group sits
              inside.
            </p>
            <p className="mt-2 text-[11px] text-slate-500">
              Member since {community.joinedAt} · {CURRENT_BUSINESS.city} ·{" "}
              {CURRENT_BUSINESS.localArea}
            </p>
          </div>
          <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-ink-800 text-gold-400">
            <Users className="size-6" />
          </div>
        </CardBody>
      </Card>

      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard
          label="Community groups"
          value={communityGroups.length}
          hint="Groups typed National Community"
          accent="gold"
        />
        <StatCard
          label="Members across them"
          value={communityMembers.toLocaleString("en-GB")}
          hint="Demo figures from the group store"
          accent="info"
        />
        <StatCard
          label="Groups I belong to"
          value={stats.mine}
          hint="Separate from community membership"
          accent="success"
        />
      </div>

      <Card>
        <CardBody className="flex flex-col gap-3">
          <CardTitle>National Community groups</CardTitle>
          {communityGroups.length === 0 ? (
            <EmptyState
              title="No National Community group available"
              description="Community membership still applies — this list only shows groups of that type."
            />
          ) : (
            <div className="flex flex-col gap-2">
              {communityGroups.map((group) => (
                <GroupListItem
                  key={group.id}
                  group={group}
                  to={`/business/groups/${group.id}`}
                  state={{ from: "/business/community", fromLabel: "National Community" }}
                />
              ))}
            </div>
          )}
        </CardBody>
      </Card>

      <Card>
        <CardBody className="flex flex-col gap-3">
          <CardTitle>What this is not</CardTitle>
          <ul className="space-y-2 text-xs leading-relaxed text-slate-400">
            <li>
              <span className="text-slate-200">Not your network group</span> — the automatic
              network group is formed by configured rules and can split at the threshold.
            </li>
            <li>
              <span className="text-slate-200">Not your city</span> — location is the city and
              local area relationship under{" "}
              <span className="text-slate-200">My Location</span>.
            </li>
            <li>
              <span className="text-slate-200">Not a campaign</span> — campaigns reference groups,
              they are not groups.
            </li>
          </ul>
          <div className="flex flex-wrap gap-2">
            <LinkButton to="/business/location" size="sm" variant="outline">
              My Location
            </LinkButton>
            <LinkButton to="/business/groups" size="sm" variant="ghost">
              My groups
            </LinkButton>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
