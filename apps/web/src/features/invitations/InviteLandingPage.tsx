import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ArrowRight,
  Check,
  Info,
  Link2,
  LogIn,
  Mail,
  MessageSquare,
  ShieldCheck,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import Badge from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import Card, { CardBody, CardTitle } from "../../components/ui/Card";
import EmptyState from "../../components/ui/EmptyState";
import LinkButton from "../../components/ui/LinkButton";
import {
  findAccountByEmail,
  useAppState,
  useCircles,
  useGroup,
  useInvitation,
} from "../../store/selectors";
import { useAppStore } from "../../store/context";
import { newPlatformAccount } from "../../store/reducer";
import {
  readAuthSession,
  writeAuthSession,
  type AuthSession,
} from "../../app/authSession";
import type { Invitation, ParticipantRole, PlatformAccount } from "../../domain/types";

/**
 * Public, invitation-first entry point for someone who is NOT in the system
 * yet. The business owner's invitation link is their way in: it explains who
 * invited them, what Groups & Circles is, then either creates their account
 * (with duplicate prevention) or signs them in — and returns them to this same
 * invitation so they can accept and enter the group.
 */

function roleOf(invitation: Invitation): ParticipantRole {
  if (invitation.inviteeRole) return invitation.inviteeRole;
  if (invitation.circleId) return "consumer";
  return invitation.inviteeId && !invitation.claimedByAccountId
    ? "business-invitee"
    : "consumer";
}

function channelOf(invitation: Invitation): { label: string; icon: React.ReactNode } {
  if (invitation.inviteeEmail) {
    return { label: `Email · ${invitation.inviteeEmail}`, icon: <Mail className="size-3.5" /> };
  }
  if (invitation.inviteePhone) {
    return { label: `SMS · ${invitation.inviteePhone}`, icon: <MessageSquare className="size-3.5" /> };
  }
  return {
    label: "Sent from the business's contact list",
    icon: <Link2 className="size-3.5" />,
  };
}

const ROLE_COPY: Record<ParticipantRole, { title: string; body: string }> = {
  consumer: {
    title: "You'll join as a consumer",
    body: "A member of this group — you can see its posts, information and activities under the group's rules. You will not become the group's owner, a business member or an administrator.",
  },
  "business-invitee": {
    title: "You'll join as an invited business",
    body: "A member of this group with participant permissions. You will not become the group's owner or an administrator, and you don't need your own business dashboard to take part.",
  },
};

const FIELD_CLASS =
  "h-11 rounded-lg border border-white/10 bg-ink-800 px-3 text-sm text-slate-200 placeholder:text-slate-500 focus:border-gold-500/50 focus:outline-none";

