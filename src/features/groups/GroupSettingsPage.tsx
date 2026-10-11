import { useState } from "react";
import { useParams } from "react-router-dom";
import { Lock, Mail, Save, TriangleAlert, UserMinus, Users } from "lucide-react";
import Badge from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import Card, { CardBody, CardTitle } from "../../components/ui/Card";
import FieldHint from "../../components/ui/FieldHint";
import LinkButton from "../../components/ui/LinkButton";
import Select from "../../components/ui/Select";
import Toast from "../../components/ui/Toast";
import { CURRENT_BUSINESS } from "../../data/businessData";
import { useAppStore } from "../../store/context";
import { useAppState, useGroup } from "../../store/selectors";
import type {
  Group,
  GroupAccessType,
  GroupStatus,
  GroupVisibility,
} from "../../domain/types";
import { GROUP_VISIBILITY_LABELS } from "../../domain/types";
import GroupTabsHeader, { GroupMissingState } from "./GroupTabsHeader";

const ACTOR_ID = CURRENT_BUSINESS.id;

const STATUS_OPTIONS: GroupStatus[] = ["Active", "Recruiting", "Pending Review", "Closed"];

const ACCESS_OPTIONS: { value: GroupAccessType; label: string }[] = [
  { value: "open", label: "Open — anyone can join" },
  { value: "request", label: "Request — owner approval needed" },
  { value: "eligibility", label: "Eligibility — membership conditions apply" },
  { value: "invitation", label: "Invitation only — owner must invite" },
];

const FIELD_CLASS =
  "h-11 w-full rounded-lg border border-white/10 bg-ink-800 px-3 text-sm text-slate-200 placeholder:text-slate-500 focus:border-gold-500/50 focus:outline-none disabled:opacity-60";

export default function GroupSettingsPage() {
  const { groupId } = useParams();
  const group = useGroup(groupId);

  if (!group) {
    return <GroupMissingState title="13 — Group Settings" />;
  }

  const isOwner = group.ownerId === ACTOR_ID;

  return (
    <div className="flex flex-col gap-4">
      <GroupTabsHeader
        title="13 — Group Settings"
        subtitle="Owner-only settings: group details, access rules and membership actions."
      />
      <GroupSettingsForm key={group.id} group={group} isOwner={isOwner} />
    </div>
  );
}

