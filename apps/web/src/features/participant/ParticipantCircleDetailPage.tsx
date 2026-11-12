import { useEffect } from "react";
import { useParams } from "react-router-dom";
import CirclesWorkspacePage from "../circles/CirclesWorkspacePage";
import { getParticipantIdentity } from "./participantIdentity";

export default function ParticipantCircleDetailPage() {
  useEffect(() => {
    document.title = "Groups & Circles | Circle Workspace";
  }, []);

  const { groupId } = useParams();
  const identity = getParticipantIdentity();

  return (
    <CirclesWorkspacePage
      title="Group Circle Workspace"
      subtitle="View the circle, its members and activity. Your access is limited as a free participant — upgrading lets you create and manage your own circles."
      focusCircleId={groupId}
      participantMode
      restrictToMemberId={identity.id}
    />
  );
}
