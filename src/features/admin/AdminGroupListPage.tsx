import { useState } from "react";
import { Link } from "react-router-dom";
import { Filter, RotateCcw, Search, SlidersHorizontal } from "lucide-react";
import Badge from "../../components/ui/Badge";
import BottomSheet from "../../components/ui/BottomSheet";
import Card, { CardBody, CardTitle } from "../../components/ui/Card";
import EmptyState from "../../components/ui/EmptyState";
import FilterBar, { FilterSelect } from "../../components/ui/FilterBar";
import SectionHeader from "../../components/ui/SectionHeader";
import { SkeletonCard, SkeletonRows } from "../../components/ui/Skeleton";
import Table from "../../components/ui/Table";
import type { TableColumn } from "../../components/ui/Table";
import Button from "../../components/ui/Button";
import TipIcon from "../../components/ui/TipIcon";
import { PROGRAMMES } from "../../data/businessData";
import type { AdminGroupFilters, Group } from "../../domain/types";
import { useDemoLoading } from "../../lib/demoDelay";
import { useAdminFilteredGroups, useAppState } from "../../store/selectors";
import { memberCountOf } from "../groups/groupUtils";

const BLANK_FILTERS: AdminGroupFilters = {
  type: "all",
  city: "all",
  localArea: "all",
  status: "all",
  stage: "all",
  owner: "all",
  programme: "all",
  source: "all",
  query: "",
};

function options(values: string[], allLabel: string) {
  const unique = [...new Set(values)].filter((value) => value.length > 0).sort();
  return [{ value: "all", label: allLabel }, ...unique.map((value) => ({ value, label: value }))];
}

