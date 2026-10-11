import { useMemo, useState } from "react";
import { Check, Lock, RotateCcw, Search, Send, SlidersHorizontal, Sparkles } from "lucide-react";
import BottomSheet from "../../components/ui/BottomSheet";
import Button from "../../components/ui/Button";
import Card, { CardBody, CardTitle } from "../../components/ui/Card";
import EmptyState from "../../components/ui/EmptyState";
import FieldHint from "../../components/ui/FieldHint";
import FilterBar, { FilterSelect } from "../../components/ui/FilterBar";
import LinkButton from "../../components/ui/LinkButton";
import SectionHeader from "../../components/ui/SectionHeader";
import { SkeletonRows } from "../../components/ui/Skeleton";
import Toast from "../../components/ui/Toast";
import type { Group, GroupAccessType } from "../../domain/types";
import { CURRENT_BUSINESS } from "../../data/businessData";
import { CITY_NAMES } from "../../data/locationsData";
import { useDemoLoading } from "../../lib/demoDelay";
import { useAppStore } from "../../store/context";
import { useAppState, useExploreGroups } from "../../store/selectors";
import GroupListItem from "./GroupListItem";

const ACTOR_ID = CURRENT_BUSINESS.id;

const ACCESS_INFO: Record<GroupAccessType, { label: string; hint: string }> = {
  open: { label: "Open", hint: "Join instantly — no approval needed." },
  request: { label: "Request", hint: "Send a request; the owner approves it." },
  eligibility: {
    label: "Eligibility",
    hint: "Membership conditions apply before you can join.",
  },
  invitation: { label: "Invitation", hint: "By invitation only — the owner must invite you." },
};

