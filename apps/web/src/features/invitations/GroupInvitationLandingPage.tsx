import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate, useParams, useSearchParams } from "react-router-dom";
import {
  AlertTriangle,
  ArrowRight,
  Briefcase,
  Building2,
  CheckCircle2,
  Globe,
  MapPin,
  ShieldAlert,
  ShieldCheck,
  User,
  Users,
  XCircle,
} from "lucide-react";
import Badge from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import Card, { CardBody } from "../../components/ui/Card";
import ChsLogo from "../../components/ui/ChsLogo";
import ChsAuthTransition from "../../components/ui/ChsAuthTransition";
import { readAuthSession, writeAuthSession } from "../../app/authSession";
import { useGroup, useInvitation } from "../../store/selectors";
import { useAppStore } from "../../store/context";
import type { Group, Invitation } from "../../domain/types";

interface GroupInvitationLandingPageProps {
  targetAudience?: "business" | "consumer";
}

export default function GroupInvitationLandingPage({
  targetAudience,
}: GroupInvitationLandingPageProps) {
  const { invitationId } = useParams();
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { dispatch } = useAppStore();

  const id = invitationId || searchParams.get("invitationId") || "inv-001";
  const realInvitation = useInvitation(id);
  const realGroup = useGroup(realInvitation?.groupId);

  // Detect audience from prop, URL route, or invitation metadata
  const detectedAudience: "business" | "consumer" = (() => {
    if (targetAudience) return targetAudience;
    if (location.pathname.includes("/business")) return "business";
    if (location.pathname.includes("/consumer") || location.pathname.includes("/customer")) {
      return "consumer";
    }
    const queryAudience = searchParams.get("audience");
    if (queryAudience === "business") return "business";
    if (queryAudience === "consumer") return "consumer";
    if (realInvitation?.inviteeRole === "business-invitee") return "business";
    if (realGroup?.type === "B2B" || realGroup?.type === "Partner" || realGroup?.type === "Marketing") {
      return "business";
    }
    return "consumer";
  })();

  const [audience, setAudience] = useState<"business" | "consumer">(detectedAudience);

  useEffect(() => {
    document.title =
      audience === "business"
        ? "CHS Groups | Business Group Invitation"
        : "CHS Groups | Customer Group Invitation";
  }, [audience]);

  // Fallback demo invitation
  const invitation: Invitation = realInvitation || {
    id,
    groupId: audience === "business" ? "grp-smith-marketing" : "grp-friends-family-demo",
    direction: "incoming",
    kind: "invite",
    inviteeName: audience === "business" ? "Elena Rostova" : "John Doe",
    invitedById: "biz-smith",
    invitedByName: "Smith Business Ltd",
    status: "pending",
    createdAt: new Date().toISOString(),
  };

  const group: Group = realGroup || {
    id: invitation.groupId || (audience === "business" ? "grp-smith-marketing" : "grp-friends-family-demo"),
    name: audience === "business" ? "Smith Business Marketing" : "Friends & Family Circle",
    type: (audience === "business" ? "Marketing" : "Event / Expo") as Group["type"],
    source: "user-created",
    purpose:
      audience === "business"
        ? "A network for sharing business promotions, supplier collaborations, and developing local commercial relationships."
        : "Community updates, shared family news, and local seasonal activities in your neighborhood.",
    ownerId: invitation.invitedById,
    ownerName: invitation.invitedByName,
    memberIds: [invitation.invitedById, "c-001", "c-005"],
    location: { city: "Birmingham", localArea: "Central Community" },
    status: "Active",
    accessType: "open",
    createdAt: "2026-09-01",
  };

  const session = readAuthSession();
  const isAuthenticated = session?.authenticated === true;

  // Form Inputs
  const [name, setName] = useState(
    session?.name || (audience === "business" ? "Elena Rostova" : "John Doe")
  );
  const [email, setEmail] = useState(
    session?.email || (audience === "business" ? "elena@foodhospitality.demo" : "john@community.demo")
  );
  const [businessName, setBusinessName] = useState(
    session?.businessName || "Rostova Hospitality Ltd"
  );

  const [transitioning, setTransitioning] = useState(false);
  const [targetDestination, setTargetDestination] = useState<string | null>(null);

  // Edge cases
  const isSuspended = group.status === "Suspended";
  const isExpired = invitation.status === "cancelled";
  const isRevoked = invitation.status === "declined";
  const isAlreadyAccepted = invitation.status === "accepted";

  // Business invite completion:
  // Gives access to the Participant Dashboard initially, until £1 verification and onboarding are done.
  const handleCompleteBusinessInvite = () => {
    // 1. Dispatch invitation acceptance in store
    if (invitation.id) {
      dispatch({
        type: "invitation/respond",
        invitationId: invitation.id,
        accept: true,
        responder: { id: email.split("@")[0], name: name.trim() },
      });
    }

    // 2. Write auth session as invited business participant
    writeAuthSession({
      role: "business-invitee",
      authenticated: true,
      email: email.trim(),
      name: name.trim(),
      businessName: businessName.trim(),
      accountId: email.split("@")[0],
      city: group.location?.city || "Birmingham",
      postcode: "NW1 8AB",
      sector: "Food & Hospitality",
      verifiedBusiness: false,
    });

    // 3. Navigate to Participant Dashboard
    setTargetDestination("/participant");
    setTransitioning(true);
  };

  // Customer invite completion:
  // Gives direct access to the Consumer Dashboard with NO onboarding needed.
  const handleCompleteCustomerInvite = () => {
    // 1. Dispatch invitation acceptance in store
    if (invitation.id) {
      dispatch({
        type: "invitation/respond",
        invitationId: invitation.id,
        accept: true,
        responder: { id: email.split("@")[0], name: name.trim() },
      });
    }

    // 2. Write auth session as Consumer
    writeAuthSession({
      role: "consumer",
      authenticated: true,
      email: email.trim(),
      name: name.trim(),
      accountId: "cons-john",
      city: group.location?.city || "Birmingham",
      postcode: "B1 2AB",
    });

    // 3. Navigate directly to Consumer Dashboard
    setTargetDestination("/consumer");
    setTransitioning(true);
  };

  const handleTransitionComplete = () => {
    if (targetDestination) {
      navigate(targetDestination, { replace: true });
    }
  };

  return (
    <div className="flex min-h-[calc(100vh-60px)] flex-col items-center justify-center px-4 py-8 sm:px-6">
      <div className="w-full max-w-lg">
        {/* CHS Header Branding */}
        <div className="mb-6 flex justify-center">
          <ChsLogo size="lg" linkTo="/" />
        </div>

        {/* Card Container */}
        <Card className="border border-white/10 bg-ink-900/95 shadow-2xl backdrop-blur-md overflow-hidden">
          {/* Card Accent Top Bar */}
          <div
            className={`h-1.5 w-full bg-gradient-to-r ${
              audience === "business"
                ? "from-gold-500 via-amber-400 to-indigo-500"
                : "from-gold-500 via-emerald-400 to-sky-400"
            }`}
          />

          <CardBody className="flex flex-col gap-5 p-6 sm:p-7">
            {/* Header Titles */}
            <div className="text-center">
              <div className="flex justify-center">
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-semibold ${
                    audience === "business"
                      ? "border-gold-500/30 bg-gold-500/15 text-gold-300"
                      : "border-emerald-500/30 bg-emerald-500/15 text-emerald-300"
                  }`}
                >
                  {audience === "business" ? (
                    <>
                      <Briefcase className="size-3 text-gold-400" /> Business Group Invitation
                    </>
                  ) : (
                    <>
                      <User className="size-3 text-emerald-400" /> Customer Group Invitation
                    </>
                  )}
                </span>
              </div>
              <h1 className="mt-3 text-xl font-extrabold text-white sm:text-2xl tracking-tight">
                {audience === "business"
                  ? "Join as an Invited Business"
                  : "Join as a Community Member"}
              </h1>
              <p className="mt-1 text-xs text-slate-400 leading-relaxed">
                {audience === "business"
                  ? `You have been invited by ${invitation.invitedByName} to join ${group.name}.`
                  : `Connect with local members and businesses on Central Hub Solution.`}
              </p>
            </div>

            {/* Edge-case Status Alerts */}
            {isSuspended && (
              <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-left">
                <div className="flex items-start gap-2.5">
                  <ShieldAlert className="mt-0.5 size-4 shrink-0 text-rose-400" />
                  <div>
                    <p className="text-xs font-bold text-rose-300">This group is currently suspended</p>
                    <p className="mt-0.5 text-[11px] text-rose-300/80">
                      Administrative moderation has temporarily paused new memberships.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {isExpired && (
              <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-left">
                <div className="flex items-start gap-2.5">
                  <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-400" />
                  <div>
                    <p className="text-xs font-bold text-amber-300">This invitation has expired</p>
                    <p className="mt-0.5 text-[11px] text-amber-300/80">
                      Please contact {invitation.invitedByName} for a fresh invitation link.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {isRevoked && (
              <div className="rounded-xl border border-slate-700 bg-ink-950 p-4 text-left">
                <div className="flex items-start gap-2.5">
                  <XCircle className="mt-0.5 size-4 shrink-0 text-slate-400" />
                  <div>
                    <p className="text-xs font-bold text-slate-300">Invitation no longer active</p>
                    <p className="mt-0.5 text-[11px] text-slate-400">
                      This invitation was previously declined or revoked.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {isAlreadyAccepted && (
              <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-left">
                <div className="flex items-start gap-2.5">
                  <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-400" />
                  <div>
                    <p className="text-xs font-bold text-emerald-300">Invitation already accepted</p>
                    <p className="mt-0.5 text-[11px] text-emerald-300/80">
                      You are already a member of this group.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Invited Group Card Summary */}
            <div className="rounded-2xl border border-white/10 bg-ink-950/70 p-4.5 text-left">
              <div className="flex items-start gap-3.5">
                <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-gold-500/20 to-amber-600/20 text-gold-300 border border-gold-500/30 font-bold text-base shadow-inner">
                  {group.name.slice(0, 1).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <h2 className="text-base font-bold text-white truncate">{group.name}</h2>
                    <Badge variant="gold">{group.type}</Badge>
                    {group.pricing === "paid" && (
                      <Badge variant="warning">Paid &bull; £{group.contribution}</Badge>
                    )}
                  </div>
                  <p className="mt-1 text-xs text-slate-400">
                    Host: <strong className="text-white">{group.ownerName}</strong>
                  </p>
                </div>
              </div>

              <div className="mt-3.5 border-t border-white/5 pt-3">
                <p className="text-xs text-slate-300 leading-relaxed">{group.purpose}</p>
              </div>

              <div className="mt-3.5 flex flex-wrap gap-2 text-[11px] text-slate-400">
                {group.location?.city && (
                  <span className="flex items-center gap-1 rounded-md bg-white/5 px-2 py-1">
                    <MapPin className="size-3 text-gold-400" />
                    {group.location.city}
                  </span>
                )}
                <span className="flex items-center gap-1 rounded-md bg-white/5 px-2 py-1">
                  <Users className="size-3 text-sky-400" />
                  {group.memberIds.length} members
                </span>
                <span className="flex items-center gap-1 rounded-md bg-white/5 px-2 py-1 capitalize">
                  <Globe className="size-3 text-emerald-400" />
                  {group.accessType} access
                </span>
              </div>
            </div>

            {/* Access Pathway Explanation */}
            {!isSuspended && !isExpired && !isRevoked && (
              <div className="rounded-2xl border border-white/10 bg-ink-950/50 p-4 text-xs">
                {audience === "business" ? (
                  <div className="flex flex-col gap-2.5">
                    <p className="font-bold text-white flex items-center gap-1.5">
                      <ShieldCheck className="size-4 text-gold-400" />
                      Two-Stage Access for Invited Businesses
                    </p>
                    <div className="flex flex-col gap-2 text-slate-400 leading-relaxed">
                      <div className="flex items-start gap-2">
                        <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-gold-500/20 text-gold-300 text-[10px] font-bold">
                          1
                        </span>
                        <span>
                          <strong className="text-slate-200">Participant Dashboard (Immediate):</strong> Accept this invite to enter the group as a participant member. View discussions, activities, and network with members.
                        </span>
                      </div>
                      <div className="flex items-start gap-2">
                        <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-white/10 text-slate-300 text-[10px] font-bold">
                          2
                        </span>
                        <span>
                          <strong className="text-slate-200">Main Business Dashboard (After Onboarding):</strong> Complete the nominal £1 CHS business verification &amp; onboarding anytime to unlock your full business dashboard and create your own groups.
                        </span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col gap-2">
                    <p className="font-bold text-white flex items-center gap-1.5">
                      <CheckCircle2 className="size-4 text-emerald-400" />
                      Direct Consumer Member Access
                    </p>
                    <p className="text-slate-400 leading-relaxed">
                      Customers join freely with instant access to the Consumer Dashboard. No £1 verification or business onboarding required.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Form & Actions */}
            {!isSuspended && !isExpired && !isRevoked && (
              <div className="flex flex-col gap-4">
                {isAuthenticated ? (
                  <div className="flex flex-col gap-3">
                    <Button
                      variant="primary"
                      size="lg"
                      onClick={() => {
                        if (session?.role === "business") {
                          navigate("/business/groups");
                        } else {
                          navigate("/participant");
                        }
                      }}
                      className="w-full justify-center shadow-lg shadow-gold-500/20"
                    >
                      Continue to Your Dashboard <ArrowRight className="size-4" />
                    </Button>
                    <p className="text-center text-[11px] text-slate-400">
                      Logged in as <strong className="text-white">{session?.name || session?.email}</strong>
                    </p>
                  </div>
                ) : (
                  <div className="flex flex-col gap-4">
                    {/* User Details Form */}
                    <div className="flex flex-col gap-3">
                      {audience === "business" && (
                        <div>
                          <label className="mb-1 block text-xs font-semibold text-slate-300">
                            Business / Trading Name
                          </label>
                          <div className="relative">
                            <Building2 className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-500" />
                            <input
                              type="text"
                              value={businessName}
                              onChange={(e) => setBusinessName(e.target.value)}
                              placeholder="e.g. Rostova Hospitality Ltd"
                              className="w-full rounded-xl border border-white/10 bg-ink-950 py-2.5 pl-9 pr-3 text-xs text-white placeholder-slate-500 outline-none focus:border-gold-500"
                            />
                          </div>
                        </div>
                      )}

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="mb-1 block text-xs font-semibold text-slate-300">
                            Your Name
                          </label>
                          <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="e.g. Alex Smith"
                            className="w-full rounded-xl border border-white/10 bg-ink-950 px-3 py-2.5 text-xs text-white placeholder-slate-500 outline-none focus:border-gold-500"
                          />
                        </div>
                        <div>
                          <label className="mb-1 block text-xs font-semibold text-slate-300">
                            Email Address
                          </label>
                          <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="name@example.com"
                            className="w-full rounded-xl border border-white/10 bg-ink-950 px-3 py-2.5 text-xs text-white placeholder-slate-500 outline-none focus:border-gold-500"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Submit CTA */}
                    {audience === "business" ? (
                      <Button
                        variant="primary"
                        size="lg"
                        onClick={handleCompleteBusinessInvite}
                        className="w-full justify-center text-sm font-bold shadow-lg shadow-gold-500/20 py-3.5"
                      >
                        Accept &amp; Access Participant Dashboard <ArrowRight className="size-4" />
                      </Button>
                    ) : (
                      <Button
                        variant="primary"
                        size="lg"
                        onClick={handleCompleteCustomerInvite}
                        className="w-full justify-center text-sm font-bold shadow-lg shadow-gold-500/20 py-3.5"
                      >
                        Accept &amp; Open Consumer Dashboard <ArrowRight className="size-4" />
                      </Button>
                    )}

                    {/* Switch role fallback */}
                    <div className="flex items-center justify-between text-[11px] text-slate-500">
                      <span>
                        Wrong invitation type?{" "}
                        <button
                          type="button"
                          onClick={() =>
                            setAudience(audience === "business" ? "consumer" : "business")
                          }
                          className="cursor-pointer font-semibold text-gold-300 hover:text-gold-200 underline"
                        >
                          Switch to {audience === "business" ? "Customer" : "Business"} invite
                        </button>
                      </span>
                      <Link
                        to={`/login?invitationId=${encodeURIComponent(id)}`}
                        className="text-slate-400 hover:text-white"
                      >
                        Sign in instead &rarr;
                      </Link>
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardBody>
        </Card>
      </div>

      {/* Auth Transition */}
      {transitioning && (
        <ChsAuthTransition
          mode="login"
          onComplete={handleTransitionComplete}
        />
      )}
    </div>
  );
}
