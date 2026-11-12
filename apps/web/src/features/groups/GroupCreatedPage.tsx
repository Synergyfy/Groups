import { Link, useLocation } from "react-router-dom";
import { CheckCircle2, Eye, Mail, Sparkles } from "lucide-react";
import Badge from "../../components/ui/Badge";
import Card, { CardBody, CardTitle } from "../../components/ui/Card";
import EmptyState from "../../components/ui/EmptyState";
import LinkButton from "../../components/ui/LinkButton";
import SectionHeader from "../../components/ui/SectionHeader";
import ShareLink from "../../components/ui/ShareLink";
import { CURRENT_BUSINESS } from "../../data/businessData";
import { useActor } from "../../store/selectors";
import { memberCountOf, contributionLabel } from "./groupUtils";

const ACTOR_ID = CURRENT_BUSINESS.id;

interface SuccessState {
  groupId?: string;
}

export default function GroupCreatedPage() {
  const location = useLocation();
  const { ownedGroups } = useActor(ACTOR_ID);

  const requestedId = (location.state as SuccessState | null)?.groupId;
  const group =
    ownedGroups.find((entry) => entry.id === requestedId) ?? ownedGroups[0] ?? null;

  if (!group) {
    return (
      <div className="flex flex-col gap-4">
        <SectionHeader
          title="09 — Group Created"
          subtitle="Confirmation of the group you just created, with the next steps to fill it."
        />
        <EmptyState
          title="No group has been created yet"
          description="Run the create wizard to make your first group — you will land back here with the confirmation."
          icon={<Sparkles className="size-6" />}
          action={
            <LinkButton to="/business/groups/create" size="sm">
              Start the create wizard
            </LinkButton>
          }
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <SectionHeader
        title="09 — Group Created"
        subtitle="Confirmation screen with owner status and the next steps: invite members or open the group."
      />

      <Card>
        <CardBody className="flex flex-col gap-4">
          <div className="flex flex-wrap items-start gap-4">
            <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl border border-success-500/30 bg-success-500/15 text-success-400">
              <CheckCircle2 className="size-6" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-base font-bold text-white sm:text-lg">{group.name}</h2>
                <Badge variant="gold">Owner</Badge>
                <Badge variant={group.status === "Active" ? "success" : "info"}>
                  {group.status}
                </Badge>
                <Badge variant="default">{group.type}</Badge>
                {group.pricing === "paid" && (
                  <Badge variant="gold">Paid · {contributionLabel(group)}</Badge>
                )}
              </div>
              <p className="mt-1.5 max-w-2xl text-xs leading-relaxed text-slate-400">
                {group.purpose}
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
                <span className="font-semibold text-gold-400">
                  You are now the Group Owner — {CURRENT_BUSINESS.businessName}
                </span>
                <span className="text-slate-600">·</span>
                <span>Created {group.createdAt}</span>
                <span className="text-slate-600">·</span>
                <span>{group.accessType} access</span>
                <span className="text-slate-600">·</span>
                <span>
                  {memberCountOf(group)} member{memberCountOf(group) === 1 ? "" : "s"}
                </span>
              </div>
            </div>
          </div>

          <p className="flex items-center gap-2 text-sm font-semibold text-success-400">
            <CheckCircle2 className="size-4" /> Your group has been created.
          </p>

          <ShareLink
            url={`${window.location.origin}/business/groups/${group.id}`}
            label={`Invite link to ${group.name}`}
            hint="Share and copy this link — anyone who opens it can find your group and join."
          />

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-white/10 bg-ink-950/60 p-3">
              <p className="text-[11px] uppercase tracking-wide text-slate-500">You</p>
              <p className="mt-1 text-xs font-semibold text-white">Owner · single member</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-ink-950/60 p-3">
              <p className="text-[11px] uppercase tracking-wide text-slate-500">Source</p>
              <p className="mt-1 text-xs font-semibold text-white">
                User created — not a system group
              </p>
            </div>
            <div className="rounded-xl border border-white/10 bg-ink-950/60 p-3">
              <p className="text-[11px] uppercase tracking-wide text-slate-500">Location</p>
              <p className="mt-1 text-xs font-semibold text-white">
                {group.location
                  ? `${group.location.localArea ?? ""}${
                      group.location.localArea && group.location.city ? ", " : ""
                    }${group.location.city ?? ""}`.trim() || "—"
                  : "—"}
              </p>
            </div>
          </div>
        </CardBody>
      </Card>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardBody className="flex h-full flex-col gap-3">
            <CardTitle>Next steps</CardTitle>
            <div className="flex flex-wrap gap-2">
              <LinkButton to={`/business/groups/${group.id}/invitations`}>
                <Mail className="size-4" /> Invite members
              </LinkButton>
              <LinkButton
                to={`/business/groups/${group.id}`}
                state={{ from: "/business/groups/create/success", fromLabel: "Group Created" }}
                variant="outline"
              >
                <Eye className="size-4" /> View the group
              </LinkButton>
              <LinkButton to="/business/groups/create" variant="ghost">
                <Sparkles className="size-4" /> Create another group
              </LinkButton>
            </div>
            <p className="text-[11px] leading-relaxed text-slate-500">
              Groups you create start at one member — you. Your automatic network group and the
              National Community stay separate: creating a group never changes them.
            </p>
          </CardBody>
        </Card>

        <Card>
          <CardBody className="flex h-full flex-col gap-3">
            <CardTitle>Where it appears</CardTitle>
            <ul className="space-y-2 text-xs leading-relaxed text-slate-400">
              <li>
                <Link to="/business/groups/mine" className="text-gold-300 hover:text-gold-200">
                  My Groups
                </Link>{" "}
                — under “Created by me”.
              </li>
              <li>
                <Link to="/business/groups" className="text-gold-300 hover:text-gold-200">
                  Group Circle
                </Link>{" "}
                — in your group counts.
              </li>
              <li>
                It never appears in Explore Groups while you are a member of it.
              </li>
            </ul>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
