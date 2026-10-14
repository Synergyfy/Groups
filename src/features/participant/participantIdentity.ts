import { readParticipantSession } from "../../app/authSession";
import type { ParticipantRole } from "../../domain/types";

export interface ParticipantIdentity {
  id: string;
  name: string;
  role: ParticipantRole;
  label: string;
}

const ROLE_LABELS: Record<ParticipantRole, string> = {
  consumer: "Consumer",
  "business-invitee": "Invited Business",
};

export function getParticipantIdentity(): ParticipantIdentity {
  const session = readParticipantSession();
  if (
    session?.accountId &&
    session.name &&
    (session.role === "consumer" || session.role === "business-invitee")
  ) {
    // Registered through the invitation-first flow — use the real account.
    return {
      id: session.accountId,
      name: session.name,
      role: session.role,
      label: ROLE_LABELS[session.role],
    };
  }
  if (session?.role === "consumer") {
    return {
      id: "cons-john",
      name: "John Doe",
      role: "consumer",
      label: ROLE_LABELS.consumer,
    };
  }
  if (session?.role === "business-invitee" && session.name) {
    return {
      id: session.email ?? "invitee",
      name: session.name,
      role: "business-invitee",
      label: ROLE_LABELS["business-invitee"],
    };
  }
  return {
    id: "biz-smith",
    name: "Smith Business Ltd",
    role: "business-invitee",
    label: ROLE_LABELS["business-invitee"],
  };
}
