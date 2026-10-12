import { useState } from "react";
import { Lock, Shield } from "lucide-react";
import Card, { CardBody, CardTitle } from "../../components/ui/Card";
import FieldHint from "../../components/ui/FieldHint";
import SectionHeader from "../../components/ui/SectionHeader";
import TipIcon from "../../components/ui/TipIcon";
import Toast from "../../components/ui/Toast";
import { useAppState } from "../../store/selectors";
import { useAppStore } from "../../store/context";
import type { PartnerPermissions } from "../../domain/types";

const PERMISSION_GROUPS: { title: string; description: string; keys: (keyof PartnerPermissions)[] }[] = [
  {
    title: "Group management",
    description: "What partners can do with groups",
    keys: ["canCreateGroups", "canInviteMembers", "canRemoveMembers", "maxGroups"],
  },
  {
    title: "Circle management",
    description: "What partners can do with circles",
    keys: ["canCreateCircles", "maxCircles"],
  },
  {
    title: "Financial",
    description: "Paid features and revenue",
    keys: ["canRunPaidGroups", "canRunFreeGroups", "canSetContributionAmounts", "revenueSharePercent"],
  },
  {
    title: "Reporting & campaigns",
    description: "Access to analytics and marketing tools",
    keys: ["canAccessCampaigns", "canAccessReports", "canSeeFinancials"],
  },
];

const PERMISSION_TIPS: Record<keyof PartnerPermissions, string> = {
  canCreateGroups: "On: new partners can set up groups. Off: they cannot create any groups.",
  canCreateCircles: "On: new partners can create circles. Off: circle creation is blocked.",
  canInviteMembers: "On: new partners can add people to groups. Off: inviting is blocked.",
  canRemoveMembers: "On: new partners can remove members. Off: only an admin can remove them.",
  canRunPaidGroups: "On: new partners can run groups that collect payments. Off: paid groups are blocked.",
  canRunFreeGroups: "On: new partners can run free groups. Off: running free groups is blocked.",
  canAccessCampaigns: "On: new partners can open campaigns. Off: campaigns stay hidden from them.",
  canAccessReports: "On: new partners can open the reports area. Off: reports stay hidden.",
  canSeeFinancials: "On: new partners can see revenue and fee figures. Off: financials stay hidden.",
  canSetContributionAmounts:
    "On: new partners can choose contribution amounts. Off: they cannot change them.",
  maxGroups: "The group limit a new partner starts with — creation past it is blocked.",
  maxCircles: "The circle limit a new partner starts with.",
  revenueSharePercent: "The share of platform revenue a new partner keeps from paid groups.",
};

const PERMISSION_GROUP_TIPS: Record<string, string> = {
  "Group management": "maxGroups caps how many groups a partner may have at once.",
  "Circle management": "maxCircles caps how many circles a partner may have at once.",
  Financial: "Revenue share is the partner's cut of revenue from their paid groups.",
  "Reporting & campaigns": "These decide which reporting and marketing areas a partner can open.",
};

