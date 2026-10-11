import { useParams } from "react-router-dom";
import CirclesWorkspacePage from "./CirclesWorkspacePage";

export default function CircleWorkspaceDetailPage() {
  const { circleId } = useParams();

  return (
    <CirclesWorkspacePage
      title="Group Circle Workspace"
      subtitle="One circle, opened directly: members, filters, source lists, activity and growth actions — the same workspace, focused on the circle you chose."
      focusCircleId={circleId}
    />
  );
}