export default function AdminGroupListPage() {
  const loading = useDemoLoading();
  const state = useAppState();
  const [filters, setFilters] = useState<AdminGroupFilters>(BLANK_FILTERS);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const groups = useAdminFilteredGroups(filters);

  const patch = (next: Partial<AdminGroupFilters>) =>
    setFilters((current) => ({ ...current, ...next }));

  const cities = options(state.groups.map((group) => group.location?.city ?? ""), "All cities");
  const localAreas = options(
    state.groups
      .filter((group) => filters.city === "all" || group.location?.city === filters.city)
      .map((group) => group.location?.localArea ?? ""),
    "All local areas"
  );

  const activeFilterCount = (Object.keys(filters) as (keyof AdminGroupFilters)[]).filter((key) =>
    key === "query" ? filters.query !== "" : filters[key] !== "all"
  ).length;
  const isBlank = activeFilterCount === 0;

  const columns: TableColumn<Group>[] = [
    {
      key: "name",
      header: "Group",
      render: (group) => (
        <Link
          to={`/admin/groups/${group.id}`}
          className="font-semibold text-white transition-colors hover:text-gold-300"
        >
          {group.name}
        </Link>
      ),
    },
    {
      key: "type",
      header: "Type",
      render: (group) => <span className="text-slate-300">{group.type}</span>,
    },
    {
      key: "source",
      header: "Source",
      render: (group) => (
        <Badge variant={group.source === "automatic" ? "info" : "gold"}>
          {group.source === "automatic" ? "Automatic" : "User created"}
        </Badge>
      ),
    },
    {
      key: "stage",
      header: "Stage",
      render: (group) => <span className="text-slate-300">{group.stage ?? "—"}</span>,
    },
    {
      key: "status",
      header: "Status",
      render: (group) => (
        <Badge
          variant={
            group.status === "Active"
              ? "success"
              : group.status === "Recruiting"
                ? "gold"
                : group.status === "Pending Review"
                  ? "warning"
                  : "muted"
          }
        >
          {group.status}
        </Badge>
      ),
    },
    {
      key: "owner",
      header: "Owner",
      render: (group) => <span className="text-slate-300">{group.ownerName}</span>,
    },
    {
      key: "city",
      header: "City",
      render: (group) => (
        <span className="text-slate-300">{group.location?.city ?? "No location"}</span>
      ),
    },
    {
      key: "members",
      header: "Members",
      align: "right",
      render: (group) => (
        <span className="font-semibold text-white">{memberCountOf(group)}</span>
      ),
    },
  ];

  const filterSelects = (
    <>
      <FilterSelect
        label="Type"
        tip="Filter by group type — types are configured by the administrator."
        value={filters.type}
        onChange={(value) => patch({ type: value })}
        options={options(
          [
            ...state.groups.map((group) => group.type),
            ...state.adminConfig.groupTypes.map((entry) => entry.type),
          ],
          "All types"
        )}
      />
      <FilterSelect
        label="City"
        tip="Filter by city — location comes from each group's saved address."
        value={filters.city}
        onChange={(value) => patch({ city: value, localArea: "all" })}
        options={cities}
      />
      <FilterSelect
        label="Local area"
        tip="Narrow to one local area; options follow the city picked above."
        value={filters.localArea}
        onChange={(value) => patch({ localArea: value })}
        options={localAreas}
      />
      <FilterSelect
        label="Stage"
        tip="Filter by stage label — labels are configured by the administrator."
        value={filters.stage}
        onChange={(value) => patch({ stage: value })}
        options={options(
          [
            ...state.adminConfig.stageLabels,
            ...state.groups.map((group) => group.stage ?? ""),
          ],
          "All stages"
        )}
      />
      <FilterSelect
        label="Status"
        tip="Show only groups in this status: Active, Recruiting, Pending Review or Closed."
        value={filters.status}
        onChange={(value) => patch({ status: value })}
        options={options(state.groups.map((group) => group.status), "All statuses")}
      />
      <FilterSelect
        label="Owner"
        tip="Show only groups whose owner is this business."
        value={filters.owner}
        onChange={(value) => patch({ owner: value })}
        options={options(state.groups.map((group) => group.ownerName), "All owners")}
      />
      <FilterSelect
        label="Programme"
        tip="Filter by programme; 'No programme' shows groups not linked to one."
        value={filters.programme}
        onChange={(value) => patch({ programme: value })}
        options={[
          { value: "all", label: "All programmes" },
          ...PROGRAMMES.map((entry) => ({ value: entry.id, label: entry.name })),
          { value: "", label: "No programme" },
        ]}
      />
      <FilterSelect
        label="Source"
        tip="Automatic groups are created by rules; user-created ones by businesses."
        value={filters.source}
        onChange={(value) => patch({ source: value as AdminGroupFilters["source"] })}
        options={[
          { value: "all", label: "All sources" },
          { value: "automatic", label: "Automatic" },
          { value: "user-created", label: "User created" },
        ]}
      />
    </>
  );

  if (loading) {
    return (
      <div className="flex flex-col gap-4">
        <SkeletonCard />
        <SkeletonRows rows={6} />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <SectionHeader
        title="15 — Admin Group List"
        subtitle="The central register: every group in the network with type, stage, status, owner, city and source, filtered the way an administrator works."
        actions={
          <TipIcon text="Search covers group names, purposes, owners and types — the same box on mobile and desktop." />
        }
      />

      <div className="flex gap-2 md:hidden">
        <div className="flex h-11 min-w-0 flex-1 items-center gap-2 rounded-xl border border-white/10 bg-ink-900/70 px-3">
          <Search className="size-4 shrink-0 text-slate-500" />
          <input
            value={filters.query}
            onChange={(event) => patch({ query: event.target.value })}
            placeholder="Search name, purpose, owner or type"
            className="h-11 w-full bg-transparent text-sm text-white outline-none placeholder:text-slate-500"
          />
        </div>
        <Button
          variant="outline"
          size="md"
          onClick={() => setFiltersOpen(true)}
          className="shrink-0"
        >
          <SlidersHorizontal className="size-4" /> Filters
          {activeFilterCount > 0 && (
            <span className="rounded-full bg-gold-500/20 px-1.5 py-0.5 text-[10px] font-semibold text-gold-200">
              {activeFilterCount}
            </span>
          )}
        </Button>
      </div>

      <div data-tour="filters" className="hidden md:block">
        <FilterBar>
          <div className="flex min-w-56 flex-1 items-center gap-2 rounded-xl border border-white/10 bg-ink-900/70 px-3">
            <Search className="size-4 shrink-0 text-slate-500" />
            <input
              value={filters.query}
              onChange={(event) => patch({ query: event.target.value })}
              placeholder="Search name, purpose, owner or type"
              className="h-10 w-full bg-transparent text-xs text-white outline-none placeholder:text-slate-500"
            />
          </div>

          {filterSelects}

          <Button variant="ghost" size="sm" onClick={() => setFilters(BLANK_FILTERS)} disabled={isBlank}>
            <RotateCcw className="size-3.5" /> Reset
          </Button>
        </FilterBar>
      </div>

      <BottomSheet
        open={filtersOpen}
        title="Filter groups"
        onClose={() => setFiltersOpen(false)}
        footer={
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="md"
              onClick={() => setFilters(BLANK_FILTERS)}
              disabled={isBlank}
              className="flex-1"
            >
              <RotateCcw className="size-4" /> Reset
            </Button>
            <Button
              variant="primary"
              size="md"
              onClick={() => setFiltersOpen(false)}
              className="flex-1"
            >
              Show {groups.length} groups
            </Button>
          </div>
        }
      >
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">{filterSelects}</div>
      </BottomSheet>

      <div className="flex flex-wrap items-center justify-between gap-2" data-tour="summary">
        <p className="text-xs text-slate-400">
          Showing <span className="font-semibold text-white">{groups.length}</span> of{" "}
          <span className="font-semibold text-white">{state.groups.length}</span> groups
        </p>
        <div className="flex items-center gap-2">
          <Filter className="size-3.5 text-gold-400" />
          <span className="text-[11px] text-slate-500">
            Filters come from the administrator's configuration — types, stages and the hierarchy.
          </span>
        </div>
      </div>

      {groups.length === 0 ? (
        <EmptyState
          title="No groups match these filters"
          description="Loosen a filter or reset the search to see the full register again."
          icon={<Filter className="size-6" />}
        />
      ) : (
        <Card data-tour="list">
          <CardBody className="flex flex-col gap-3">
            <CardTitle>Group register</CardTitle>
            <Table columns={columns} rows={groups} rowKey={(group) => group.id} />
          </CardBody>
        </Card>
      )}
    </div>
  );
}
