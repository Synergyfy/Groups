import { useState } from "react";
import { NavLink, useLocation, useParams } from "react-router-dom";
import { Compass, Lock } from "lucide-react";
import EmptyState from "../../components/ui/EmptyState";
import LinkButton from "../../components/ui/LinkButton";
import Modal from "../../components/ui/Modal";
import SectionHeader from "../../components/ui/SectionHeader";
import { CURRENT_BUSINESS } from "../../data/businessData";
import { useGroup } from "../../store/selectors";

interface GroupTabsHeaderProps {
  title: string;
  subtitle?: string;
}

interface BackState {
  from?: string;
  fromLabel?: string;
}

const ACTOR_ID = CURRENT_BUSINESS.id;

const TAB_CLASS = ({ isActive }: { isActive: boolean }) =>
  `inline-flex h-9 shrink-0 items-center whitespace-nowrap rounded-lg px-1.5 text-[11px] font-medium transition-colors sm:h-10 sm:px-3.5 sm:text-xs ${
    isActive
      ? "border border-gold-500/30 bg-gold-500/15 text-gold-200"
      : "border border-transparent text-slate-400 hover:text-slate-200"
  }`;

const LOCKED_TAB_CLASS =
  "inline-flex h-9 shrink-0 cursor-pointer items-center gap-1 whitespace-nowrap rounded-lg border border-transparent px-1.5 text-[11px] font-medium text-slate-500 transition-colors hover:bg-white/5 hover:text-slate-300 focus-visible:outline-2 focus-visible:outline-gold-500 sm:h-10 sm:gap-1.5 sm:px-3.5 sm:text-xs";

type LockedTab = "Invitation" | "Settings";

export default function GroupTabsHeader({ title, subtitle }: GroupTabsHeaderProps) {
  const [lockedTab, setLockedTab] = useState<LockedTab | null>(null);
  const { groupId } = useParams();
  const location = useLocation();
  const group = useGroup(groupId);
  const isOwner = group?.ownerId === ACTOR_ID;
  const base = `/business/groups/${groupId}`;
  const fromState = (location.state ?? undefined) as BackState | undefined;
  const onDetailsPage = location.pathname === base;
  const back = onDetailsPage ? fromState?.from ?? "/business/groups/mine" : base;
  const backLabel = onDetailsPage ? fromState?.fromLabel ?? "My Groups" : "Back to Group";

  return (
    <div className="flex flex-col gap-3">
      <SectionHeader
        title={title}
        subtitle={subtitle}
        back={back}
        backLabel={backLabel}
      />
      <nav className="flex gap-0.5 overflow-x-auto rounded-xl border border-white/10 bg-ink-900/70 p-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:gap-1">
        <NavLink to={base} end className={TAB_CLASS}>
          Overview
        </NavLink>
        <NavLink to={`${base}/members`} className={TAB_CLASS}>
          Members
        </NavLink>
        <NavLink to={`${base}/activity`} className={TAB_CLASS}>
          Activity
        </NavLink>
        {isOwner ? (
          <>
            <NavLink to={`${base}/invitations`} className={TAB_CLASS}>
              Invitations
            </NavLink>
            <NavLink to={`${base}/settings`} className={TAB_CLASS}>
              Settings
            </NavLink>
          </>
        ) : (
          <>
            <button
              type="button"
              onClick={() => setLockedTab("Invitation")}
              className={LOCKED_TAB_CLASS}
              title="Doc A §16 — Invitations are owner-only."
            >
              <Lock className="size-3" />
              Invitation
            </button>
            <button
              type="button"
              onClick={() => setLockedTab("Settings")}
              className={LOCKED_TAB_CLASS}
              title="Doc A §16 — Settings is an owner-only tab."
            >
              <Lock className="size-3" />
              Settings
            </button>
          </>
        )}
      </nav>
      <Modal
        open={lockedTab !== null}
        title="Owner only"
        onClose={() => setLockedTab(null)}
      >
        <p className="text-sm text-slate-300">
          The <span className="font-semibold text-white">{lockedTab}</span> tab belongs
          to the group owner.
        </p>
        <p className="mt-2 text-xs leading-relaxed text-slate-400">
          {group?.ownerName ?? "The group owner"} owns {group?.name ?? "this group"}, so
          only they can invite members or change {lockedTab?.toLowerCase()} rules. Ask
          them to make the change for you.
        </p>
      </Modal>
    </div>
  );
}

export function GroupMissingState({ title }: { title: string }) {
  return (
    <div className="flex flex-col gap-4">
      <SectionHeader title={title} />
      <EmptyState
        title="Group not found"
        description="This group id does not exist. Open one of the sample groups from My Groups or Explore Groups."
        icon={<Compass className="size-6" />}
        action={<LinkButton to="/business/groups/mine" size="sm">Back to my groups</LinkButton>}
      />
    </div>
  );
}