export default function InviteLandingPage() {
  useEffect(() => {
    document.title = "Groups & Circles | Group invitation";
  }, []);

  const { invitationId } = useParams();
  const invitation = useInvitation(invitationId);
  const group = useGroup(invitation?.groupId);
  const circles = useCircles();
  const circle = invitation?.circleId
    ? circles.find((entry) => entry.id === invitation.circleId)
    : undefined;
  const state = useAppState();
  const { dispatch } = useAppStore();

  const [session, setSession] = useState<AuthSession | null>(() => readAuthSession());
  const [mode, setMode] = useState<"register" | "signin">("register");

  // Registration form
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [registerError, setRegisterError] = useState<string | null>(null);

  // Sign-in form
  const [signInEmail, setSignInEmail] = useState("");
  const [signInError, setSignInError] = useState<string | null>(null);

  // Accept step
  const [confirmed, setConfirmed] = useState(false);
  const [responded, setResponded] = useState<"accepted" | "declined" | null>(null);

  if (!invitation || invitation.status === "cancelled") {
    return (
      <div className="flex min-h-[calc(100vh-57px)] items-center justify-center px-4 py-10">
        <EmptyState
          title="This invitation link is not valid"
          description="The link may be incomplete, or the invitation was cancelled by the business that sent it. Ask the sender for a new invitation."
          icon={<ShieldCheck className="size-6" />}
          action={
            <LinkButton to="/" variant="outline" size="sm">
              Go to the homepage
            </LinkButton>
          }
        />
      </div>
    );
  }

  const role = roleOf(invitation);
  const channel = channelOf(invitation);
  const targetName = group?.name ?? circle?.config.name ?? "a group";
  const roleCopy = ROLE_COPY[role];
  const alreadyClaimedElsewhere = Boolean(
    invitation.claimedByAccountId &&
      session?.accountId &&
      invitation.claimedByAccountId !== session.accountId
  );

  const startSession = (account: PlatformAccount) => {
    const next: AuthSession = {
      role: account.role,
      authenticated: true,
      email: account.email,
      name: account.name,
      accountId: account.id,
    };
    writeAuthSession(next);
    setSession(next);
    // Bind the invitation to this account so accepting adds *them*.
    dispatch({
      type: "invitation/claim",
      invitationId: invitation.id,
      account: { id: account.id, name: account.name },
    });
  };

  const register = () => {
    setRegisterError(null);
    const trimmedName = name.trim();
    const trimmedEmail = email.trim();
    if (!trimmedName) {
      setRegisterError("Enter your name so the group knows who is joining.");
      return;
    }
    if (!trimmedEmail.includes("@")) {
      setRegisterError("Enter a valid email address — it is how you will sign in.");
      return;
    }
    if (findAccountByEmail(state, trimmedEmail)) {
      setRegisterError("An account with this email address already exists — sign in instead.");
      setMode("signin");
      setSignInEmail(trimmedEmail);
      return;
    }
    const account = newPlatformAccount({
      name: trimmedName,
      email: trimmedEmail,
      phone: phone.trim() || undefined,
      role,
    });
    dispatch({ type: "account/register", account });
    startSession(account);
  };

  const signIn = () => {
    setSignInError(null);
    const account = findAccountByEmail(state, signInEmail);
    if (!account) {
      setSignInError("No account uses this email address — create one instead.");
      setMode("register");
      if (!email) setEmail(signInEmail.trim());
      return;
    }
    startSession(account);
  };

  const respond = (accept: boolean) => {
    if (!session?.accountId || !session.name) return;
    if (accept) {
      dispatch({
        type: "invitation/claim",
        invitationId: invitation.id,
        account: { id: session.accountId, name: session.name },
      });
    }
    dispatch({
      type: "invitation/respond",
      invitationId: invitation.id,
      accept,
      responder: { id: session.accountId, name: session.name },
    });
    setResponded(accept ? "accepted" : "declined");
  };

  return (
    <div className="mx-auto flex min-h-[calc(100vh-57px)] w-full max-w-2xl flex-col gap-4 px-4 py-8">
      {/* --- Header: who invited you and to what ------------------------- */}
      <div className="text-center">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-gold-400">
          You have been invited
        </p>
        <h1 className="mt-1.5 text-2xl font-bold text-white">{targetName}</h1>
        <p className="mt-2 text-sm leading-relaxed text-slate-400">
          <span className="font-semibold text-white">{invitation.invitedByName}</span> invited you
          to join this group on Groups &amp; Circles, the group platform from Central Hub
          Solution.
        </p>
        <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
          <Badge variant="info">
            {channel.icon} {channel.label}
          </Badge>
          <Badge
            variant={
              invitation.status === "pending"
                ? "warning"
                : invitation.status === "accepted"
                  ? "success"
                  : "muted"
            }
          >
            {invitation.status === "pending"
              ? "Waiting for your answer"
              : `Invitation ${invitation.status}`}
          </Badge>
          <Badge variant="gold">
            {role === "consumer" ? "Consumer invite" : "Business invite"}
          </Badge>
        </div>
      </div>

      {/* --- Plain-language platform explainer ---------------------------- */}
      <Card>
        <CardBody className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <Info className="size-4 text-gold-400" />
            <CardTitle>New to Groups &amp; Circles?</CardTitle>
          </div>
          <p className="text-xs leading-relaxed text-slate-400">
            Groups &amp; Circles is where {invitation.invitedByName} runs its groups. Businesses
            create groups for promotions, partnerships or customers, and invite people into them.
            You do not need to have heard of us before, and you do not need to search for the
            group — this invitation link is your way in. There is no cost to accept an invitation
            unless the summary below says the group charges a contribution.
          </p>
          <ol className="flex flex-col gap-1.5 text-[11px] leading-relaxed text-slate-400">
            <li className="flex gap-2">
              <span className="font-semibold text-gold-300">1.</span> Confirm who invited you and
              which group this is.
            </li>
            <li className="flex gap-2">
              <span className="font-semibold text-gold-300">2.</span> Create your free account (or
              sign in if you already have one) — your invitation is kept while you do.
            </li>
            <li className="flex gap-2">
              <span className="font-semibold text-gold-300">3.</span> Accept, and you are in the
              group as a member.
            </li>
          </ol>
        </CardBody>
      </Card>

      {/* --- Group summary ------------------------------------------------ */}
      <Card>
        <CardBody className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <Users className="size-4 text-gold-400" />
            <CardTitle>What you are joining</CardTitle>
          </div>
          <dl className="grid gap-2 sm:grid-cols-2">
            <Fact label="Group" value={targetName} />
            <Fact label="Invited by" value={invitation.invitedByName} />
            {group && <Fact label="Group type" value={group.type} />}
            {group && <Fact label="Access" value={group.accessType} capitalize />}
            {group && (
              <Fact
                label="Cost to join"
                value={
                  group.pricing === "paid" && group.contribution
                    ? `£${group.contribution} per member`
                    : "Free to join"
                }
              />
            )}
            {group && (
              <Fact
                label="Members"
                value={`${group.memberIds.length} of ${group.requiredSize ?? "—"} wanted`}
              />
            )}
          </dl>
        </CardBody>
      </Card>

      {/* --- Already responded -------------------------------------------- */}
      {responded === "declined" && (
        <Card>
          <CardBody className="flex flex-col items-center gap-3 py-8 text-center">
            <X className="size-7 text-slate-500" />
            <p className="text-sm font-semibold text-white">Invitation declined</p>
            <p className="max-w-sm text-xs leading-relaxed text-slate-400">
              Nothing has been added to your account. If you change your mind, open the link{" "}
              {invitation.invitedByName} sent you again while the invitation is still pending.
            </p>
            <LinkButton to="/" variant="outline" size="sm">
              Back to the homepage
            </LinkButton>
          </CardBody>
        </Card>
      )}

      {responded === "accepted" && invitation.groupId && (
        <Card>
          <CardBody className="flex flex-col items-center gap-3 py-8 text-center">
            <span className="flex size-10 items-center justify-center rounded-full bg-success-500/15 text-success-400">
              <Check className="size-5" />
            </span>
            <p className="text-sm font-semibold text-white">You are in {targetName}</p>
            <p className="max-w-sm text-xs leading-relaxed text-slate-400">
              Your account is now a member of this group. Open it to see its members, information
              and activity — group settings stay with {invitation.invitedByName} as the owner.
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              <LinkButton to={`/participant/groups/${invitation.groupId}`} size="sm">
                Open the group <ArrowRight className="size-3.5" />
              </LinkButton>
              <LinkButton to="/participant" variant="outline" size="sm">
                Go to my dashboard
              </LinkButton>
            </div>
          </CardBody>
        </Card>
      )}

      {!responded && invitation.status !== "pending" && (
        <Card>
          <CardBody className="text-center">
            <p className="text-sm font-semibold text-white">
              This invitation was already {invitation.status}
            </p>
            <p className="mt-1 text-xs text-slate-400">
              There is nothing further to do for this link.
            </p>
          </CardBody>
        </Card>
      )}

      {/* --- Access: register or sign in (invitation preserved in the URL) - */}
      {!responded && invitation.status === "pending" && !session && (
        <Card>
          <CardBody className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <UserPlus className="size-4 text-gold-400" />
                <CardTitle>
                  {mode === "register" ? "Create your account" : "Sign in to continue"}
                </CardTitle>
              </div>
              <button
                type="button"
                onClick={() => setMode(mode === "register" ? "signin" : "register")}
                className="cursor-pointer text-[11px] font-semibold text-gold-300 hover:text-gold-200"
              >
                {mode === "register" ? "I already have an account" : "I need to create an account"}
              </button>
            </div>

            <p className="text-[11px] leading-relaxed text-slate-400">
              Your invitation to <span className="font-semibold text-white">{targetName}</span> is
              held on this page while you do this — you will come straight back here afterwards.
            </p>

            {mode === "register" ? (
              <div className="flex flex-col gap-3">
                <label className="flex flex-col gap-1.5">
                  <span className="text-[11px] font-medium text-slate-400">Full name</span>
                  <input
                    className={FIELD_CLASS}
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    placeholder="e.g. Alex Morgan"
                  />
                </label>
                <label className="flex flex-col gap-1.5">
                  <span className="text-[11px] font-medium text-slate-400">Email address</span>
                  <input
                    className={FIELD_CLASS}
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="you@example.com"
                  />
                </label>
                <label className="flex flex-col gap-1.5">
                  <span className="text-[11px] font-medium text-slate-400">
                    Mobile number <span className="text-slate-600">(optional)</span>
                  </span>
                  <input
                    className={FIELD_CLASS}
                    value={phone}
                    onChange={(event) => setPhone(event.target.value)}
                    placeholder="+44 7700 900000"
                  />
                  <span className="text-[10px] text-slate-500">
                    Used for SMS invitations and to stop duplicate accounts.
                  </span>
                </label>
                {registerError && (
                  <p className="rounded-lg border border-danger-500/30 bg-danger-500/10 px-3 py-2 text-[11px] leading-relaxed text-danger-300">
                    {registerError}
                  </p>
                )}
                <Button variant="primary" size="md" onClick={register}>
                  <UserPlus className="size-4" /> Create account and continue
                </Button>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                <label className="flex flex-col gap-1.5">
                  <span className="text-[11px] font-medium text-slate-400">
                    Email address on your account
                  </span>
                  <input
                    className={FIELD_CLASS}
                    type="email"
                    value={signInEmail}
                    onChange={(event) => setSignInEmail(event.target.value)}
                    placeholder="you@example.com"
                  />
                </label>
                {signInError && (
                  <p className="rounded-lg border border-danger-500/30 bg-danger-500/10 px-3 py-2 text-[11px] leading-relaxed text-danger-300">
                    {signInError}
                  </p>
                )}
                <Button variant="primary" size="md" onClick={signIn}>
                  <LogIn className="size-4" /> Sign in and continue
                </Button>
              </div>
            )}
          </CardBody>
        </Card>
      )}

      {/* --- Review & accept (signed in) ---------------------------------- */}
      {!responded && invitation.status === "pending" && session && (
        <Card>
          <CardBody className="flex flex-col gap-4">
            <div className="flex items-center gap-2">
              <Check className="size-4 text-gold-400" />
              <CardTitle>
                Signed in as {session.name ?? session.email} — accept the invitation
              </CardTitle>
            </div>

            <div className="rounded-xl border border-info-500/30 bg-info-500/10 p-3">
              <p className="text-xs font-semibold text-info-400">{roleCopy.title}</p>
              <p className="mt-1 text-[11px] leading-relaxed text-slate-300">{roleCopy.body}</p>
            </div>

            {alreadyClaimedElsewhere && (
              <p className="rounded-lg border border-danger-500/30 bg-danger-500/10 px-3 py-2 text-[11px] leading-relaxed text-danger-300">
                This invitation has already been claimed by another account. Sign in with that
                account to accept it.
              </p>
            )}

            <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-white/10 bg-ink-950/60 p-3">
              <input
                type="checkbox"
                checked={confirmed}
                onChange={(event) => setConfirmed(event.target.checked)}
                className="mt-0.5 size-4 shrink-0 cursor-pointer accent-gold-500"
              />
              <span className="text-xs leading-relaxed text-slate-300">
                I want to join {targetName} as{" "}
                <span className="font-semibold text-white">
                  {role === "consumer" ? "a consumer member" : "an invited business member"}
                </span>
                , and I understand the group is run by {invitation.invitedByName}.
              </span>
            </label>

            <div className="flex flex-wrap gap-2">
              <Button
                variant="primary"
                size="md"
                disabled={!confirmed || alreadyClaimedElsewhere}
                onClick={() => respond(true)}
              >
                <Check className="size-4" /> Accept and join the group
              </Button>
              <Button variant="danger" size="md" onClick={() => respond(false)}>
                <X className="size-4" /> Decline
              </Button>
            </div>

            <button
              type="button"
              onClick={() => {
                sessionStorage.removeItem("chs-auth-state");
                setSession(null);
                setConfirmed(false);
              }}
              className="cursor-pointer self-start text-[11px] text-slate-500 hover:text-slate-300"
            >
              Not you? Sign out and use a different account
            </button>
          </CardBody>
        </Card>
      )}

      <p className="pb-4 text-center text-[11px] leading-relaxed text-slate-500">
        Hosted on Groups &amp; Circles by Central Hub Solution.{" "}
        <Link to="/sign-in" className="font-medium text-gold-400 hover:text-gold-300">
          Just exploring? Sign in with a demo account
        </Link>
      </p>
    </div>
  );
}

function Fact({
  label,
  value,
  capitalize,
}: {
  label: string;
  value: string;
  capitalize?: boolean;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-ink-950/60 px-3 py-2">
      <dt className="text-[11px] uppercase tracking-wide text-slate-500">{label}</dt>
      <dd className={`mt-0.5 text-xs font-semibold text-white ${capitalize ? "capitalize" : ""}`}>
        {value}
      </dd>
    </div>
  );
}
