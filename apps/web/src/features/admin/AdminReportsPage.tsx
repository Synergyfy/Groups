import Card, { CardBody, CardTitle } from "../../components/ui/Card";
import SectionHeader from "../../components/ui/SectionHeader";
import StatCard from "../../components/ui/StatCard";
import Table from "../../components/ui/Table";
import type { TableColumn } from "../../components/ui/Table";
import TipIcon from "../../components/ui/TipIcon";
import BarChart from "../../components/ui/charts/BarChart";
import type { BarDatum } from "../../components/ui/charts/BarChart";
import Donut from "../../components/ui/charts/Donut";
import { useAppState, useNetworkStats } from "../../store/selectors";
import { memberCountOf } from "../groups/groupUtils";

interface TypeRow {
  type: string;
  groups: number;
  members: number;
  automatic: number;
}

const MONTH_LABEL = (key: string) => {
  const [year, month] = key.split("-");
  const names = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  const index = Number(month) - 1;
  return `${names[index] ?? month} ${year.slice(2)}`;
};

export default function AdminReportsPage() {
  const state = useAppState();
  const network = useNetworkStats();

  const groups = state.groups;
  const totalMembers = groups.reduce((sum, group) => sum + memberCountOf(group), 0);
  const businesses = new Set(groups.map((group) => group.ownerId)).size;
  const cities = new Set(
    groups.map((group) => group.location?.city).filter((city): city is string => Boolean(city))
  ).size;
  const automatic = groups.filter((group) => group.source === "automatic").length;
  const userCreated = groups.length - automatic;

  const byType = new Map<string, { groups: number; members: number; automatic: number }>();
  for (const group of groups) {
    const entry = byType.get(group.type) ?? { groups: 0, members: 0, automatic: 0 };
    entry.groups += 1;
    entry.members += memberCountOf(group);
    entry.automatic += group.source === "automatic" ? 1 : 0;
    byType.set(group.type, entry);
  }
  const typeRows: TypeRow[] = [...byType.entries()]
    .map(([type, entry]) => ({ type, ...entry }))
    .sort((a, b) => b.groups - a.groups);

  const typeBars: BarDatum[] = typeRows.map((row) => ({ label: row.type, value: row.groups }));

  const byMonth = new Map<string, number>();
  for (const group of [...groups].sort((a, b) => a.createdAt.localeCompare(b.createdAt))) {
    const key = group.createdAt.slice(0, 7);
    byMonth.set(key, (byMonth.get(key) ?? 0) + 1);
  }
  const growthBars: BarDatum[] = [...byMonth.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([key, value]) => ({ label: MONTH_LABEL(key), value }));

  const byCity = new Map<string, number>();
  for (const group of groups) {
    const city = group.location?.city ?? "No location";
    byCity.set(city, (byCity.get(city) ?? 0) + 1);
  }
  const cityBars: BarDatum[] = [...byCity.entries()]
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value);

  const typeColumns: TableColumn<TypeRow>[] = [
    { key: "type", header: "Type", render: (row) => <span className="font-semibold text-white">{row.type}</span> },
    { key: "groups", header: "Groups", align: "right", render: (row) => row.groups },
    { key: "members", header: "Members", align: "right", render: (row) => row.members },
    {
      key: "automatic",
      header: "Automatic",
      align: "right",
      render: (row) => <span className="text-slate-300">{row.automatic}</span>,
    },
    {
      key: "origin",
      header: "Origin",
      render: (row) => (
        <span className="text-[11px] text-slate-400">
          {row.automatic === row.groups
            ? "System created"
            : row.automatic === 0
              ? "User created"
              : "Mixed"}
        </span>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      <SectionHeader
        title="22 — Group Reports & Statistics"
        back="/admin/groups"
        subtitle="National network reporting: totals, origin distribution and growth — every figure aggregated from the demo store, with origin always shown alongside volume."
        tip="Figures come straight from the store and update on their own — there is nothing to refresh."
      />

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <StatCard
          label="Groups"
          value={groups.length.toLocaleString("en-GB")}
          hint="National total"
          accent="gold"
        />
        <StatCard
          label="Members"
          value={totalMembers.toLocaleString("en-GB")}
          hint="Seats across all groups"
          accent="info"
        />
        <StatCard
          label="Businesses"
          value={businesses.toLocaleString("en-GB")}
          hint="Distinct group owners"
          accent="success"
        />
        <StatCard
          label="Cities covered"
          value={cities.toLocaleString("en-GB")}
          hint="From the location hierarchy"
          accent="warning"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card data-tour="origin">
          <CardBody className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                <CardTitle>Origin distribution</CardTitle>
                <TipIcon text="The centre figure is all groups; the ring splits them by who created them." />
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-5">
              <Donut
                data={[
                  { label: "Automatic", value: automatic, color: "#38bdf8" },
                  { label: "User created", value: userCreated, color: "#e6a92b" },
                ]}
                centerValue={String(groups.length)}
                centerLabel="groups"
              />
              <div className="flex flex-col gap-2 text-xs">
                <p className="text-slate-400">
                  The split every report keeps visible: what the system built versus what businesses
                  built.
                </p>
                <p className="font-semibold text-white">
                  {automatic} automatic · {userCreated} user created
                </p>
                <p className="text-slate-500">
                  Network groups: {network.networkGroups} · National communities:{" "}
                  {network.nationalCommunities}
                </p>
              </div>
            </div>
          </CardBody>
        </Card>

        <Card data-tour="growth">
          <CardBody className="flex flex-col gap-3">
            <div className="flex items-center gap-1.5">
              <CardTitle>Growth — groups created per month</CardTitle>
              <TipIcon text="Counts groups by the month their creation date falls in." />
            </div>
            <BarChart data={growthBars} accent="#34d399" />
            <p className="text-[11px] leading-relaxed text-slate-500">
              Creation dates come from the demo store; a month with no bar had no groups created.
            </p>
          </CardBody>
        </Card>

        <Card data-tour="types">
          <CardBody className="flex flex-col gap-3">
            <div className="flex items-center gap-1.5">
              <CardTitle>Groups by type</CardTitle>
              <TipIcon text="One bar per group type, sized by how many groups have that type." />
            </div>
            <BarChart data={typeBars} />
          </CardBody>
        </Card>

        <Card data-tour="cities">
          <CardBody className="flex flex-col gap-3">
            <div className="flex items-center gap-1.5">
              <CardTitle>Groups by city</CardTitle>
              <TipIcon text="One bar per city, sized by how many groups are based there." />
            </div>
            <BarChart data={cityBars} accent="#a78bfa" />
          </CardBody>
        </Card>
      </div>

      <Card data-tour="table">
        <CardBody className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-1.5">
              <CardTitle>Type totals</CardTitle>
              <TipIcon text="Rows are sorted by group count, largest first." />
            </div>
            <span className="text-[11px] text-slate-500">
              Volume with origin beside it — a report never shows a total without saying where it
              came from.
            </span>
          </div>
          <Table columns={typeColumns} rows={typeRows} rowKey={(row) => row.type} />
        </CardBody>
      </Card>

      <Card>
        <CardBody className="flex flex-col gap-3">
          <CardTitle>How to read this report</CardTitle>
          <ul className="flex flex-col gap-2 text-xs leading-relaxed text-slate-400">
            <li className="rounded-xl border border-white/10 bg-ink-950/60 px-3 py-2.5">
              Groups, members and businesses are counted from live store state, not a fixed table.
            </li>
            <li className="rounded-xl border border-white/10 bg-ink-950/60 px-3 py-2.5">
              Automatic groups are governed by the configured threshold — change it in Automatic
              Group Rules and the dashboard figures follow.
            </li>
            <li className="rounded-xl border border-white/10 bg-ink-950/60 px-3 py-2.5">
              Cities come from the location hierarchy; a group without a location is counted under
              "No location", never dropped.
            </li>
          </ul>
        </CardBody>
      </Card>
    </div>
  );
}