export default function ExploreGroupsPage() {
  const loading = useDemoLoading();
  const explore = useExploreGroups(ACTOR_ID);
  const { adminConfig, invitations } = useAppState();
  const { dispatch } = useAppStore();

  const [query, setQuery] = useState("");
  const [type, setType] = useState("all");
  const [access, setAccess] = useState("all");
  const [status, setStatus] = useState("all");
  const [city, setCity] = useState("all");
  const [localArea, setLocalArea] = useState("all");
  const [membership, setMembership] = useState("all");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const pendingRequestIds = useMemo(
    () =>
      new Set(
        invitations
          .filter(
            (invitation) =>
              invitation.kind === "request" &&
              invitation.inviteeId === ACTOR_ID &&
              invitation.status === "pending"
          )
          .map((invitation) => invitation.groupId)
      ),
    [invitations]
  );

  const pendingInviteIds = useMemo(
    () =>
      new Set(
        invitations
          .filter(
            (invitation) =>
              invitation.kind === "invite" &&
              invitation.inviteeId === ACTOR_ID &&
              invitation.status === "pending"
          )
          .map((invitation) => invitation.groupId)
      ),
    [invitations]
  );

  const typeOptions = useMemo(
    () => [
      { value: "all", label: "All types" },
      ...Array.from(new Set(explore.map((group) => group.type)))
        .sort()
        .map((entry) => ({ value: entry, label: entry })),
    ],
    [explore]
  );

  const localAreaOptions = useMemo(() => {
    const areas = explore
      .filter((group) => city === "all" || group.location?.city === city)
      .map((group) => group.location?.localArea)
      .filter((area): area is string => Boolean(area));
    return [
      { value: "all", label: "All local areas" },
      ...Array.from(new Set(areas))
        .sort()
        .map((area) => ({ value: area, label: area })),
    ];
  }, [explore, city]);

  const membershipStates = useMemo(() => {
    const map = new Map<string, string>();
    for (const group of explore) {
      let state: string;
      if (pendingRequestIds.has(group.id)) state = "pending";
      else if (pendingInviteIds.has(group.id)) state = "invited";
      else if (group.source === "automatic") state = "blocked";
      else {
        const config = adminConfig.groupTypes.find((entry) => entry.type === group.type);
        if (config && (config.enabled === false || config.allowJoin === false))
          state = "blocked";
        else if (group.accessType === "invitation") state = "blocked";
        else if (group.accessType === "open") state = "instant";
        else state = "approval";
      }
      map.set(group.id, state);
    }
    return map;
  }, [explore, pendingRequestIds, pendingInviteIds, adminConfig]);

  const filtered = useMemo(() => {
    const search = query.trim().toLowerCase();
    return explore
      .filter((group) => {
        if (type !== "all" && group.type !== type) return false;
        if (access !== "all" && group.accessType !== access) return false;
        if (status !== "all" && group.status !== status) return false;
        if (city !== "all" && group.location?.city !== city) return false;
        if (localArea !== "all" && group.location?.localArea !== localArea) return false;
        if (membership !== "all" && membershipStates.get(group.id) !== membership) return false;
        if (!search) return true;
        return `${group.name} ${group.purpose} ${group.type} ${
          group.location?.city ?? ""
        } ${group.location?.localArea ?? ""}`
          .toLowerCase()
          .includes(search);
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [explore, query, type, access, status, city, localArea, membership, membershipStates]);

  const joinPlan = (group: Group) => {
    if (group.source === "automatic") {
      return { disabled: true, label: "System allocated", hint: "Automatic groups are allocated by the system." };
    }
    const config = adminConfig.groupTypes.find((entry) => entry.type === group.type);
    if (config && (config.enabled === false || config.allowJoin === false)) {
      return { disabled: true, label: "Joining disabled", hint: "Administrators turned off joining for this type." };
    }
    if (pendingRequestIds.has(group.id)) {
      return { disabled: true, label: "Request pending", hint: "Your request is waiting for the owner." };
    }
    if (group.accessType === "invitation") {
      return { disabled: true, label: "Invitation only", hint: ACCESS_INFO.invitation.hint };
    }
    if (group.accessType === "open") {
      return { disabled: false, label: "Join group", hint: ACCESS_INFO.open.hint };
    }
    return { disabled: false, label: "Request to join", hint: ACCESS_INFO[group.accessType].hint };
  };

  const handleJoin = (group: Group) => {
    dispatch({
      type: "group/join",
      groupId: group.id,
      actor: { id: ACTOR_ID, name: CURRENT_BUSINESS.businessName },
    });
    setFeedback(
      group.accessType === "open"
        ? `You joined ${group.name}`
        : `Join request sent to ${group.name}`
    );
  };

  const resetFilters = () => {
    setQuery("");
    setType("all");
    setAccess("all");
    setStatus("all");
    setCity("all");
    setLocalArea("all");
    setMembership("all");
  };

  const openCount = filtered.filter((group) => group.accessType === "open").length;

  const filterFields = (
    <>
      <FilterSelect
        label="Type"
        value={type}
        options={typeOptions}
        onChange={setType}
        tip="Filters groups by their administrator-defined group type."
      />
      <FilterSelect
        label="Access"
        value={access}
        options={[
          { value: "all", label: "All access" },
          ...Object.entries(ACCESS_INFO).map(([value, info]) => ({ value, label: info.label })),
        ]}
        onChange={setAccess}
        tip="Filters by how you join: open, request, eligibility or invitation."
      />
      <FilterSelect
        label="Status"
        value={status}
        options={[
          { value: "all", label: "All statuses" },
          { value: "Active", label: "Active" },
          { value: "Recruiting", label: "Recruiting" },
          { value: "Pending Review", label: "Pending Review" },
        ]}
        onChange={setStatus}
        tip="Filters by the group's current lifecycle status."
      />
      <FilterSelect
        label="City"
        value={city}
        options={[
          { value: "all", label: "All cities" },
          ...CITY_NAMES.map((entry) => ({ value: entry, label: entry })),
        ]}
        onChange={(value) => {
          setCity(value);
          setLocalArea("all");
        }}
        tip="Shows only groups based in the selected city."
      />
      <FilterSelect
        label="Local area"
        value={localArea}
        options={localAreaOptions}
        onChange={setLocalArea}
        tip="Narrows results to one local area within the selected city."
      />
      <FilterSelect
        label="Membership"
        value={membership}
        options={[
          { value: "all", label: "Any membership" },
          { value: "instant", label: "Ready to join" },
          { value: "approval", label: "Needs approval" },
          { value: "pending", label: "Request pending" },
          { value: "invited", label: "Invitation waiting" },
          { value: "blocked", label: "Not eligible" },
        ]}
        onChange={setMembership}
        tip="Filters by your state: ready to join, waiting, or not eligible."
      />
    </>
  );

  const activeFilterCount = [type, access, status, city, localArea, membership].filter(
    (value) => value !== "all"
  ).length;

  return (
    <div className="flex flex-col gap-4">
      <SectionHeader
        title="05 — Explore Groups"
        subtitle="Discover groups you can join — search, filter by type, access rules, status, city, local area and membership state, then join instantly or send a request."
        back="/business/groups"
        backLabel="Group Circle"
        actions={
          <LinkButton to="/business/groups/create" size="sm">
            <Sparkles className="size-4" /> Create Group
          </LinkButton>
        }
      />

      <div data-tour="filters" className="flex flex-col gap-3">
        <label className="flex flex-col gap-1.5">
          <span className="text-[11px] font-medium text-slate-400">Search groups</span>
          <FieldHint>Matches group name, purpose, type and city as you type.</FieldHint>
          <div className="flex h-11 items-center gap-2 rounded-xl border border-white/10 bg-ink-900/70 px-3">
            <Search className="size-4 shrink-0 text-slate-500" />
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Name, purpose or city"
              className="h-full w-full bg-transparent text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none"
            />
          </div>
        </label>

        <div className="md:hidden">
          <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
            {typeOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setType(option.value)}
                className={`min-h-10 shrink-0 cursor-pointer rounded-full border px-4 text-xs font-medium transition-colors ${
                  type === option.value
                    ? "border-gold-500/50 bg-gold-500/15 text-gold-200"
                    : "border-white/10 bg-ink-900 text-slate-400"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
          <div className="mt-3 flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setFiltersOpen(true)}>
              <SlidersHorizontal className="size-3.5" /> Filters
              {activeFilterCount > 0 && (
                <span className="rounded-full bg-gold-500 px-1.5 text-[10px] font-bold text-ink-950">
                  {activeFilterCount}
                </span>
              )}
            </Button>
            {activeFilterCount > 0 && (
              <Button variant="ghost" size="sm" onClick={resetFilters}>
                <RotateCcw className="size-3.5" /> Reset
              </Button>
            )}
          </div>
        </div>

        <div className="hidden md:block">
          <FilterBar>
            {filterFields}
            <Button variant="ghost" size="sm" onClick={resetFilters}>
              <RotateCcw className="size-3.5" /> Reset
            </Button>
          </FilterBar>
        </div>
      </div>

      <BottomSheet
        open={filtersOpen}
        title="Filters"
        onClose={() => setFiltersOpen(false)}
        footer={
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="lg"
              className="flex-1"
              onClick={() => {
                resetFilters();
              }}
            >
              <RotateCcw className="size-4" /> Reset
            </Button>
            <Button
              variant="primary"
              size="lg"
              className="flex-1"
              onClick={() => setFiltersOpen(false)}
            >
              Show {filtered.length} groups
            </Button>
          </div>
        }
      >
        <div className="flex flex-col gap-3">{filterFields}</div>
      </BottomSheet>

      <p className="text-xs text-slate-400">
        Showing {loading ? "…" : filtered.length} of {explore.length} eligible groups · {openCount}{" "}
        open to join immediately
      </p>

      {loading ? (
        <SkeletonRows rows={3} />
      ) : filtered.length === 0 ? (
        <EmptyState
          title="No groups match these filters"
          description="Clear the filters or search for a different name, type or city."
          action={
            <Button variant="outline" size="sm" onClick={resetFilters}>
              Clear filters
            </Button>
          }
        />
      ) : (
        <div className="flex flex-col gap-2" data-tour="list">
          {filtered.map((group) => {
            const plan = joinPlan(group);
            return (
              <GroupListItem
                key={group.id}
                group={group}
                to={`/business/groups/${group.id}`}
                state={{ from: "/business/groups/explore", fromLabel: "Explore Groups" }}
                footer={
                  <Button
                    size="sm"
                    variant={plan.disabled ? "secondary" : "primary"}
                    disabled={plan.disabled}
                    title={plan.hint}
                    onClick={() => handleJoin(group)}
                  >
                    {plan.disabled ? (
                      group.source === "automatic" || group.accessType === "invitation" ? (
                        <Lock className="size-3.5" />
                      ) : (
                        <Check className="size-3.5" />
                      )
                    ) : plan.label === "Join group" ? (
                      <Check className="size-3.5" />
                    ) : (
                      <Send className="size-3.5" />
                    )}
                    {plan.label}
                  </Button>
                }
              />
            );
          })}
        </div>
      )}

      <Card>
        <CardBody className="flex flex-col gap-3">
          <CardTitle>How joining works</CardTitle>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {Object.entries(ACCESS_INFO).map(([value, info]) => (
              <div
                key={value}
                className={`rounded-xl border p-3 ${
                  access === value
                    ? "border-gold-500/40 bg-gold-500/10"
                    : "border-white/10 bg-ink-950/60"
                }`}
              >
                <p className="text-[11px] font-semibold uppercase tracking-wide text-gold-400">
                  {info.label}
                </p>
                <p className="mt-1 text-[11px] leading-relaxed text-slate-400">{info.hint}</p>
              </div>
            ))}
          </div>
          <p className="text-[11px] leading-relaxed text-slate-500">
            Eligibility, access type and the group type list are configured by administrators —
            this screen never invents its own rules.
          </p>
        </CardBody>
      </Card>

      {feedback && <Toast message={feedback} onDismiss={() => setFeedback(null)} />}
    </div>
  );
}
