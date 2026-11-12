import { MapPinned } from "lucide-react";
import Badge from "../../components/ui/Badge";
import Card, { CardBody, CardTitle } from "../../components/ui/Card";
import LinkButton from "../../components/ui/LinkButton";
import SectionHeader from "../../components/ui/SectionHeader";
import StatCard from "../../components/ui/StatCard";
import { CURRENT_BUSINESS } from "../../data/businessData";
import { LOCATIONS } from "../../data/locationsData";
import { useAppState, useGroupStats } from "../../store/selectors";

const ACTOR_ID = CURRENT_BUSINESS.id;

export default function MyLocationPage() {
  const { groups } = useAppState();
  const stats = useGroupStats(ACTOR_ID);

  const city = CURRENT_BUSINESS.city;
  const localArea = CURRENT_BUSINESS.localArea;

  const cityGroups = groups.filter((group) => group.location?.city === city);
  const areaGroups = groups.filter((group) => group.location?.localArea === localArea);
  const cityMembers = cityGroups.reduce((total, group) => total + group.memberIds.length, 0);

  return (
    <div className="flex flex-col gap-4">
      <SectionHeader
        title="My Location"
        subtitle="Your city and local area relationship — a property of your profile, not of any group you belong to."
      />

      <Card>
        <CardBody className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-base font-bold text-white">
                {localArea}, {city}
              </h2>
              <Badge variant="info">Primary location</Badge>
            </div>
            <p className="mt-2 max-w-2xl text-xs leading-relaxed text-slate-400">
              National Community → City → Local area. Automatic grouping uses this hierarchy, so
              changing it would change which network group you are allocated to.
            </p>
            <p className="mt-2 text-[11px] text-slate-500">
              Location since {CURRENT_BUSINESS.joinedAt}
            </p>
          </div>
          <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-ink-800 text-gold-400">
            <MapPinned className="size-6" />
          </div>
        </CardBody>
      </Card>

      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard
          label={`Groups in ${city}`}
          value={cityGroups.length}
          hint={`${cityMembers.toLocaleString("en-GB")} members in total`}
          accent="gold"
        />
        <StatCard
          label={`Groups in ${localArea}`}
          value={areaGroups.length}
          hint="Local area filter used by grouping rules"
          accent="info"
        />
        <StatCard
          label="My groups"
          value={stats.mine}
          hint="Membership is unrelated to location"
          accent="success"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardBody className="flex flex-col gap-3">
            <CardTitle>Configured location hierarchy</CardTitle>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {LOCATIONS.cities.map((entry) => {
                const isMine = entry.name === city;
                return (
                  <div
                    key={entry.id}
                    className={`rounded-xl border p-3 ${
                      isMine
                        ? "border-gold-500/40 bg-gold-500/10"
                        : "border-white/10 bg-ink-950/60"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-semibold text-white">{entry.name}</p>
                      {isMine && <Badge variant="gold">Yours</Badge>}
                    </div>
                    <ul className="mt-2 space-y-1">
                      {entry.areas.map((area) => (
                        <li
                          key={area.id}
                          className={`flex items-center justify-between gap-2 text-[11px] ${
                            area.name === localArea ? "text-gold-400" : "text-slate-500"
                          }`}
                        >
                          <span>{area.name}</span>
                          {area.name === localArea && <span>current</span>}
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>
            <p className="text-[11px] leading-relaxed text-slate-500">
              Cities and local areas are maintained by administrators — this screen only displays
              the relationship for your profile.
            </p>
          </CardBody>
        </Card>

        <Card>
          <CardBody className="flex h-full flex-col gap-3">
            <CardTitle>Location vs membership</CardTitle>
            <ul className="space-y-2 text-xs leading-relaxed text-slate-400">
              <li>
                <span className="text-slate-200">Location</span> — where your business sits in the
                hierarchy. One per business.
              </li>
              <li>
                <span className="text-slate-200">Membership</span> — which groups you joined. You
                can belong to groups in other cities.
              </li>
              <li>
                <span className="text-slate-200">Group location</span> — a property of each group,
                shown on its details page.
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
          <CardTitle>Groups in {localArea}</CardTitle>
          <div className="grid gap-2 sm:grid-cols-2">
            {areaGroups.length === 0 ? (
              <p className="text-xs text-slate-500">
                No demo groups are pinned to this local area yet.
              </p>
            ) : (
              areaGroups.map((group) => (
                <div
                  key={group.id}
                  className="rounded-xl border border-white/10 bg-ink-950/60 p-3"
                >
                  <p className="truncate text-xs font-semibold text-white">{group.name}</p>
                  <p className="mt-1 text-[11px] text-slate-500">
                    {group.type} · {group.memberIds.length} members · {group.status}
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