function GroupSettingsForm({ group, isOwner }: { group: Group; isOwner: boolean }) {
  const { adminConfig } = useAppState();
  const { dispatch } = useAppStore();

  const [name, setName] = useState(group.name);
  const [purpose, setPurpose] = useState(group.purpose);
  const [status, setStatus] = useState<GroupStatus>(group.status);
  const [accessType, setAccessType] = useState<GroupAccessType>(group.accessType);
  const [visibility, setVisibility] = useState<GroupVisibility>(group.visibility ?? "directory");
  const [stage, setStage] = useState(group.stage ?? "");
  const [feedback, setFeedback] = useState<string | null>(null);

  const isMember = group.memberIds.includes(ACTOR_ID) || isOwner;
  const actor = { id: ACTOR_ID, name: CURRENT_BUSINESS.businessName };

  const save = () => {
    dispatch({
      type: "group/update",
      groupId: group.id,
      patch: {
        name: name.trim() || group.name,
        purpose: purpose.trim() || group.purpose,
        status,
        accessType,
        visibility,
        stage: stage || undefined,
      },
      actor,
    });
    setFeedback("Group settings saved");
  };

  const leave = () => {
    dispatch({ type: "group/leave", groupId: group.id, actor });
    setFeedback(`You left ${group.name}`);
  };

  const closeGroup = () => {
    dispatch({ type: "group/update", groupId: group.id, patch: { status: "Closed" }, actor });
    setFeedback(`${group.name} closed`);
  };

  const reset = () => {
    setName(group.name);
    setPurpose(group.purpose);
    setStatus(group.status);
    setAccessType(group.accessType);
    setVisibility(group.visibility ?? "directory");
    setStage(group.stage ?? "");
  };

  return (
    <div className="flex flex-col gap-4">
      {!isOwner && (
        <div className="flex items-center gap-3 rounded-2xl border border-warning-500/30 bg-warning-500/10 p-4">
          <Lock className="size-4 shrink-0 text-warning-400" />
          <p className="text-xs leading-relaxed text-warning-300">
            {group.ownerName} owns this group, so the settings below are read-only for you.
            {isMember && " You can still leave the group."}
          </p>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardBody className="flex flex-col gap-4">
            <CardTitle>Group details</CardTitle>

            <label className="flex flex-col gap-1.5">
              <span className="text-[11px] font-medium text-slate-400">Group name</span>
              <FieldHint>Shown as the group's title everywhere it appears.</FieldHint>
              <input
                type="text"
                value={name}
                disabled={!isOwner}
                onChange={(event) => setName(event.target.value)}
                className={FIELD_CLASS}
              />
            </label>

            <label className="flex flex-col gap-1.5">
              <span className="text-[11px] font-medium text-slate-400">Purpose</span>
              <FieldHint>
                Describe what this group is for so members know before they join.
              </FieldHint>
              <textarea
                value={purpose}
                disabled={!isOwner}
                onChange={(event) => setPurpose(event.target.value)}
                rows={4}
                className={`${FIELD_CLASS} h-auto py-2 leading-relaxed`}
              />
            </label>

            <div className="grid gap-3 sm:grid-cols-2">
              <Select
                label="Status"
                value={status}
                disabled={!isOwner}
                onChange={(event) => setStatus(event.target.value as GroupStatus)}
                options={STATUS_OPTIONS.map((value) => ({ value, label: value }))}
                hint="Sets the group's current state, shown in lists and badges."
              />
              <Select
                label="Access type"
                value={accessType}
                disabled={!isOwner}
                onChange={(event) => setAccessType(event.target.value as GroupAccessType)}
                options={ACCESS_OPTIONS}
                hint="Controls how people join: instantly, on approval or by invitation."
              />
              <Select
                label="Visibility"
                value={visibility}
                disabled={!isOwner}
                onChange={(event) => setVisibility(event.target.value as GroupVisibility)}
                options={(Object.keys(GROUP_VISIBILITY_LABELS) as GroupVisibility[]).map(
                  (value) => ({ value, label: GROUP_VISIBILITY_LABELS[value] })
                )}
                hint="Decides who can find this group in the public directory."
              />
              <Select
                label="Stage (temporary label)"
                value={stage}
                disabled={!isOwner}
                onChange={(event) => setStage(event.target.value)}
                options={[
                  { value: "", label: "No stage" },
                  ...adminConfig.stageLabels.map((label) => ({ value: label, label })),
                ]}
                hint="Optional admin-defined label for the group's current phase."
              />
              <div className="flex flex-col gap-1.5">
                <span className="text-[11px] font-medium text-slate-400">Type</span>
                <div className="flex h-10 items-center gap-2 rounded-lg border border-white/10 bg-ink-800 px-3">
                  <span className="text-xs text-slate-200">{group.type}</span>
                  <Badge variant="muted">Fixed</Badge>
                </div>
              </div>
            </div>

            {isOwner && (
              <div className="flex flex-wrap gap-2">
                <Button variant="primary" size="sm" onClick={save}>
                  <Save className="size-4" /> Save changes
                </Button>
                <Button variant="secondary" size="sm" onClick={reset}>
                  Reset form
                </Button>
              </div>
            )}
          </CardBody>
        </Card>

        <div className="flex flex-col gap-4">
          {isOwner && (
            <Card>
              <CardBody className="flex flex-col gap-3">
                <CardTitle>Manage this group</CardTitle>
                <LinkButton
                  to={`/business/groups/${group.id}/members`}
                  variant="outline"
                  size="sm"
                  className="w-full"
                >
                  <Users className="size-4" /> Manage members
                </LinkButton>
                <LinkButton
                  to={`/business/groups/${group.id}/invitations`}
                  variant="outline"
                  size="sm"
                  className="w-full"
                >
                  <Mail className="size-4" /> Manage invitations
                </LinkButton>
                <p className="text-[11px] leading-relaxed text-slate-500">
                  Shortcuts to the member roster and the invitation register — the same screens
                  their tabs open.
                </p>
              </CardBody>
            </Card>
          )}

          <Card>
            <CardBody className="flex flex-col gap-3">
              <CardTitle>Rules that never change here</CardTitle>
              <ul className="space-y-2 text-xs leading-relaxed text-slate-400">
                <li>
                  Group type is fixed at creation and controlled by administrators in{" "}
                  <span className="text-slate-200">Group Type Configuration</span>.
                </li>
                <li>
                  Source stays {group.source === "automatic" ? "automatic" : "user created"} for the
                  lifetime of the group.
                </li>
                <li>
                  Location, campaigns and membership programmes are separate relationships — not
                  editable from this screen.
                </li>
              </ul>
            </CardBody>
          </Card>

          <Card>
            <CardBody className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <CardTitle>Membership</CardTitle>
                <Badge variant={isOwner ? "gold" : "default"}>
                  {isOwner ? "Owner" : "Member"}
                </Badge>
              </div>
              <p className="text-xs leading-relaxed text-slate-400">
                {isMember
                  ? `You are one of ${group.memberIds.length} members in ${group.name}.`
                  : "You are not a member of this group."}
              </p>
              {group.source === "automatic" && (
                <p className="flex items-start gap-2 rounded-xl border border-white/10 bg-ink-950/60 p-3 text-[11px] leading-relaxed text-slate-500">
                  <TriangleAlert className="mt-px size-3.5 shrink-0 text-warning-400" />
                  Automatic groups are maintained by the system and cannot be left manually.
                </p>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardBody className="flex flex-col gap-3">
              <CardTitle>Danger zone</CardTitle>
              <p className="text-[11px] leading-relaxed text-slate-500">
                Leave and Close are demo actions guarded by permissions configured by Admin —
                availability follows the rules administrators set, and closing never deletes the
                group record.
              </p>
              <div className="flex flex-wrap gap-2">
                {isMember && group.source !== "automatic" && (
                  <Button variant="danger" size="sm" onClick={leave}>
                    <UserMinus className="size-4" /> Leave group
                  </Button>
                )}
                {isOwner && (
                  <Button variant="danger" size="sm" onClick={closeGroup}>
                    <TriangleAlert className="size-4" /> Close group
                  </Button>
                )}
                {!isOwner && (
                  <p className="text-[11px] text-slate-500">
                    Owner-only — {group.ownerName} controls these actions.
                  </p>
                )}
              </div>
            </CardBody>
          </Card>
        </div>
      </div>

      {feedback && <Toast message={feedback} onDismiss={() => setFeedback(null)} />}
    </div>
  );
}
