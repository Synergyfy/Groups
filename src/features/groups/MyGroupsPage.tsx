import { useParams, Link } from "react-router-dom";
import { ChevronRight, Cpu, UserRound, Users } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import SectionHeader from "../../components/ui/SectionHeader";
import Badge from "../../components/ui/Badge";
import { SkeletonRows } from "../../components/ui/Skeleton";
import GroupListItem from "./GroupListItem";
import { CURRENT_BUSINESS } from "../../data/businessData";
import { useActor, useAutomaticProgress } from "../../store/selectors";
import { useDemoLoading } from "../../lib/demoDelay";
import type { Group } from "../../domain/types";

const ACTOR_ID = CURRENT_BUSINESS.id;

interface SectionDef {
  key: string;
  title: string;
  hint: string;
  icon: LucideIcon;
  empty: string;
}

const SECTIONS: SectionDef[] = [
  {
    key: "automatic",
    title: "Automatic Network Group",
    hint: "The group assigned automatically by the system.",
    icon: Cpu,
    empty: "No automatic network group assigned yet — the system creates one when you register in a city.",
  },
  {
    key: "created",
    title: "My Created Groups",
    hint: "Groups the business created.",
    icon: UserRound,
    empty: "You have not created a group yet — use Create a Group when you need one.",
  },
  {
    key: "joined",
    title: "Joined Groups",
    hint: "Other groups the business has joined.",
    icon: Users,
    empty: "You have not joined any other group yet — explore the directory to find one.",
  },
];

export default function MyGroupsPage() {
  const { section } = useParams();
  const loading = useDemoLoading();
  const { myGroups } = useActor(ACTOR_ID);
  const automatic = useAutomaticProgress(ACTOR_ID);

  const activeSection = SECTIONS.find((entry) => entry.key === section);

  const automaticGroups = myGroups
    .filter((group) => group.source === "automatic")
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const createdGroups = myGroups
    .filter((group) => group.ownerId === ACTOR_ID)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const joinedGroups = myGroups
    .filter((group) => group.source !== "automatic" && group.ownerId !== ACTOR_ID)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  const lists: Record<string, Group[]> = {
    automatic: automaticGroups,
    created: createdGroups,
    joined: joinedGroups,
  };

  const sectionEmpty = (label: string) => (
    <p className="rounded-xl border border-dashed border-white/15 bg-ink-950/60 p-3 text-[11px] text-slate-500">
      {label}
    </p>
  );

  return (
    <div className="flex flex-col gap-4">
      <SectionHeader
        title={activeSection ? activeSection.title : "02 — My Groups"}
        subtitle={
          activeSection
            ? activeSection.hint
            : "All the groups the business belongs to, separated into three lists."
        }
        back={activeSection ? "/business/groups/mine" : "/business/groups"}
        backLabel={activeSection ? "My Groups" : "Group Circle"}
      />

      {loading ? (
        <SkeletonRows rows={4} />
      ) : activeSection ? (
        <div data-tour="list" className="flex flex-col gap-2">
          {lists[activeSection.key].length > 0 ? (
            lists[activeSection.key].map((group) => (
              <GroupListItem
                key={group.id}
                group={group}
                to={`/business/groups/${group.id}`}
                state={{
                  from: `/business/groups/mine/${activeSection.key}`,
                  fromLabel: activeSection.title,
                }}
                progress={
                  activeSection.key === "automatic" &&
                  automatic.enabled &&
                  group.id === automatic.group?.id
                    ? {
                        current: automatic.current,
                        required: automatic.threshold,
                        remaining: automatic.remaining,
                      }
                    : undefined
                }
              />
            ))
          ) : (
            sectionEmpty(activeSection.empty)
          )}
        </div>
      ) : (
        <>
          <div data-tour="sections" className="flex flex-col gap-3">
            {SECTIONS.map((entry) => (
              <Link
                key={entry.key}
                to={`/business/groups/mine/${entry.key}`}
                className="group flex items-center gap-3 rounded-2xl border border-white/10 bg-ink-900/70 p-4 transition-colors hover:border-gold-500/40"
              >
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-ink-800 text-gold-400">
                  <entry.icon className="size-5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-white transition-colors group-hover:text-gold-200">
                      {entry.title}
                    </span>
                    <Badge variant="muted">{lists[entry.key].length}</Badge>
                  </span>
                  <span className="mt-1 block text-xs leading-relaxed text-slate-400">
                    {entry.hint}
                  </span>
                </span>
                <ChevronRight className="size-4 shrink-0 text-slate-500 transition-colors group-hover:text-gold-300" />
              </Link>
            ))}
          </div>

          <div
            data-tour="note"
            className="rounded-xl border border-white/10 bg-ink-950/60 p-3 text-xs leading-relaxed text-slate-400"
          >
            A business can belong to multiple groups — tap any group to open it.
          </div>
        </>
      )}
    </div>
  );
}
