import {
  Building2,
  ExternalLink,
  MapPin,
  MapPinned,
  ShoppingBag,
  Store,
} from "lucide-react";
import Badge from "../../components/ui/Badge";
import Card, { CardBody, CardTitle } from "../../components/ui/Card";
import LinkButton from "../../components/ui/LinkButton";
import SectionHeader from "../../components/ui/SectionHeader";
import StatCard from "../../components/ui/StatCard";
import { useBusinessData } from "../../business/BusinessDataProvider";
import { mcomProfileUrl } from "../../lib/mcomProfile";

export default function MyLocationPage() {
  const { location, profile } = useBusinessData();

  const current = location?.current;
  const profileLocation = profile?.location;

  const city =
    current?.city ?? profileLocation?.city ?? profile?.business.city ?? "";
  const borough =
    current?.borough ??
    current?.localArea ??
    profileLocation?.borough ??
    profileLocation?.localArea ??
    profile?.business.localArea ??
    "";
  const highStreet =
    current?.highStreet ??
    profileLocation?.highStreet ??
    profile?.business.highStreet ??
    "";
  const localMall =
    current?.localMall ??
    profileLocation?.localMall ??
    profile?.business.localMall ??
    "";
  const postcode =
    current?.postcode ??
    profileLocation?.postcode ??
    profile?.business.postcode ??
    "";

  const cityGroups = location?.cityGroups ?? [];
  const areaGroups = location?.areaGroups ?? [];
  const highStreetGroups = location?.highStreetGroups ?? [];
  const localMallGroups = location?.localMallGroups ?? [];
  const cityMembers = location?.stats.membersInCity ?? 0;

  const nearbyGroups = localMall
    ? localMallGroups
    : highStreet
      ? highStreetGroups
      : borough
        ? areaGroups
        : cityGroups;
  const nearbyName = localMall || highStreet || borough || city;
  const nearbyLevel = localMall
    ? "local mall"
    : highStreet
      ? "high street"
      : borough
        ? "borough"
        : "city";

  const levels = [
    { label: "City", value: city, icon: Building2 },
    { label: "Borough", value: borough, icon: MapPin },
    { label: "High street", value: highStreet, icon: Store },
    { label: "Local mall", value: localMall, icon: ShoppingBag },
  ];

  return (
    <div className="flex flex-col gap-4">
      <SectionHeader
        title="My Location"
        subtitle="Central Hub Solution assigns your city, borough, high street and local mall from the postcode registered on your profile."
      />

      <Card>
        <CardBody className="flex flex-col gap-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <MapPinned className="size-4 text-gold-400" />
                <CardTitle>Your assigned location</CardTitle>
              </div>
              <p className="mt-2 max-w-2xl text-xs leading-relaxed text-slate-400">
                National Community → City → Borough → High street → Local mall.
                This chain is canonical: it decides which city, borough and
                street-level groups you are matched to.
              </p>
            </div>
            <Badge variant="info">
              Postcode {postcode || "not set"}
            </Badge>
          </div>

          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {levels.map(({ label, value, icon: Icon }) => (
              <div
                key={label}
                className={`rounded-xl border p-3 ${
                  value
                    ? "border-white/10 bg-ink-950/60"
                    : "border-dashed border-white/10 bg-transparent"
                }`}
              >
                <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                  <Icon className="size-3.5 text-gold-400" />
                  {label}
                </div>
                <p
                  className={`mt-1.5 truncate text-sm font-semibold ${
                    value ? "text-white" : "text-slate-600"
                  }`}
                  title={value || undefined}
                >
                  {value || "Not assigned"}
                </p>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 bg-ink-950/60 px-3 py-2">
            <p className="text-[11px] text-slate-500">
              Location since{" "}
              {current?.joinedAt?.slice(0, 10) ??
                profile?.joinedAt ??
                "—"}
            </p>
            <a
              href={mcomProfileUrl()}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 rounded-xl border border-gold-500/30 bg-gold-500/10 px-3 py-2 text-xs font-semibold text-gold-300 transition-colors hover:border-gold-500/60 hover:bg-gold-500/20"
            >
              <ExternalLink className="size-3.5" />
              Change postcode in Central Hub
            </a>
          </div>
        </CardBody>
      </Card>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label={`Groups in ${city || "city"}`}
          value={location?.stats.groupsInCity ?? cityGroups.length}
          hint={`${cityMembers.toLocaleString("en-GB")} members in total`}
          accent="gold"
        />
        <StatCard
          label={`Groups in ${borough || "borough"}`}
          value={location?.stats.groupsInArea ?? areaGroups.length}
          hint="Borough-level matches"
          accent="info"
        />
        <StatCard
          label={
            highStreet ? `Groups on ${highStreet}` : "Groups on your high street"
          }
          value={location?.stats.groupsInHighStreet ?? highStreetGroups.length}
          hint={highStreet ? "High-street-level matches" : "No high street assigned"}
          accent="success"
        />
        <StatCard
          label={localMall ? `Groups in ${localMall}` : "Groups in your local mall"}
          value={location?.stats.groupsInLocalMall ?? localMallGroups.length}
          hint={localMall ? "Local-mall-level matches" : "No local mall assigned"}
          accent="warning"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardBody className="flex flex-col gap-3">
            <CardTitle>How your location is assigned</CardTitle>
            <ul className="space-y-2 text-xs leading-relaxed text-slate-400">
              <li>
                <span className="text-slate-200">Postcode first</span> — Central
                Hub Solution resolves your registered postcode to the canonical
                city, borough, high street and local mall.
              </li>
              <li>
                <span className="text-slate-200">Mirrored here</span> — Groups
                only stores the resolved names and ids. It never edits or
                re-resolves the hierarchy.
              </li>
              <li>
                <span className="text-slate-200">Used for matching</span> —
                automatic network groups and location filters read from this
                chain, so changing it changes which groups you are allocated to.
              </li>
            </ul>
            <p className="text-[11px] leading-relaxed text-slate-500">
              Missing high street or local mall? Central Hub could not resolve
              one for the postcode. Update the postcode or choose a nearby
              high street or mall in your Central Hub profile.
            </p>
          </CardBody>
        </Card>

        <Card>
          <CardBody className="flex h-full flex-col gap-3">
            <CardTitle>Location vs membership</CardTitle>
            <ul className="space-y-2 text-xs leading-relaxed text-slate-400">
              <li>
                <span className="text-slate-200">Location</span> — where your
                business sits in the hierarchy. One per business.
              </li>
              <li>
                <span className="text-slate-200">Membership</span> — which groups
                you joined. You can belong to groups in other cities.
              </li>
              <li>
                <span className="text-slate-200">Group location</span> — a
                property of each group, shown on its details page.
              </li>
            </ul>
            <LinkButton
              to="/business/groups/explore"
              size="sm"
              variant="outline"
              className="mt-auto"
            >
              Explore groups by city
            </LinkButton>
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardBody className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle>Groups near you</CardTitle>
            <Badge variant="muted">
              {nearbyName || "No location"} · {nearbyLevel}
            </Badge>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            {nearbyGroups.length === 0 ? (
              <p className="text-xs text-slate-500">
                No groups are pinned to your {nearbyLevel} yet.
              </p>
            ) : (
              nearbyGroups.map((group) => (
                <div
                  key={group.id}
                  className="rounded-xl border border-white/10 bg-ink-950/60 p-3"
                >
                  <p className="truncate text-xs font-semibold text-white">
                    {group.name}
                  </p>
                  <p className="mt-1 text-[11px] text-slate-500">
                    {group.type} · {group.memberIds.length} members ·{" "}
                    {group.status}
                  </p>
                </div>
              ))
            )}
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
