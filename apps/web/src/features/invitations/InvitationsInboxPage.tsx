import { useMemo, useState } from "react";
import { ArrowRight, Check, Inbox, Send, X } from "lucide-react";
import Badge from "../../components/ui/Badge";
import type { BadgeVariant } from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import Card, { CardBody } from "../../components/ui/Card";
import EmptyState from "../../components/ui/EmptyState";
import LinkButton from "../../components/ui/LinkButton";
import SectionHeader from "../../components/ui/SectionHeader";
import Tabs from "../../components/ui/Tabs";
import Toast from "../../components/ui/Toast";
import type { Invitation } from "../../domain/types";
import { useAppState } from "../../store/selectors";
import { errorMessage } from "../../app/api";
import { businessApi, useBusinessData } from "../../business/BusinessDataProvider";

const STATUS_VARIANTS: Record<string, BadgeVariant> = {
  pending: "warning",
  accepted: "success",
  declined: "danger",
  cancelled: "muted",
};

type TabId = "incoming" | "outgoing" | "requests";

export default function InvitationsInboxPage() {
  const state = useAppState();
  const { profile, refresh } = useBusinessData();
  const [tab, setTab] = useState<TabId>("incoming");
  const [feedback, setFeedback] = useState<string | null>(null);
  const actorId = profile?.business.id ?? "";

  const groupName = useMemo(() => {
    const map = new Map(state.groups.map((group) => [group.id, group.name]));
    return (groupId: string | undefined) =>
      (groupId && map.get(groupId)) ?? "Unknown group";
  }, [state.groups]);

  const incoming = state.invitations.filter(
    (invitation) =>
      invitation.inviteeId === actorId &&
      invitation.kind === "invite" &&
      invitation.direction === "incoming" &&
      !invitation.circleId
  );

  const myRequests = state.invitations.filter(
    (invitation) => invitation.kind === "request" && invitation.inviteeId === actorId
  );

  const outgoing = state.invitations.filter(
    (invitation) =>
      invitation.kind === "invite" &&
      invitation.invitedById === actorId &&
      invitation.inviteeId !== actorId
  );

  const respond = async (invitation: Invitation) => {
    try {
      await businessApi.respondInvitation(invitation.id, false);
      await refresh();
      setFeedback(`You declined the invitation from ${invitation.invitedByName}`);
    } catch (cause) {
      setFeedback(errorMessage(cause));
    }
  };

  const cancel = async (invitation: Invitation) => {
    try {
      await businessApi.cancelInvitation(invitation.id);
      await refresh();
      setFeedback(`Invitation to ${invitation.inviteeName} cancelled`);
    } catch (cause) {
      setFeedback(errorMessage(cause));
    }
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
                        to={`/business/invitations/${invitation.id}/review`}
                        variant="primary"
                        size="sm"
                      >
                        <Check className="size-4" /> Review &amp; accept
                      </LinkButton>
                      <LinkButton
                        to={`/business/invitations/${invitation.id}`}
                        variant="outline"
                        size="sm"
                      >
                        View details
                      </LinkButton>
                      <LinkButton
                        to={`/business/groups/${invitation.groupId ?? ""}`}
                        state={{ from: "/business/invitations", fromLabel: "Invitations" }}
                        variant="ghost"
                        size="sm"
                      >
                        View group
                      </LinkButton>
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => respond(invitation)}
                      >
                        <X className="size-4" /> Decline
                      </Button>
                    </div>
                  ) : (
                    <div className="flex flex-wrap items-center gap-3">
                      <p className="text-[11px] text-slate-500">
                        Responded on {invitation.respondedAt?.slice(0, 10) ?? "—"}
                      </p>
                      <LinkButton
                        to={`/business/invitations/${invitation.id}`}
                        variant="ghost"
                        size="sm"
                      >
                        View details <ArrowRight className="size-3.5" />
                      </LinkButton>
                    </div>
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
                    <div className="flex flex-wrap gap-2">
                      <LinkButton
                        to={`/business/invitations/${invitation.id}`}
                        variant="outline"
                        size="sm"
                      >
                        View details
                      </LinkButton>
                      <Button variant="ghost" size="sm" onClick={() => cancel(invitation)}>
                        <X className="size-3.5" /> Cancel invitation
                      </Button>
                    </div>
                  )}
                  {invitation.status !== "pending" && (
                    <LinkButton
                      to={`/business/invitations/${invitation.id}`}
                      variant="ghost"
                      size="sm"
                    >
                      View details <ArrowRight className="size-3.5" />
                    </LinkButton>
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
                  <LinkButton
                    to={`/business/invitations/${invitation.id}`}
                    variant="ghost"
                    size="sm"
                  >
                    View details <ArrowRight className="size-3.5" />
                  </LinkButton>
                </CardBody>
              </Card>
            ))}
          </div>
        ))}

      {feedback && <Toast message={feedback} onDismiss={() => setFeedback(null)} />}
    </div>
  );
}
