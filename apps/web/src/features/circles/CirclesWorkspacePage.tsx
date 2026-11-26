import { useEffect, useMemo, useState } from "react";
import type { ActivityEvent, CircleMember } from "../../domain/types";
import type { NetworkContact } from "../../domain/types";
import CircleSidebar from "../../components/circle/CircleSidebar";
import CircleFilters from "../../components/circle/CircleFilters";
import { INITIAL_FILTERS, type CircleFilterState } from "../../components/circle/filterState";
import CircleCanvas from "../../components/circle/CircleCanvas";
import StatsPanel from "../../components/circle/StatsPanel";
import AddMemberFlow from "../../components/circle/AddMemberFlow";
import Button from "../../components/ui/Button";
import FieldHint from "../../components/ui/FieldHint";
import Modal from "../../components/ui/Modal";
import Toast from "../../components/ui/Toast";
import SectionHeader from "../../components/ui/SectionHeader";
import ChatPanel from "../chat/ChatPanel";
import type { BusinessCircle } from "../../business/businessApi";
import { useAppStore } from "../../store/context";
import { useActiveCircle, useCircles, useCircleActivity, useCircleTypeMeta, useNetworkContacts } from "../../store/selectors";
import { errorMessage, mediaUrl } from "../../app/api";
import { businessApi, useOptionalBusinessData } from "../../business/BusinessDataProvider";

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
  const business = useOptionalBusinessData();
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

  const storedCircleActivity = useCircleActivity(activeCircle?.id);
  const detail = activeCircle && business ? business.circleDetails[activeCircle.id] : undefined;
  const circleActivity = useMemo<ActivityEvent[]>(
    () =>
      detail
        ? detail.activity.map((entry) => ({
            id: entry.id,
            circleId: entry.circleId,
            memberId: entry.memberId,
            kind:
              entry.kind === "join" || entry.kind === "message"
                ? entry.kind
                : ("update" as const),
            message: entry.message,
            at: entry.at ?? new Date().toISOString(),
          }))
        : storedCircleActivity,
    [detail, storedCircleActivity]
  );

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
  const allMembers = useMemo<CircleMember[]>(() => {
    if (business) {
      return business.contacts.map((contact) => ({
        id: contact.id,
        fullName: contact.fullName,
        businessName: contact.fullName,
        category:
          (contact as NetworkContact & { category?: string }).category ?? "—",
        location:
          (contact as NetworkContact & { location?: string }).location ?? "",
        geography: ((contact as NetworkContact & { geography?: string }).geography ??
          "National") as CircleMember["geography"],
        status: (contact.confirmation === "confirmed" ? "active" : "pending") as CircleMember["status"],
        role: "peripheral" as const,
        tier: "Bronze" as const,
        joinedAt: contact.addedAt,
        lastActiveAt: contact.addedAt,
        photoUrl: mediaUrl(contact.photoUrl),
      }));
    }
    return networkContacts.map((contact) => ({
      id: contact.id,
      fullName: contact.fullName,
      businessName: "Contact",
      category: "—",
      location: "",
      geography: "National" as CircleMember["geography"],
      status: (contact.confirmation === "confirmed" ? "active" : "pending") as CircleMember["status"],
      role: "peripheral" as const,
      tier: "Bronze" as const,
      joinedAt: contact.addedAt,
      lastActiveAt: contact.addedAt,
      photoUrl: mediaUrl(contact.photoUrl),
    }));
  }, [business, networkContacts]);
  const membersById = useMemo(() => new Map(allMembers.map((c) => [c.id, c])), [allMembers]);

  const circleMembers = useMemo<CircleMember[]>(() => {
    if (detail) {
      return detail.members.map((member) => ({
        id: member.id,
        fullName: member.fullName,
        businessName: member.businessName,
        category: member.category,
        location: member.location,
        geography: (member.geography || "National") as CircleMember["geography"],
        status: (member.status || "inactive") as CircleMember["status"],
        role: (member.role || "peripheral") as CircleMember["role"],
        tier: (member.tier || "Bronze") as CircleMember["tier"],
        joinedAt: member.joinedAt ?? "",
        lastActiveAt: member.lastActiveAt ?? "",
        photoUrl: mediaUrl(member.photoUrl),
        chatable: member.chatable,
      }));
    }
    return (activeCircle?.memberIds ?? [])
      .map((id) => membersById.get(id))
      .filter((m): m is CircleMember => m !== undefined);
  }, [detail, activeCircle, membersById]);

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
    () =>
      detail
        ? detail.sourceLists
        : (business?.networkLists?.items ?? []).filter((l) => activeCircle?.sourceListIds.includes(l.id)),
    [detail, activeCircle, business?.networkLists]
  );

  const selectCircle = (id: string) => {
    dispatch({ type: "circle/set-active", circleId: id });
    setFilters(INITIAL_FILTERS);
  };

  const handleViewProfile = (member: CircleMember) =>
    setFeedback(`Opening profile for ${member.businessName}…`);

  // Messaging runs on the Central Hub chat backbone: the conversation is
  // shared with every other app in the ecosystem.
  const [chatMember, setChatMember] = useState<CircleMember | null>(null);
  const [chatGroup, setChatGroup] = useState<{
    circleId: string;
    title: string;
    members: CircleMember[];
  } | null>(null);

  const handleSendMessage = (member: CircleMember) => {
    // Only real Central Hub users can be chatted with — somebody who was
    // only added to a network list has no account yet.
    if (member.chatable === false) {
      setFeedback(
        `${member.fullName} has not created a Central Hub account yet, so they cannot be messaged.`,
      );
      return;
    }
    setChatMember(member);
  };

  const handleGroupChat = () => {
    if (!activeCircle) return;
    const chatable = circleMembers.filter((member) => member.chatable !== false);
    if (chatable.length === 0) {
      setFeedback(
        "None of the members of this circle has a Central Hub account yet, so there is nobody to chat with.",
      );
      return;
    }
    setChatGroup({
      circleId: activeCircle.id,
      title: activeCircle.config.name,
      members: circleMembers,
    });
  };

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

  const handleConfirmAdd = async (member: CircleMember) => {
    if (!activeCircle) return;
    if (business) {
      try {
        await businessApi.addCircleMember(activeCircle.id, member.id);
        await business.refresh();
        setFeedback(`${member.businessName} joined the circle from My Network`);
      } catch (cause) {
        setFeedback(errorMessage(cause));
      }
      return;
    }
    dispatch({
      type: "circle/add-member",
      circleId: activeCircle.id,
      member: { id: member.id, name: member.fullName },
      note: `${member.fullName} added from My Network`,
    });
    setFeedback(`${member.businessName} joined the circle from My Network`);
  };

  // --- Circle management (business scope) ---------------------------------
  const [editOpen, setEditOpen] = useState(false);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editVisibility, setEditVisibility] = useState("public");
  const [editInteraction, setEditInteraction] = useState("message");
  const [editStatus, setEditStatus] = useState("Active");
  const [savingCircle, setSavingCircle] = useState(false);
  const [circleError, setCircleError] = useState<string | null>(null);

  const openCircleEdit = () => {
    if (!activeCircle) return;
    setEditName(activeCircle.config.name);
    setEditDescription(activeCircle.config.description);
    setEditVisibility(activeCircle.config.visibility);
    setEditInteraction(
      activeCircle.config.interactionLevel === "read" ? "read" : "message",
    );
    setEditStatus((activeCircle as BusinessCircle).status ?? "Active");
    setCircleError(null);
    setEditOpen(true);
  };

  const saveCircleEdit = async () => {
    if (!activeCircle || !business || !editName.trim() || savingCircle) return;
    setSavingCircle(true);
    setCircleError(null);
    try {
      await businessApi.updateCircle(activeCircle.id, {
        config: {
          name: editName.trim(),
          description: editDescription.trim(),
          visibility: editVisibility,
          interactionLevel: editInteraction,
        },
        status: editStatus,
      });
      await business.refresh();
      setEditOpen(false);
      setFeedback("Circle updated");
    } catch (cause) {
      setCircleError(errorMessage(cause));
    } finally {
      setSavingCircle(false);
    }
  };

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletingCircle, setDeletingCircle] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const confirmDeleteCircle = async () => {
    if (!activeCircle || !business || deletingCircle) return;
    setDeletingCircle(true);
    setDeleteError(null);
    try {
      await businessApi.removeCircle(activeCircle.id);
      await business.refresh();
      setDeleteOpen(false);
      setFeedback("Circle deleted");
    } catch (cause) {
      setDeleteError(errorMessage(cause));
    } finally {
      setDeletingCircle(false);
    }
  };

  const [removeTarget, setRemoveTarget] = useState<CircleMember | null>(null);
  const [removingMember, setRemovingMember] = useState(false);
  const [removeError, setRemoveError] = useState<string | null>(null);

  const confirmRemoveMember = async () => {
    if (!activeCircle || !business || !removeTarget || removingMember) return;
    setRemovingMember(true);
    setRemoveError(null);
    try {
      await businessApi.removeCircleMember(activeCircle.id, removeTarget.id);
      await business.refresh();
      setFeedback(`${removeTarget.fullName} removed from the circle`);
      setRemoveTarget(null);
    } catch (cause) {
      setRemoveError(errorMessage(cause));
    } finally {
      setRemovingMember(false);
    }
  };

  const canManage = Boolean(business) && !participantMode;

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
          Circle {focusCircleId} is not available — showing the active circle instead.
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
                onSendMessage={canManage ? handleSendMessage : undefined}
                onAddCategory={handleAddCategory}
                self={
                  business?.profile
                    ? {
                        id: business.profile.business.id,
                        name:
                          business.profile.user.name ??
                          business.profile.business.contactName,
                        businessName: business.profile.business.name,
                        photoUrl: business.profile.user.avatarUrl,
                      }
                    : undefined
                }
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
            onEditCircle={canManage ? openCircleEdit : undefined}
            onDeleteCircle={
              canManage
                ? () => {
                    setDeleteError(null);
                    setDeleteOpen(true);
                  }
                : undefined
            }
            onRemoveMember={
              canManage
                ? (member) => {
                    setRemoveError(null);
                    setRemoveTarget(member);
                  }
                : undefined
            }
            onGroupChat={canManage ? handleGroupChat : undefined}
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

      {canManage && (
        <>
          <Modal
            open={editOpen}
            title="Edit circle"
            onClose={() => setEditOpen(false)}
            footer={
              <>
                <Button variant="ghost" size="sm" onClick={() => setEditOpen(false)}>
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={saveCircleEdit}
                  disabled={!editName.trim() || savingCircle}
                >
                  {savingCircle ? "Saving…" : "Save changes"}
                </Button>
              </>
            }
          >
            <div className="flex flex-col gap-3">
              <label className="flex flex-col gap-1.5 text-xs">
                <span className="font-semibold text-white">Circle name</span>
                <input
                  value={editName}
                  onChange={(event) => setEditName(event.target.value)}
                  className="h-10 rounded-lg border border-white/10 bg-ink-800 px-3 text-xs text-slate-200 placeholder:text-slate-500 focus:border-gold-500/50 focus:outline-none"
                />
              </label>
              <label className="flex flex-col gap-1.5 text-xs">
                <span className="font-semibold text-white">Description</span>
                <FieldHint>What this circle is for, shown on the circle card.</FieldHint>
                <textarea
                  value={editDescription}
                  onChange={(event) => setEditDescription(event.target.value)}
                  rows={3}
                  className="rounded-lg border border-white/10 bg-ink-800 px-3 py-2 text-xs text-slate-200 placeholder:text-slate-500 focus:border-gold-500/50 focus:outline-none"
                />
              </label>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="flex flex-col gap-1.5 text-xs">
                  <span className="font-semibold text-white">Visibility</span>
                  <select
                    value={editVisibility}
                    onChange={(event) => setEditVisibility(event.target.value)}
                    className="h-10 rounded-lg border border-white/10 bg-ink-800 px-3 text-xs text-slate-200 focus:border-gold-500/50 focus:outline-none"
                  >
                    {["private", "invite only", "public"].map((value) => (
                      <option key={value} value={value}>
                        {value}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="flex flex-col gap-1.5 text-xs">
                  <span className="font-semibold text-white">Interaction level</span>
                  <select
                    value={editInteraction}
                    onChange={(event) => setEditInteraction(event.target.value)}
                    className="h-10 rounded-lg border border-white/10 bg-ink-800 px-3 text-xs text-slate-200 focus:border-gold-500/50 focus:outline-none"
                  >
                    {["read", "message"].map((value) => (
                      <option key={value} value={value}>
                        {value}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="flex flex-col gap-1.5 text-xs">
                  <span className="font-semibold text-white">Status</span>
                  <select
                    value={editStatus}
                    onChange={(event) => setEditStatus(event.target.value)}
                    className="h-10 rounded-lg border border-white/10 bg-ink-800 px-3 text-xs text-slate-200 focus:border-gold-500/50 focus:outline-none"
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </label>
              </div>
              {circleError && (
                <p className="rounded-xl border border-danger-500/30 bg-danger-500/10 px-3 py-2.5 text-xs text-danger-400">
                  {circleError}
                </p>
              )}
            </div>
          </Modal>

          <Modal
            open={deleteOpen}
            title="Delete this circle?"
            onClose={() => setDeleteOpen(false)}
            footer={
              <>
                <Button variant="ghost" size="sm" onClick={() => setDeleteOpen(false)}>
                  Keep circle
                </Button>
                <Button
                  variant="danger"
                  size="sm"
                  onClick={confirmDeleteCircle}
                  disabled={deletingCircle}
                >
                  {deletingCircle ? "Deleting…" : "Delete circle"}
                </Button>
              </>
            }
          >
            <div className="flex flex-col gap-3 text-xs leading-relaxed text-slate-400">
              <p>
                <span className="font-semibold text-white">{activeCircle.config.name}</span>{" "}
                and its activity feed will be removed. The contacts and lists behind it are
                not deleted, and you can build a new circle from them at any time.
              </p>
              {deleteError && (
                <p className="rounded-xl border border-danger-500/30 bg-danger-500/10 px-3 py-2.5 text-danger-400">
                  {deleteError}
                </p>
              )}
            </div>
          </Modal>

          <Modal
            open={Boolean(removeTarget)}
            title="Remove member from circle?"
            onClose={() => setRemoveTarget(null)}
            footer={
              <>
                <Button variant="ghost" size="sm" onClick={() => setRemoveTarget(null)}>
                  Cancel
                </Button>
                <Button
                  variant="danger"
                  size="sm"
                  onClick={confirmRemoveMember}
                  disabled={removingMember}
                >
                  {removingMember ? "Removing…" : "Remove member"}
                </Button>
              </>
            }
          >
            <div className="flex flex-col gap-3 text-xs leading-relaxed text-slate-400">
              <p>
                <span className="font-semibold text-white">{removeTarget?.fullName}</span>{" "}
                will be taken out of {activeCircle.config.name}. They stay in your network
                lists and can be added again later.
              </p>
              {removeError && (
                <p className="rounded-xl border border-danger-500/30 bg-danger-500/10 px-3 py-2.5 text-danger-400">
                  {removeError}
                </p>
              )}
            </div>
          </Modal>
        </>
      )}

      {feedback && <Toast message={feedback} onDismiss={() => setFeedback(null)} />}

      <ChatPanel
        key={chatGroup ? `group:${chatGroup.circleId}` : `member:${chatMember?.id ?? "closed"}`}
        member={chatGroup ? null : chatMember}
        group={chatGroup}
        onClose={() => {
          setChatMember(null);
          setChatGroup(null);
        }}
      />
    </>
  );
}
