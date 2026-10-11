import { useState } from "react";
import { useParams } from "react-router-dom";
import { UserMinus, Users } from "lucide-react";
import Badge from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import Card, { CardBody } from "../../components/ui/Card";
import StatCard from "../../components/ui/StatCard";
import Table from "../../components/ui/Table";
import type { TableColumn } from "../../components/ui/Table";
import Toast from "../../components/ui/Toast";
import { CURRENT_BUSINESS, findDirectoryEntry } from "../../data/businessData";
import { useAppStore } from "../../store/context";
import { useGroup } from "../../store/selectors";
import { useDemoLoading } from "../../lib/demoDelay";
import { SkeletonCard, SkeletonRows } from "../../components/ui/Skeleton";
import MemberSearch, { type MemberSearchItem } from "../../components/members/MemberSearch";
import MemberDetailModal from "../../components/members/MemberDetailModal";
import { isOnline } from "../../lib/presence";
import GroupTabsHeader, { GroupMissingState } from "./GroupTabsHeader";

const ACTOR_ID = CURRENT_BUSINESS.id;

interface MemberRow {
  id: string;
  name: string;
  contactName: string;
  category: string;
  city: string;
  joinedAt?: string;
  isOwner: boolean;
  isSelf: boolean;
}

export default function GroupMembersPage() {
  const { groupId } = useParams();
  const group = useGroup(groupId);
  const loading = useDemoLoading();
  const { dispatch } = useAppStore();
  const [feedback, setFeedback] = useState<string | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  if (loading) {
    return (
      <div className="flex flex-col gap-4">
        <SkeletonCard />
        <SkeletonRows rows={6} />
      </div>
    );
  }

  if (!group) {
    return <GroupMissingState title="11 — Group Members" />;
  }

  const rows: MemberRow[] = group.memberIds.map((id) => {
    const entry = findDirectoryEntry(id);
    return {
      id,
      name: entry.name,
      contactName: entry.contactName,
      category: entry.category,
      city: entry.city,
      joinedAt: entry.joinedAt ?? group.createdAt,
      isOwner: id === group.ownerId,
      isSelf: id === ACTOR_ID,
    };
  });

  const isOwner = group.ownerId === ACTOR_ID;

  const removeMember = (row: MemberRow) => {
    dispatch({
      type: "group/remove-member",
      groupId: group.id,
      memberId: row.id,
      memberName: row.name,
      actor: { id: ACTOR_ID, name: CURRENT_BUSINESS.businessName },
    });
    setFeedback(`${row.name} removed from ${group.name}`);
  };

  const columns: TableColumn<MemberRow>[] = [
    {
      key: "name",
      header: "Member",
      render: (row) => (
        <div className="flex items-center gap-3">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-ink-800 text-xs font-bold text-gold-400">
            {row.name.slice(0, 1).toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="truncate text-xs font-semibold text-white">
              {row.name}
              {row.isSelf && <span className="ml-1.5 text-gold-300">(you)</span>}
            </p>
            <p className="truncate text-[11px] text-slate-500">{row.contactName}</p>
          </div>
        </div>
      ),
    },
    { key: "category", header: "Category", render: (row) => row.category },
    { key: "city", header: "City", render: (row) => row.city },
    {
      key: "role",
      header: "Role",
      render: (row) => (
        <Badge variant={row.isOwner ? "gold" : row.isSelf ? "info" : "default"}>
          {row.isOwner ? "Owner" : row.isSelf ? "Member (you)" : "Member"}
        </Badge>
      ),
    },
    {
      key: "joined",
      header: "Joined",
      render: (row) => (
        <span className="text-xs text-slate-400">{row.joinedAt ?? group.createdAt}</span>
      ),
    },
    ...(isOwner
      ? [
          {
            key: "actions",
            header: "Actions",
            render: (row: MemberRow) =>
              row.isOwner || row.isSelf ? (
                <span className="text-[11px] text-slate-500">Owner controls</span>
              ) : (
                <Button variant="ghost" size="sm" onClick={() => removeMember(row)}>
                  <UserMinus className="size-3.5" /> Remove
                </Button>
              ),
          } satisfies TableColumn<MemberRow>,
        ]
      : []),
  ];

  const owners = rows.filter((row) => row.isOwner).length;

  const searchItems: MemberSearchItem[] = rows.map((row) => ({
    id: row.id,
    name: row.name,
    contactName: row.contactName,
    category: row.category,
    city: row.city,
    joinedAt: row.joinedAt,
    isOwner: row.isOwner,
    isSelf: row.isSelf,
    online: row.isOwner || row.isSelf || isOnline(row.id),
  }));
  const selectedMember = selectedId
    ? searchItems.find((item) => item.id === selectedId) ?? null
    : null;

  return (
    <div className="flex flex-col gap-4">
      <GroupTabsHeader
        title="11 — Group Members"
        subtitle="Full member roster with ownership and role badges, permission-aware for the group type."
      />

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <StatCard label="Members" value={rows.length} hint={group.name} accent="gold" />
        <StatCard label="Owners" value={owners} hint="Owner controls apply" accent="info" />
        <StatCard
          label="Your role"
          value={rows.find((row) => row.isSelf)?.isOwner ? "Owner" : "Member"}
          hint={
            group.ownerId === ACTOR_ID
              ? "You can edit settings and invite"
              : "Read-only member view"
          }
          accent={group.ownerId === ACTOR_ID ? "warning" : "success"}
        />
        <StatCard
          label="Group source"
          value={group.source === "automatic" ? "Automatic" : "User created"}
          hint={group.source === "automatic" ? "Maintained by the system" : "Created by a member"}
          accent="info"
        />
      </div>

      <MemberSearch
        members={searchItems}
        open={searchOpen}
        onToggle={() => setSearchOpen((value) => !value)}
        onSelect={setSelectedId}
        label="Members"
      />

      {!searchOpen && (
        <Table
          columns={columns}
          rows={rows}
          rowKey={(row) => row.id}
          emptyMessage="This group has no members yet."
        />
      )}

      <MemberDetailModal member={selectedMember} onClose={() => setSelectedId(null)} />

      <Card>
        <CardBody className="flex items-center gap-3">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-ink-800 text-gold-400">
            <Users className="size-4" />
          </div>
          <p className="text-xs leading-relaxed text-slate-400">
            {group.source === "automatic"
              ? "Automatic group — membership is maintained by the system (Doc A §16 member view). You see who is in the group and when they joined; there are no member admin controls here."
              : group.ownerId === ACTOR_ID
                ? "You own this group — use Remove in the Actions column to manage membership. Member records come from the shared business directory, the same identity used across National Community, city relationships and campaign participation."
                : "Member records come from the shared business directory — the same identity used across National Community, city relationships and campaign participation. Member admin controls belong to the group owner."}
          </p>
        </CardBody>
      </Card>

      {feedback && <Toast message={feedback} onDismiss={() => setFeedback(null)} />}
    </div>
  );
}