export default function AdminPermissionsPage() {
  const state = useAppState();
  const { dispatch } = useAppStore();
  const [feedback, setFeedback] = useState<string | null>(null);

  const defaults = state.adminConfig.partnerDefaults;

  const updateDefault = (key: keyof PartnerPermissions, value: boolean | number) => {
    dispatch({ type: "admin/update-config", patch: { partnerDefaults: { [key]: value } } });
    setFeedback("Default permissions updated — applies to new partners");
  };

  return (
    <div className="flex flex-col gap-4">
      <SectionHeader
        title="Partner Permissions Matrix"
        subtitle="Default permissions applied to new partners. Existing partners keep their own overrides — edit them on the Partners page."
        tip="Click any row to flip it — each change saves immediately."
      />

      <div className="rounded-xl border border-gold-500/30 bg-gold-500/5 p-4">
        <div className="flex items-start gap-2.5">
          <Shield className="mt-0.5 size-4 shrink-0 text-gold-400" />
          <div>
            <p className="text-xs font-semibold text-gold-200">How permissions work</p>
            <p className="mt-1 text-[11px] leading-relaxed text-slate-300">
              Free partners get limited capabilities: they can create groups and circles but cannot run paid groups,
              remove members, or access financial data. Paid partners unlock additional features based on their tier,
              including revenue share, campaign access and financial reporting. Admin can override any permission per partner.
            </p>
          </div>
        </div>
      </div>

      {PERMISSION_GROUPS.map((group) => (
        <Card key={group.title}>
          <CardBody className="flex flex-col gap-3">
            <div>
              <div className="flex items-center gap-1.5">
                <CardTitle>{group.title}</CardTitle>
                <TipIcon text={PERMISSION_GROUP_TIPS[group.title]} />
              </div>
              <p className="mt-0.5 text-[11px] text-slate-500">{group.description}</p>
            </div>
            <div className="grid gap-1.5 sm:grid-cols-2">
              {group.keys.map((key) => {
                const value = defaults[key];
                const isBoolean = typeof value === "boolean";
                return (
                  <div key={key}>
                    <button
                      type="button"
                      onClick={() => updateDefault(key, isBoolean ? !value : value)}
                      className="flex w-full cursor-pointer items-center justify-between gap-2 rounded-lg bg-white/5 px-3 py-2.5 text-left transition-colors hover:bg-white/10"
                    >
                      <span className="text-xs text-slate-300">{key.replace(/([A-Z])/g, " $1").replace(/^./, (s) => s.toUpperCase())}</span>
                      {isBoolean ? (
                        <span
                          className={`inline-flex h-5 w-9 shrink-0 items-center rounded-full px-0.5 transition-colors ${
                            value ? "bg-emerald-500/30" : "bg-white/10"
                          }`}
                        >
                          <span
                            className={`size-4 rounded-full transition-transform ${
                              value ? "translate-x-4 bg-emerald-400" : "translate-x-0 bg-slate-500"
                            }`}
                          />
                        </span>
                      ) : (
                        <span className="rounded bg-white/10 px-2 py-0.5 text-xs font-semibold text-gold-300">{String(value)}</span>
                      )}
                    </button>
                    <FieldHint>{PERMISSION_TIPS[key]}</FieldHint>
                  </div>
                );
              })}
            </div>
          </CardBody>
        </Card>
      ))}

      {/* Quick reference */}
      <Card>
        <CardBody className="flex flex-col gap-3">
          <div className="flex items-center gap-1.5">
            <Lock className="size-4 text-gold-400" />
            <CardTitle>Free vs Paid — quick reference</CardTitle>
            <TipIcon text="Reference only — this table changes no settings." />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-white/10 text-left text-slate-400">
                  <th className="pb-2 pr-4 font-medium">Capability</th>
                  <th className="pb-2 pr-4 font-medium">Free partner</th>
                  <th className="pb-2 font-medium">Paid partner</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {[
                  ["Create groups", "Up to 3", "Up to 25"],
                  ["Create circles", "Up to 2", "Up to 15"],
                  ["Invite members", "Yes", "Yes"],
                  ["Remove members", "No", "Yes"],
                  ["Run free groups", "Yes", "Yes"],
                  ["Run paid groups", "No", "Yes"],
                  ["Set contribution amounts", "No", "Yes"],
                  ["Access campaigns", "No", "Yes"],
                  ["Access reports", "No", "Yes"],
                  ["See financials", "No", "Yes"],
                  ["Revenue share", "0%", "5–20%"],
                ].map(([cap, free, paid]) => (
                  <tr key={cap}>
                    <td className="py-2 pr-4 text-slate-300">{cap}</td>
                    <td className="py-2 pr-4 text-slate-400">{free}</td>
                    <td className="py-2 text-gold-200">{paid}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardBody>
      </Card>

      {feedback && <Toast message={feedback} onDismiss={() => setFeedback(null)} />}
    </div>
  );
}
