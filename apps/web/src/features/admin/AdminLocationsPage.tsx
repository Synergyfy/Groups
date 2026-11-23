import { useEffect, useMemo, useState } from "react";
import {
  Building2,
  ChevronRight,
  Globe2,
  Loader2,
  MapPin,
  RefreshCw,
  Search,
  Store,
} from "lucide-react";
import Badge from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import Card, { CardBody } from "../../components/ui/Card";
import EmptyState from "../../components/ui/EmptyState";
import SectionHeader from "../../components/ui/SectionHeader";
import StatCard from "../../components/ui/StatCard";
import {
  adminApi,
  type AdminGeographyBoroughDetail,
  type AdminGeographyResponse,
} from "../../admin/adminApi";
import { errorMessage } from "../../app/api";

function formatSynced(value: string | null): string {
  if (!value) return "Never";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown";
  return date.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function AdminLocationsPage() {
  const [data, setData] = useState<AdminGeographyResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [expandedCity, setExpandedCity] = useState<string | null>(null);
  const [openBorough, setOpenBorough] = useState<string | null>(null);
  const [boroughDetail, setBoroughDetail] =
    useState<AdminGeographyBoroughDetail | null>(null);
  const [boroughLoading, setBoroughLoading] = useState(false);

  const sync = async () => {
    setError(null);
    setSyncing(true);
    try {
      const response = await adminApi.syncGeography();
      setData(response);
      setExpandedCity((current) => current ?? response.cities[0]?.id ?? null);
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setSyncing(false);
    }
  };

  useEffect(() => {
    let cancelled = false;
    adminApi
      .geography()
      .then((response) => {
        if (cancelled) return;
        setData(response);
        setExpandedCity(
          (current) => current ?? response.cities[0]?.id ?? null,
        );
      })
      .catch((cause) => {
        if (!cancelled) setError(errorMessage(cause));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const openBoroughDetail = async (boroughId: string) => {
    if (openBorough === boroughId) {
      setOpenBorough(null);
      return;
    }
    setOpenBorough(boroughId);
    setBoroughDetail(null);
    setBoroughLoading(true);
    try {
      setBoroughDetail(await adminApi.geographyBorough(boroughId));
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setBoroughLoading(false);
    }
  };

  const cities = useMemo(() => {
    const rows = data?.cities ?? [];
    const needle = search.trim().toLowerCase();
    if (!needle) return rows;
    return rows.filter(
      (city) =>
        city.name.toLowerCase().includes(needle) ||
        (city.region ?? "").toLowerCase().includes(needle) ||
        city.boroughs.some((borough) =>
          borough.name.toLowerCase().includes(needle),
        ),
    );
  }, [data, search]);

  const counts = data?.counts ?? {
    cities: 0,
    boroughs: 0,
    highStreets: 0,
    localMalls: 0,
  };

  return (
    <div className="flex flex-col gap-4">
      <SectionHeader
        title="Locations"
        subtitle="The city → borough → high street → local mall hierarchy. Managed in Central Hub Solution; Groups mirrors it read-only so group locations always match the canonical data."
        actions={
          <Button
            size="sm"
            variant="outline"
            onClick={() => void sync()}
            disabled={syncing}
          >
            {syncing ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <RefreshCw className="size-4" />
            )}
            {syncing ? "Syncing…" : "Sync now"}
          </Button>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Cities"
          value={counts.cities}
          hint="Top level of the hierarchy"
          icon={<Globe2 className="size-4" />}
          accent="gold"
        />
        <StatCard
          label="Boroughs"
          value={counts.boroughs}
          hint="Local authority districts"
          icon={<MapPin className="size-4" />}
          accent="info"
        />
        <StatCard
          label="High streets"
          value={counts.highStreets}
          hint="Retail streets and wards"
          icon={<Building2 className="size-4" />}
          accent="success"
        />
        <StatCard
          label="Local malls"
          value={counts.localMalls}
          hint="Mall and district scopes"
          icon={<Store className="size-4" />}
          accent="warning"
        />
      </div>

      <Card>
        <CardBody className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={data?.available ? "success" : "warning"}>
                {data?.available ? "Synced" : "Unavailable"}
              </Badge>
              <span className="text-[11px] text-slate-500">
                Last sync: {formatSynced(data?.syncedAt ?? null)}
              </span>
            </div>
            <label className="relative w-full sm:w-72">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-500" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search city, region or borough"
                className="h-9 w-full rounded-xl border border-white/10 bg-ink-950/60 pl-9 pr-3 text-xs text-slate-200 outline-none placeholder:text-slate-600 focus:border-gold-500/50"
              />
            </label>
          </div>

          {error && (
            <div className="rounded-xl border border-danger-500/30 bg-danger-500/10 px-3 py-2 text-xs text-danger-400">
              {error}
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center gap-2 py-12 text-xs text-slate-500">
              <Loader2 className="size-4 animate-spin" />
              Loading the hierarchy…
            </div>
          ) : cities.length === 0 ? (
            <EmptyState
              title={data?.available ? "No matches" : "Hierarchy unavailable"}
              description={
                data?.available
                  ? "Try a different search term."
                  : "Central Hub could not be reached. Run Sync now once it is available."
              }
              icon={<MapPin className="size-6" />}
              action={
                <Button size="sm" variant="outline" onClick={() => void sync()}>
                  <RefreshCw className="size-4" />
                  Try again
                </Button>
              }
            />
          ) : (
            <div className="flex flex-col gap-2">
              {cities.map((city) => {
                const expanded = expandedCity === city.id;
                const highStreetCount = city.boroughs.reduce(
                  (sum, borough) => sum + borough.highStreetCount,
                  0,
                );
                const mallCount = city.boroughs.reduce(
                  (sum, borough) => sum + borough.localMallCount,
                  0,
                );
                return (
                  <div
                    key={city.id}
                    className="overflow-hidden rounded-xl border border-white/10 bg-ink-950/40"
                  >
                    <button
                      type="button"
                      onClick={() => {
                        setExpandedCity(expanded ? null : city.id);
                        setOpenBorough(null);
                      }}
                      className="flex w-full cursor-pointer items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-white/[0.03]"
                    >
                      <ChevronRight
                        className={`size-4 shrink-0 text-slate-500 transition-transform ${
                          expanded ? "rotate-90" : ""
                        }`}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-white">
                          {city.name}
                        </p>
                        <p className="truncate text-[11px] text-slate-500">
                          {city.region ?? city.country}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-2 text-[10px] text-slate-500">
                        <span>{city.boroughs.length} boroughs</span>
                        <span>·</span>
                        <span>{highStreetCount} streets</span>
                        <span>·</span>
                        <span>{mallCount} malls</span>
                      </div>
                    </button>

                    {expanded && (
                      <div className="border-t border-white/10 px-4 py-3">
                        {city.boroughs.length === 0 ? (
                          <p className="text-xs text-slate-500">
                            No boroughs imported for this city yet.
                          </p>
                        ) : (
                          <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
                            {city.boroughs.map((borough) => {
                              const open = openBorough === borough.id;
                              const detail =
                                open && boroughDetail?.boroughId === borough.id
                                  ? boroughDetail
                                  : null;
                              return (
                                <div
                                  key={borough.id}
                                  className={`rounded-xl border p-3 transition-colors ${
                                    open
                                      ? "border-gold-500/40 bg-gold-500/[0.06]"
                                      : "border-white/10 bg-ink-900/60"
                                  }`}
                                >
                                  <button
                                    type="button"
                                    onClick={() =>
                                      void openBoroughDetail(borough.id)
                                    }
                                    className="flex w-full cursor-pointer items-start justify-between gap-2 text-left"
                                  >
                                    <p className="text-xs font-semibold text-slate-200">
                                      {borough.name}
                                    </p>
                                    <Badge variant="muted">
                                      {borough.highStreetCount} streets
                                    </Badge>
                                  </button>

                                  {open && (
                                    <div className="mt-3 border-t border-white/10 pt-2">
                                      {boroughLoading ? (
                                        <div className="flex items-center gap-2 text-[11px] text-slate-500">
                                          <Loader2 className="size-3 animate-spin" />
                                          Loading streets…
                                        </div>
                                      ) : detail ? (
                                        <>
                                          {detail.highStreets.length > 0 && (
                                            <ul className="space-y-1">
                                              {detail.highStreets
                                                .slice(0, 8)
                                                .map((highStreet) => (
                                                  <li
                                                    key={highStreet.id}
                                                    className="flex items-center justify-between gap-2 text-[11px] text-slate-400"
                                                  >
                                                    <span className="truncate">
                                                      {highStreet.name}
                                                    </span>
                                                    <span className="shrink-0 text-slate-600">
                                                      {
                                                        highStreet.localMalls
                                                          .length
                                                      }{" "}
                                                      malls
                                                    </span>
                                                  </li>
                                                ))}
                                              {detail.highStreets.length >
                                                8 && (
                                                <li className="text-[10px] text-slate-600">
                                                  +
                                                  {detail.highStreets.length -
                                                    8}{" "}
                                                  more
                                                </li>
                                              )}
                                            </ul>
                                          )}
                                          {detail.localMalls.length > 0 && (
                                            <div className="mt-2 flex flex-wrap gap-1">
                                              {detail.localMalls
                                                .slice(0, 6)
                                                .map((mall) => (
                                                  <span
                                                    key={mall.id}
                                                    className="inline-flex items-center gap-1 rounded-full border border-gold-500/20 bg-gold-500/10 px-2 py-0.5 text-[10px] text-gold-300"
                                                  >
                                                    <Store className="size-2.5" />
                                                    {mall.name}
                                                  </span>
                                                ))}
                                              {detail.localMalls.length > 6 && (
                                                <span className="text-[10px] text-slate-600">
                                                  +{detail.localMalls.length - 6}{" "}
                                                  more
                                                </span>
                                              )}
                                            </div>
                                          )}
                                          {detail.highStreets.length === 0 &&
                                            detail.localMalls.length === 0 && (
                                              <p className="text-[11px] text-slate-500">
                                                No high streets or malls for
                                                this borough yet.
                                              </p>
                                            )}
                                        </>
                                      ) : null}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          <p className="text-[11px] leading-relaxed text-slate-500">
            This view is read-only. Create, edit and import cities, boroughs, high
            streets and local malls in the Central Hub Solution admin console, then
            run <span className="text-slate-300">Sync now</span> here.
          </p>
        </CardBody>
      </Card>
    </div>
  );
}
