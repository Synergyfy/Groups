import { useMemo, useState } from "react";
import { Check, Inbox, Send, X } from "lucide-react";
import Badge from "../../components/ui/Badge";
import type { BadgeVariant } from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import Card, { CardBody } from "../../components/ui/Card";
import EmptyState from "../../components/ui/EmptyState";
import LinkButton from "../../components/ui/LinkButton";
import SectionHeader from "../../components/ui/SectionHeader";
import Tabs from "../../components/ui/Tabs";
import Toast from "../../components/ui/Toast";
import { CURRENT_BUSINESS } from "../../data/businessData";
import { useAppStore } from "../../store/context";
import type { Invitation } from "../../domain/types";

const ACTOR_ID = CURRENT_BUSINESS.id;

const STATUS_VARIANTS: Record<string, BadgeVariant> = {
  pending: "warning",
  accepted: "success",
  declined: "danger",
  cancelled: "muted",
};

type TabId = "incoming" | "outgoing" | "requests";

export default function InvitationsInboxPage() {
  const { state, dispatch } = useAppStore();
  const [tab, setTab] = useState<TabId>("incoming");
  const [feedback, setFeedback] = useState<string | null>(null);

  const groupName = useMemo(() => {
    const map = new Map(state.groups.map((group) => [group.id, group.name]));
    return (groupId: string) => map.get(groupId) ?? "Unknown group";
  }, [state.groups]);

  const incoming = state.invitations.filter(
    (invitation) =>
      invitation.inviteeId === ACTOR_ID &&
      invitation.kind === "invite" &&
      invitation.direction === "incoming"
  );

  const myRequests = state.invitations.filter(
    (invitation) => invitation.kind === "request" && invitation.inviteeId === ACTOR_ID
  );

  const outgoing = state.invitations.filter(
    (invitation) =>
      invitation.kind === "invite" &&
      invitation.invitedById === ACTOR_ID &&
      invitation.inviteeId !== ACTOR_ID
  );

  const actor = { id: ACTOR_ID, name: CURRENT_BUSINESS.businessName };

  const respond = (invitation: Invitation, accept: boolean) => {
    dispatch({
      type: "invitation/respond",
      invitationId: invitation.id,
      accept,
      responder: actor,
    });
    setFeedback(
      accept
        ? `You joined ${groupName(invitation.groupId)}`
        : `You declined the invitation from ${invitation.invitedByName}`
    );
  };

  const cancel = (invitation: Invitation) => {
    dispatch({
      type: "invitation/respond",
      invitationId: invitation.id,
      accept: false,
      responder: actor,
    });
    setFeedback(`Invitation to ${invitation.inviteeName} cancelled`);
  };

  return (
    <div className="flex flex-col gap-4">
      <SectionHeader
        title="Group Invitations (Inbox)"
        subtitle="Invitations addressed to you, requests you have sent and invitations you are waiting on from others."
      />

      <div data-tour="tabs">
        <Tabs
          items={[
            { id: "incoming", label: "Incoming", count: incoming.filter((i) => i.status === "pending").length },
            { id: "outgoing", label: "Outgoing", count: outgoing.length },
            { id: "requests", label: "My requests", count: myRequests.length },
          ]}
          value={tab}
          onChange={(id) => setTab(id as TabId)}
        />
      </div>

      {tab === "incoming" &&
        (incoming.length === 0 ? (
          <EmptyState
            title="No invitations waiting"
            description="When another group invites you, it will appear here for accept or decline."
            icon={<Inbox className="size-6" />}
          />
        ) : (
          <div className="grid gap-3 lg:grid-cols-2" data-tour="list">
            {incoming.map((invitation) => (
              <Card key={invitation.id}>
                <CardBody className="flex flex-col gap-3">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-white">
                        {groupName(invitation.groupId)}
                      </p>
                      <p className="mt-1 text-[11px] text-slate-500">
                        Invited by {invitation.invitedByName} ·{" "}
                        {invitation.createdAt.slice(0, 10)}
                      </p>
                    </div>
                    <Badge variant={STATUS_VARIANTS[invitation.status] ?? "default"}>
                      {invitation.status}
                    </Badge>
                  </div>

                  {invitation.status === "pending" ? (
                    <div className="flex flex-wrap gap-2">
                      <LinkButton
                        to={`/business/groups/${invitation.groupId}`}
                        state={{ from: "/business/invitations", fromLabel: "Invitations" }}
                        variant="outline"
                        size="sm"
                      >
                        View group
                      </LinkButton>
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => respond(invitation, true)}
                      >
                        <Check className="size-4" /> Accept
                      </Button>
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => respond(invitation, false)}
                      >
                        <X className="size-4" /> Decline
                      </Button>
                    </div>
                  ) : (
                    <p className="text-[11px] text-slate-500">
                      Responded on {invitation.respondedAt?.slice(0, 10) ?? "—"}
                    </p>
                  )}
                </CardBody>
              </Card>
            ))}
          </div>
        ))}

      {tab === "outgoing" &&
        (outgoing.length === 0 ? (
          <EmptyState
            title="You have not sent any invitations"
            description="Invite businesses from a group's Invitations tab."
            icon={<Send className="size-6" />}
          />
        ) : (
          <div className="grid gap-3 lg:grid-cols-2">
            {outgoing.map((invitation) => (
              <Card key={invitation.id}>
                <CardBody className="flex flex-col gap-2">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-white">
                        {invitation.inviteeName}
                      </p>
                      <p className="mt-1 text-[11px] text-slate-500">
                        To {groupName(invitation.groupId)} ·{" "}
                        {invitation.inviteeEmail ?? invitation.inviteeId}
                      </p>
                    </div>
                    <Badge variant={STATUS_VARIANTS[invitation.status] ?? "default"}>
                      {invitation.status}
                    </Badge>
                  </div>
                  {invitation.status === "pending" && (
                    <Button variant="ghost" size="sm" onClick={() => cancel(invitation)}>
                      <X className="size-3.5" /> Cancel invitation
                    </Button>
                  )}
                </CardBody>
              </Card>
            ))}
          </div>
        ))}

      {tab === "requests" &&
        (myRequests.length === 0 ? (
          <EmptyState
            title="No join requests sent"
            description="When you ask to join a restricted group, the request is tracked here."
          />
        ) : (
          <div className="grid gap-3 lg:grid-cols-2">
            {myRequests.map((invitation) => (
              <Card key={invitation.id}>
                <CardBody className="flex flex-col gap-2">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-white">
                        {groupName(invitation.groupId)}
                      </p>
                      <p className="mt-1 text-[11px] text-slate-500">
                        Requested {invitation.createdAt.slice(0, 10)}
                      </p>
                    </div>
                    <Badge variant={STATUS_VARIANTS[invitation.status] ?? "default"}>
                      {invitation.status}
                    </Badge>
                  </div>
                </CardBody>
              </Card>
            ))}
          </div>
        ))}

      {feedback && <Toast message={feedback} onDismiss={() => setFeedback(null)} />}
    </div>
  );
}
