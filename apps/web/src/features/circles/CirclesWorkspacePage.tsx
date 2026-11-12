import { useEffect, useMemo, useState } from "react";
import type { CircleMember } from "../../domain/types";
import { LISTS } from "../../data/mockData";
import { resolveAllContacts } from "../../data/contactHelpers";
import CircleSidebar from "../../components/circle/CircleSidebar";
import CircleFilters from "../../components/circle/CircleFilters";
import { INITIAL_FILTERS, type CircleFilterState } from "../../components/circle/filterState";
import CircleCanvas from "../../components/circle/CircleCanvas";
import StatsPanel from "../../components/circle/StatsPanel";
import AddMemberFlow from "../../components/circle/AddMemberFlow";
import Toast from "../../components/ui/Toast";
import SectionHeader from "../../components/ui/SectionHeader";
import { useAppStore } from "../../store/context";
import { useActiveCircle, useCircles, useCircleActivity, useCircleTypeMeta, useNetworkContacts } from "../../store/selectors";

interface CirclesWorkspacePageProps {
  title?: string;
  subtitle?: string;
  focusCircleId?: string;
  participantMode?: boolean;
  /** When set, only circles containing this member are listed and openable. */
  restrictToMemberId?: string;
}

export default function CirclesWorkspacePage({
  title = "Group Circles",
  subtitle = "Interactive circles built from My Network lists — marketing, advertising, seasonal campaigns and Smart Money partner networks.",
  focusCircleId,
  participantMode = false,
  restrictToMemberId,
}: CirclesWorkspacePageProps = {}) {
  const { dispatch } = useAppStore();
  const allCircles = useCircles();
  const storeActiveCircle = useActiveCircle();

  // A participant only ever sees the circles they belong to.
  const visibleCircles = useMemo(
    () =>
      restrictToMemberId
        ? allCircles.filter((circle) => circle.memberIds.includes(restrictToMemberId))
        : allCircles,
    [allCircles, restrictToMemberId]
  );

  const activeCircle = useMemo(() => {
    if (!storeActiveCircle) return undefined;
    if (visibleCircles.some((circle) => circle.id === storeActiveCircle.id)) return storeActiveCircle;
    return visibleCircles[0];
  }, [storeActiveCircle, visibleCircles]);

  const circleActivity = useCircleActivity(activeCircle?.id);

  const [filters, setFilters] = useState<CircleFilterState>(INITIAL_FILTERS);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [addFlowOpen, setAddFlowOpen] = useState(false);
  const meta = useCircleTypeMeta(activeCircle?.type ?? "");

  useEffect(() => {
    const focusTarget =
      focusCircleId && visibleCircles.some((circle) => circle.id === focusCircleId)
        ? focusCircleId
        : undefined;
    const isActiveVisible =
      storeActiveCircle && visibleCircles.some((circle) => circle.id === storeActiveCircle.id);
    const target = focusTarget ?? (isActiveVisible ? undefined : visibleCircles[0]?.id);
    if (!target || target === storeActiveCircle?.id) return;
    dispatch({ type: "circle/set-active", circleId: target });
  }, [focusCircleId, visibleCircles, storeActiveCircle, dispatch]);

  useEffect(() => {
    if (!feedback) return;
    const timer = window.setTimeout(() => setFeedback(null), 2600);
    return () => window.clearTimeout(timer);
  }, [feedback]);

  const networkContacts = useNetworkContacts();
  const allMembers = useMemo(
    () => resolveAllContacts(networkContacts).map((entry) => entry.member),
    [networkContacts]
  );
  const membersById = useMemo(() => new Map(allMembers.map((c) => [c.id, c])), [allMembers]);

  const circleMembers = useMemo(
    () =>
      (activeCircle?.memberIds ?? [])
        .map((id) => membersById.get(id))
        .filter((m): m is CircleMember => m !== undefined),
    [activeCircle, membersById]
  );

  const filteredMembers = useMemo(
    () =>
      circleMembers.filter((m) => {
        if (filters.category !== "all" && m.category !== filters.category) return false;
        if (filters.location !== "all" && m.location !== filters.location) return false;
        if (filters.activity !== "all" && m.status !== filters.activity) return false;
        if (filters.role !== "all" && m.role !== filters.role) return false;
        return true;
      }),
    [circleMembers, filters]
  );

  const sourceLists = useMemo(
    () => LISTS.filter((l) => activeCircle?.sourceListIds.includes(l.id)),
    [activeCircle]
  );

  const selectCircle = (id: string) => {
    dispatch({ type: "circle/set-active", circleId: id });
    setFilters(INITIAL_FILTERS);
  };

  const handleViewProfile = (member: CircleMember) =>
    setFeedback(`Opening profile for ${member.businessName}…`);

  const handleSendMessage = (member: CircleMember) =>
    setFeedback(`Message composer opened for ${member.fullName}…`);

  const handleAddCategory = (member: CircleMember) =>
    setFeedback(`Category suggestion sent to ${member.businessName}…`);

  const openAddMemberFlow = () => {
    if (!activeCircle || !meta) return;
    if (meta.maxMembers !== null && activeCircle.memberIds.length >= meta.maxMembers) {
      setFeedback(`${meta.shortLabel} circle is full — ${meta.maxMembers} member maximum enforced`);
      return;
    }
    const available = allMembers.filter(
      (contact) => !activeCircle.memberIds.includes(contact.id)
    );
    if (available.length === 0) {
      setFeedback("Every My Network contact is already in this circle");
      return;
    }
    setAddFlowOpen(true);
  };

  const handleConfirmAdd = (member: CircleMember) => {
    if (!activeCircle) return;
    dispatch({
      type: "circle/add-member",
      circleId: activeCircle.id,
      member: { id: member.id, name: member.fullName },
      note: `${member.fullName} added from My Network`,
    });
    setFeedback(`${member.businessName} joined the circle from My Network`);
  };

  if (!activeCircle || !meta) {
    return (
      <SectionHeader title={title} subtitle="No circles available yet." />
    );
  }

  const focusMissing = Boolean(focusCircleId) && !visibleCircles.some((c) => c.id === focusCircleId);

  return (
    <>
      <SectionHeader title={title} subtitle={subtitle} />

      {focusMissing && (
        <p className="rounded-xl border border-warning-500/30 bg-warning-500/10 px-3 py-2.5 text-xs text-warning-400">
          Circle {focusCircleId} is not in the demo store — showing the active circle instead.
        </p>
      )}

      <div className="flex flex-1 flex-col gap-4 lg:flex-row lg:gap-5">
        <div className="order-2 lg:order-1" data-tour="circle-sidebar">
          <CircleSidebar
            circles={visibleCircles}
            activeCircleId={activeCircle.id}
            onSelect={selectCircle}
            memberCountOf={(circle) => circle.memberIds.length}
            participantMode={participantMode}
          />
        </div>

        <section className="order-1 flex min-w-0 flex-1 flex-col gap-4 lg:order-2">
          <CircleFilters
            members={circleMembers}
            state={filters}
            onChange={setFilters}
            resultCount={filteredMembers.length}
            totalCount={circleMembers.length}
          />
          <div
            data-tour="canvas"
            className="flex flex-1 items-center rounded-2xl border border-white/10 bg-ink-900/70 p-4 sm:p-6"
          >
            <div className="w-full">
              <CircleCanvas
                members={filteredMembers}
                totalInCircle={circleMembers.length}
                accent={meta.accent}
                onViewProfile={handleViewProfile}
                onSendMessage={handleSendMessage}
                onAddCategory={handleAddCategory}
              />
            </div>
          </div>
        </section>

        <div className="order-3" data-tour="circle-stats">
          <StatsPanel
            circle={activeCircle}
            members={circleMembers}
            filteredCount={filteredMembers.length}
            sourceLists={sourceLists}
            activity={circleActivity}
            onAddMember={openAddMemberFlow}
            participantMode={participantMode}
          />
        </div>
      </div>

      <AddMemberFlow
        open={addFlowOpen}
        circleName={`${meta.shortLabel} circle`}
        contacts={allMembers.filter((contact) => !activeCircle.memberIds.includes(contact.id))}
        onClose={() => setAddFlowOpen(false)}
        onConfirm={handleConfirmAdd}
      />

      {feedback && <Toast message={feedback} onDismiss={() => setFeedback(null)} />}
    </>
  );
}
