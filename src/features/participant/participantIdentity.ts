export interface ParticipantIdentity {
  id: string;
  name: string;
  role: "business-invitee" | "consumer";
  label: string;
}

export function getParticipantIdentity(): ParticipantIdentity {
  try {
    const raw = sessionStorage.getItem("chs-auth-state");
    if (raw) {
      const auth = JSON.parse(raw);
      if (auth.role === "consumer") {
        return {
          id: "cons-john",
          name: "John Doe",
          role: "consumer",
          label: "Consumer",
        };
      }
    }
  } catch {
    // fall through to default
  }
  return {
    id: "biz-smith",
    name: "Smith Business Ltd",
    role: "business-invitee",
    label: "Invited Business",
  };
}
