import { NavLink, useParams } from "react-router-dom";
import { Compass } from "lucide-react";
import EmptyState from "../../components/ui/EmptyState";
import LinkButton from "../../components/ui/LinkButton";
import SectionHeader from "../../components/ui/SectionHeader";

interface AdminGroupTabsHeaderProps {
  title: string;
  subtitle?: string;
}

const TAB_CLASS = ({ isActive }: { isActive: boolean }) =>
  `inline-flex h-10 shrink-0 items-center whitespace-nowrap rounded-lg px-3.5 text-xs font-medium transition-colors ${
    isActive
      ? "border border-gold-500/30 bg-gold-500/15 text-gold-200"
      : "border border-transparent text-slate-400 hover:text-slate-200"
  }`;

export default function AdminGroupTabsHeader({ title, subtitle }: AdminGroupTabsHeaderProps) {
  const { groupId } = useParams();
  const base = `/admin/groups/${groupId}`;

  return (
    <div className="flex flex-col gap-3">
      <SectionHeader
        title={title}
        subtitle={subtitle}
        back="/admin/groups/all"
        backLabel="All Groups"
      />
      <nav
        data-tour="tabs"
        className="flex gap-1 overflow-x-auto rounded-xl border border-white/10 bg-ink-900/70 p-1"
      >
        <NavLink to={base} end className={TAB_CLASS}>
          Overview
        </NavLink>
        <NavLink to={`${base}/members`} className={TAB_CLASS}>
          Members
        </NavLink>
        <NavLink to={`${base}/activity`} className={TAB_CLASS}>
          Activity
        </NavLink>
        <NavLink to={`${base}/relationships`} className={TAB_CLASS}>
          Relationships
        </NavLink>
      </nav>
    </div>
  );
}

export function AdminGroupMissingState({ title, description }: { title: string; description: string }) {
  return (
    <div className="flex flex-col gap-4">
      <SectionHeader
        title={title}
        subtitle={description}
        back="/admin/groups/all"
        backLabel="All Groups"
      />
      <EmptyState
        title="Group not found"
        description="This group id does not exist. Open one from the Admin Group List."
        icon={<Compass className="size-6" />}
        action={<LinkButton to="/admin/groups/all" size="sm">Back to the register</LinkButton>}
      />
    </div>
  );
}
