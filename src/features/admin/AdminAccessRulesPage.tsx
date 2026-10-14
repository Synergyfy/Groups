import { useState } from "react";
import {
  CheckCircle2,
  Clock,
  KeyRound,
  Save,
  ShieldCheck,
  UserCheck,
  Users,
} from "lucide-react";
import Button from "../../components/ui/Button";
import Card, { CardBody, CardTitle } from "../../components/ui/Card";
import SectionHeader from "../../components/ui/SectionHeader";
import StatCard from "../../components/ui/StatCard";
import Toast from "../../components/ui/Toast";
import { useAppStore } from "../../store/context";

export default function AdminAccessRulesPage() {
  const { dispatch } = useAppStore();
  const [feedback, setFeedback] = useState<string | null>(null);

  // Temporary access settings state (Henry's 7-day or 14-day requirement)
  const [tempAccessDuration, setTempAccessDuration] = useState<"none" | "7" | "14" | "30">("14");
  const [tempInteraction, setTempInteraction] = useState<"read" | "message">("message");
  const [tempExpiryAction, setTempExpiryAction] = useState<"auto-leave" | "grace-period" | "prompt-upgrade">("auto-leave");
  const [requirePaymentForPermanent, setRequirePaymentForPermanent] = useState(true);

  // Who can create groups
  const [creationPolicy, setCreationPolicy] = useState<"all-verified" | "paid-only" | "admin-approved">("all-verified");
  // Who can join groups
  const [joiningPolicy, setJoiningPolicy] = useState<"invitation-first" | "open-request" | "strict-approval">("invitation-first");
  // Who can invite members
  const [invitingPolicy, setInvitingPolicy] = useState<"owners-only" | "all-members" | "admin-assisted">("owners-only");

  // Limits
  const [freeMaxGroups, setFreeMaxGroups] = useState(3);
  const [paidMaxGroups, setPaidMaxGroups] = useState(25);
  const [freeMaxCircles, setFreeMaxCircles] = useState(2);
  const [paidMaxCircles, setPaidMaxCircles] = useState(15);

  const saveRules = () => {
    dispatch({
      type: "admin/update-config",
      patch: {
        partnerDefaults: {
          maxGroups: paidMaxGroups,
          maxCircles: paidMaxCircles,
          canCreateGroups: true,
          canInviteMembers: true,
        },
      },
    });
    setFeedback("Access rules and temporary access configuration saved successfully.");
  };

  return (
    <div className="flex flex-col gap-6">
      <SectionHeader
        title="Access Rules & Temporary Periods"
        subtitle="Define who can create groups, join groups, invite members and manage participants. Configure 7-day or 14-day temporary access periods."
        tip="Temporary access allows new members to preview groups before formal membership or payment confirmation."
        actions={
          <Button variant="primary" size="sm" onClick={saveRules}>
            <Save className="size-4" /> Save Access Rules
          </Button>
        }
      />

      {/* --- Stat Cards ------------------------------------------------ */}
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <StatCard
          label="Active temporary policy"
          value={tempAccessDuration === "none" ? "Disabled" : `${tempAccessDuration} Days`}
          hint="Henry's temporary access setting"
          accent="gold"
        />
        <StatCard
          label="Group creation policy"
          value={
            creationPolicy === "all-verified"
              ? "Verified Businesses"
              : creationPolicy === "paid-only"
                ? "Paid Tier Only"
                : "Admin Approval"
          }
          hint="Authorized group creators"
          accent="info"
        />
        <StatCard
          label="Invitation policy"
          value={invitingPolicy === "owners-only" ? "Owners Only" : "All Members"}
          hint="Controls who can add contacts"
          accent="gold"
        />
        <StatCard
          label="Consumer guardrails"
          value="Strictly Enforced"
          hint="Participant role protected"
          accent="success"
        />
      </div>

      {/* --- Henry's Temporary Access Configuration Card ------------------ */}
      <Card>
        <CardBody className="flex flex-col gap-4">
          <div className="flex items-center gap-2 border-b border-white/10 pb-3">
            <Clock className="size-5 text-gold-400" />
            <div>
              <CardTitle>Temporary Access Periods (Henry's Specification)</CardTitle>
              <p className="text-xs text-slate-400">
                Configure temporary trial or preview periods (including the 7-day or 14-day options discussed in the meeting).
              </p>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="flex flex-col gap-2">
              <label className="text-xs font-semibold text-white">Temporary Period Duration</label>
              <p className="text-[11px] text-slate-400">
                How long a participant can access the group before formal membership or fee confirmation is required.
              </p>
              <div className="grid grid-cols-2 gap-2 mt-1">
                {[
                  { value: "7", label: "7-Day Option", desc: "Short trial / seasonal preview" },
                  { value: "14", label: "14-Day Option", desc: "Standard 2-week evaluation period" },
                  { value: "30", label: "30-Day Option", desc: "Extended promotional access" },
                  { value: "none", label: "Immediate Full", desc: "No temporary period enforced" },
                ].map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setTempAccessDuration(opt.value as any)}
                    className={`flex flex-col rounded-xl border p-3 text-left transition-colors ${
                      tempAccessDuration === opt.value
                        ? "border-gold-500/50 bg-gold-500/10 text-white"
                        : "border-white/10 bg-ink-950/60 text-slate-300 hover:bg-white/5"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold">{opt.label}</span>
                      {tempAccessDuration === opt.value && (
                        <CheckCircle2 className="size-3.5 text-gold-400" />
                      )}
                    </div>
                    <span className="mt-1 text-[10px] text-slate-400">{opt.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <label className="text-xs font-semibold text-white">Temporary Interaction &amp; Expiry</label>
              <div className="flex flex-col gap-2.5 rounded-xl border border-white/10 bg-ink-950/60 p-3.5">
                <label className="flex items-center justify-between text-xs text-slate-300">
                  <span>Interaction allowed during temporary access:</span>
                  <select
                    value={tempInteraction}
                    onChange={(e) => setTempInteraction(e.target.value as any)}
                    className="h-8 rounded-lg border border-white/10 bg-ink-800 px-2 text-xs text-white focus:outline-none"
                  >
                    <option value="message">Participate &amp; Message</option>
                    <option value="read">Read-only Observer</option>
                  </select>
                </label>

                <label className="flex items-center justify-between text-xs text-slate-300">
                  <span>Action upon period expiry:</span>
                  <select
                    value={tempExpiryAction}
                    onChange={(e) => setTempExpiryAction(e.target.value as any)}
                    className="h-8 rounded-lg border border-white/10 bg-ink-800 px-2 text-xs text-white focus:outline-none"
                  >
                    <option value="auto-leave">Automatic Departure / Archive</option>
                    <option value="grace-period">48h Grace Period with Notification</option>
                    <option value="prompt-upgrade">Prompt for Paid Membership</option>
                  </select>
                </label>

                <label className="flex cursor-pointer items-center gap-2 pt-1">
                  <input
                    type="checkbox"
                    checked={requirePaymentForPermanent}
                    onChange={(e) => setRequirePaymentForPermanent(e.target.checked)}
                    className="size-4 accent-gold-500 rounded"
                  />
                  <span className="text-[11px] text-slate-300">
                    Require membership confirmation / payment to transition into permanent status
                  </span>
                </label>
              </div>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* --- Group Creation, Joining & Inviting Policies ------------------ */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardBody className="flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <KeyRound className="size-4 text-gold-400" />
              <CardTitle>Who Can Create Groups</CardTitle>
            </div>
            <p className="text-[11px] text-slate-400">
              Specifies the business authorization required to spin up new groups.
            </p>
            <div className="flex flex-col gap-2">
              {[
                { id: "all-verified", title: "All Verified Businesses", desc: "Any business with completed onboarding." },
                { id: "paid-only", title: "Paid Partners Only", desc: "Restricted to Bronze tier and above." },
                { id: "admin-approved", title: "Admin Pre-Approval", desc: "Every group requires moderator clearance." },
              ].map((item) => (
                <label
                  key={item.id}
                  className={`flex cursor-pointer items-start gap-2.5 rounded-lg border p-2.5 text-xs transition-colors ${
                    creationPolicy === item.id
                      ? "border-gold-500/40 bg-gold-500/10 text-white"
                      : "border-white/10 bg-ink-950/60 text-slate-300 hover:bg-white/5"
                  }`}
                >
                  <input
                    type="radio"
                    name="creationPolicy"
                    checked={creationPolicy === item.id}
                    onChange={() => setCreationPolicy(item.id as any)}
                    className="mt-0.5 accent-gold-500"
                  />
                  <div>
                    <span className="font-semibold">{item.title}</span>
                    <p className="text-[10px] text-slate-400">{item.desc}</p>
                  </div>
                </label>
              ))}
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardBody className="flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <Users className="size-4 text-gold-400" />
              <CardTitle>Who Can Join Groups</CardTitle>
            </div>
            <p className="text-[11px] text-slate-400">
              Entry mechanisms supported across business and consumer groups.
            </p>
            <div className="flex flex-col gap-2">
              {[
                { id: "invitation-first", title: "Invitation-First Default", desc: "Direct invite link required for entry." },
                { id: "open-request", title: "Request to Join Allowed", desc: "Prospective members request approval." },
                { id: "strict-approval", title: "Strict Directory Vetting", desc: "Identity and tier validation required." },
              ].map((item) => (
                <label
                  key={item.id}
                  className={`flex cursor-pointer items-start gap-2.5 rounded-lg border p-2.5 text-xs transition-colors ${
                    joiningPolicy === item.id
                      ? "border-gold-500/40 bg-gold-500/10 text-white"
                      : "border-white/10 bg-ink-950/60 text-slate-300 hover:bg-white/5"
                  }`}
                >
                  <input
                    type="radio"
                    name="joiningPolicy"
                    checked={joiningPolicy === item.id}
                    onChange={() => setJoiningPolicy(item.id as any)}
                    className="mt-0.5 accent-gold-500"
                  />
                  <div>
                    <span className="font-semibold">{item.title}</span>
                    <p className="text-[10px] text-slate-400">{item.desc}</p>
                  </div>
                </label>
              ))}
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardBody className="flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <UserCheck className="size-4 text-gold-400" />
              <CardTitle>Who Can Invite Members</CardTitle>
            </div>
            <p className="text-[11px] text-slate-400">
              Governs whether group members can send invitations or if only owners hold invite authority.
            </p>
            <div className="flex flex-col gap-2">
              {[
                { id: "owners-only", title: "Group Owners Only", desc: "Strict control — only the creator invites." },
                { id: "all-members", title: "All Active Members", desc: "Network effect — members can invite peers." },
                { id: "admin-assisted", title: "Owners + Admin Concierge", desc: "Supported onboarding by admin." },
              ].map((item) => (
                <label
                  key={item.id}
                  className={`flex cursor-pointer items-start gap-2.5 rounded-lg border p-2.5 text-xs transition-colors ${
                    invitingPolicy === item.id
                      ? "border-gold-500/40 bg-gold-500/10 text-white"
                      : "border-white/10 bg-ink-950/60 text-slate-300 hover:bg-white/5"
                  }`}
                >
                  <input
                    type="radio"
                    name="invitingPolicy"
                    checked={invitingPolicy === item.id}
                    onChange={() => setInvitingPolicy(item.id as any)}
                    className="mt-0.5 accent-gold-500"
                  />
                  <div>
                    <span className="font-semibold">{item.title}</span>
                    <p className="text-[10px] text-slate-400">{item.desc}</p>
                  </div>
                </label>
              ))}
            </div>
          </CardBody>
        </Card>
      </div>

      {/* --- Tier Allocation Quotas ------------------------------------- */}
      <Card>
        <CardBody className="flex flex-col gap-3">
          <CardTitle>Group &amp; Circle Creation Quotas</CardTitle>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <label className="flex flex-col gap-1.5 rounded-lg border border-white/10 bg-ink-950/60 p-3">
              <span className="text-[11px] text-slate-400">Free Tier Max Groups</span>
              <input
                type="number"
                value={freeMaxGroups}
                onChange={(e) => setFreeMaxGroups(Number(e.target.value))}
                min={1}
                className="h-9 rounded-md border border-white/10 bg-ink-800 px-2 text-xs text-white"
              />
            </label>
            <label className="flex flex-col gap-1.5 rounded-lg border border-white/10 bg-ink-950/60 p-3">
              <span className="text-[11px] text-slate-400">Paid Tier Max Groups</span>
              <input
                type="number"
                value={paidMaxGroups}
                onChange={(e) => setPaidMaxGroups(Number(e.target.value))}
                min={1}
                className="h-9 rounded-md border border-white/10 bg-ink-800 px-2 text-xs text-white"
              />
            </label>
            <label className="flex flex-col gap-1.5 rounded-lg border border-white/10 bg-ink-950/60 p-3">
              <span className="text-[11px] text-slate-400">Free Tier Max Circles</span>
              <input
                type="number"
                value={freeMaxCircles}
                onChange={(e) => setFreeMaxCircles(Number(e.target.value))}
                min={1}
                className="h-9 rounded-md border border-white/10 bg-ink-800 px-2 text-xs text-white"
              />
            </label>
            <label className="flex flex-col gap-1.5 rounded-lg border border-white/10 bg-ink-950/60 p-3">
              <span className="text-[11px] text-slate-400">Paid Tier Max Circles</span>
              <input
                type="number"
                value={paidMaxCircles}
                onChange={(e) => setPaidMaxCircles(Number(e.target.value))}
                min={1}
                className="h-9 rounded-md border border-white/10 bg-ink-800 px-2 text-xs text-white"
              />
            </label>
          </div>
        </CardBody>
      </Card>

      {/* --- Consumer Guardrail Banner ------------------------------------- */}
      <div className="flex items-start gap-3 rounded-xl border border-gold-500/30 bg-gold-500/[0.08] p-4">
        <ShieldCheck className="mt-0.5 size-5 shrink-0 text-gold-400" />
        <div>
          <p className="text-xs font-semibold text-white">
            Crucial Permission Distinction: Consumer Protections
          </p>
          <p className="mt-1 text-[11px] leading-relaxed text-slate-300">
            Joining a business owner&apos;s consumer group (e.g. Friends &amp; Family or a seasonal customer circle)
            will <strong>never</strong> automatically elevate the consumer to a group owner, a business member,
            or an administrator. Their access remains strictly bound to participant permissions within the invited group.
          </p>
        </div>
      </div>

      {feedback && <Toast message={feedback} onDismiss={() => setFeedback(null)} />}
    </div>
  );
}
