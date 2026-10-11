import { Link } from "react-router-dom";
import { ArrowRight, MapPinned, Network } from "lucide-react";
import Card, { CardBody, CardTitle } from "../../components/ui/Card";
import SectionHeader from "../../components/ui/SectionHeader";
import StatCard from "../../components/ui/StatCard";
import { LOCATIONS } from "../../data/locationsData";
import { useAppState } from "../../store/selectors";
import { memberCountOf } from "../groups/groupUtils";

export default function LocationRelationshipsPage() {
  const state = useAppState();
  const groups = state.groups;

  const locationGroups = groups.filter((group) => group.location?.city);
  const nationalCommunity = groups.find((group) => group.type === "National Community");
  const noLocation = groups.filter((group) => !group.location?.city);

  return (
    <div className="flex flex-col gap-4">
      <SectionHeader
        title="Location Relationships"
        back="/admin/groups"
        subtitle="National Community → city → local area, and which groups sit under each level. Joining a group never changes this hierarchy — it is maintained separately."
      />

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <StatCard
          label="National Community"
          value={nationalCommunity ? memberCountOf(nationalCommunity).toLocaleString("en-GB") : "—"}
          hint="Top of the hierarchy"
          accent="gold"
        />
        <StatCard
          label="Cities"
          value={LOCATIONS.cities.length.toLocaleString("en-GB")}
          hint="Configured hierarchy"
          accent="info"
        />
        <StatCard
          label="Groups with a location"
          value={locationGroups.length.toLocaleString("en-GB")}
          hint="Attached to a city"
          accent="success"
        />
        <StatCard
          label="Groups without a location"
          value={noLocation.length.toLocaleString("en-GB")}
          hint="Counted, never dropped"
          accent="warning"
        />
      </div>

      <Card data-tour="hierarchy">
        <CardBody className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle>Configured hierarchy</CardTitle>
          </div>
          <div className="flex flex-col gap-2 text-xs">
            <div className="flex items-center justify-between gap-2 rounded-xl border border-gold-500/30 bg-gold-500/10 px-3 py-2.5">
              <span className="flex items-center gap-2 font-semibold text-white">
                <Network className="size-4 text-gold-400" /> {LOCATIONS.nationalCommunity}
              </span>
              <span className="text-gold-200">
                {nationalCommunity ? `${memberCountOf(nationalCommunity)} members` : "not assigned"}
              </span>
            </div>
            {LOCATIONS.cities.map((city) => (
              <div
                key={city.id}
                className="flex items-center justify-between gap-2 rounded-xl border border-white/10 bg-ink-950/60 px-3 py-2.5"
              >
                <span className="flex items-center gap-2 font-semibold text-white">
                  <MapPinned className="size-4 text-gold-400" /> {city.name}
                </span>
                <span className="text-slate-400">
                  {city.areas.length} areas ·{" "}
                  {groups.filter((group) => group.location?.city === city.name).length} groups
                </span>
              </div>
            ))}
          </div>
        </CardBody>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2" data-tour="cities">
        {LOCATIONS.cities.map((city) => {
          const cityGroups = groups.filter((group) => group.location?.city === city.name);
          return (
            <Card key={city.id}>
              <CardBody className="flex flex-col gap-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <CardTitle>{city.name}</CardTitle>
                  <span className="text-[11px] text-slate-500">
                    {cityGroups.length} group{cityGroups.length === 1 ? "" : "s"}
                  </span>
                </div>

                <div className="flex flex-wrap gap-2">
                  {city.areas.map((area) => {
                    const areaCount = cityGroups.filter(
                      (group) => group.location?.localArea === area.name
                    ).length;
                    return (
                      <span
                        key={area.id}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-ink-950/60 px-2.5 py-1.5 text-[11px] text-slate-300"
                      >
                        {area.name}
                        <span className="font-semibold text-gold-300">{areaCount}</span>
                      </span>
                    );
                  })}
                </div>

                {cityGroups.length === 0 ? (
                  <p className="text-xs text-slate-400">No group is attached to this city yet.</p>
                ) : (
                  <ul className="flex flex-col gap-2">
                    {cityGroups.map((group) => (
                      <li key={group.id}>
                        <Link
                          to={`/admin/groups/${group.id}`}
                          className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-ink-950/60 px-3 py-2.5 text-xs transition-colors hover:border-gold-500/40"
                        >
                          <span className="min-w-0">
                            <span className="block truncate font-semibold text-white">
                              {group.name}
                            </span>
                            <span className="text-[11px] text-slate-500">
                              {group.location?.localArea ?? "No local area"} · {group.type}
                            </span>
                          </span>
                          <ArrowRight className="size-3.5 shrink-0 text-slate-500" />
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </CardBody>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardBody className="flex flex-col gap-3">
          <CardTitle>Groups without a location</CardTitle>
          {noLocation.length === 0 ? (
            <p className="text-xs text-slate-400">Every group in the demo store has a city.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {noLocation.map((group) => (
                <Link
                  key={group.id}
                  to={`/admin/groups/${group.id}`}
                  className="rounded-lg border border-white/10 bg-ink-950/60 px-2.5 py-1.5 text-[11px] text-slate-300 transition-colors hover:border-gold-500/40 hover:text-white"
                >
                  {group.name}
                </Link>
              ))}
            </div>
          )}
          <p className="text-[11px] leading-relaxed text-slate-500">
            A group without a location still exists in the register and reports — it is simply not
            attached to the hierarchy, and no report silently discards it.
          </p>
        </CardBody>
      </Card>
    </div>
  );
}
