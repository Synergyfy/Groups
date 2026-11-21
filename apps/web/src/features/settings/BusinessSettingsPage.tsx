import {
  Building2,
  ExternalLink,
  Mail,
  MapPin,
  Settings,
  ShieldCheck,
} from "lucide-react";
import Badge from "../../components/ui/Badge";
import Card, { CardBody, CardTitle } from "../../components/ui/Card";
import FieldHint from "../../components/ui/FieldHint";
import LinkButton from "../../components/ui/LinkButton";
import SectionHeader from "../../components/ui/SectionHeader";
import { accessDaysLabel } from "../../domain/types";
import { useBusinessData } from "../../business/BusinessDataProvider";
import { mcomProfileUrl } from "../../lib/mcomProfile";

const FIELD_CLASS =
  "h-11 cursor-not-allowed rounded-lg border border-white/10 bg-ink-800 px-3 text-sm text-slate-300 opacity-80 outline-none";

export default function BusinessSettingsPage() {
  const { profile, plan } = useBusinessData();

  const access = profile?.access;
  const relationships = profile?.relationships;
  const centralSource =
    access?.accessSource !== undefined && access.accessSource !== "local";

  return (
    <div className="flex flex-col gap-4">
      <SectionHeader
        title="Account Settings"
        subtitle="Your business identity, location and paid access — the details other members and the platform use."
      />

      <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <Card>
          <CardBody className="flex flex-col gap-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex items-center gap-2">
                <Building2 className="size-4 text-gold-400" />
                <CardTitle>Business profile</CardTitle>
              </div>
              <a
                href={mcomProfileUrl()}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 rounded-xl border border-gold-500/30 bg-gold-500/10 px-3 py-2 text-xs font-semibold text-gold-300 transition-colors hover:border-gold-500/60 hover:bg-gold-500/20"
              >
                <ExternalLink className="size-3.5" />
                Edit in Central Hub
              </a>
            </div>

            <p className="rounded-xl border border-white/10 bg-ink-950/60 px-3 py-2 text-[11px] leading-relaxed text-slate-500">
              Business name, contact details, category and location are owned by
              Central Hub. Save changes there and Groups &amp; Circles updates
              automatically — you cannot edit them here.
            </p>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="flex flex-col gap-1.5 text-xs">
                <span className="font-semibold text-white">Business name</span>
                <FieldHint>Shown on every group, invitation and circle you own.</FieldHint>
                <input
                  value={profile?.business.name ?? ""}
                  readOnly
                  placeholder="Not set in Central Hub"
                  className={FIELD_CLASS}
                />
              </label>
              <label className="flex flex-col gap-1.5 text-xs">
                <span className="font-semibold text-white">Contact name</span>
                <FieldHint>The person other members should ask for.</FieldHint>
                <input
                  value={profile?.business.contactName ?? ""}
                  readOnly
                  placeholder="Not set in Central Hub"
                  className={FIELD_CLASS}
                />
              </label>
              <label className="flex flex-col gap-1.5 text-xs">
                <span className="font-semibold text-white">Email address</span>
                <FieldHint>Sign-in email — owned by Central Hub.</FieldHint>
                <input
                  value={profile?.business.email ?? ""}
                  readOnly
                  className={FIELD_CLASS}
                />
              </label>
              <label className="flex flex-col gap-1.5 text-xs">
                <span className="font-semibold text-white">Phone</span>
                <FieldHint>Optional contact number for your business.</FieldHint>
                <input
                  value={profile?.business.phone ?? ""}
                  readOnly
                  placeholder="Not set in Central Hub"
                  className={FIELD_CLASS}
                />
              </label>
              <label className="flex flex-col gap-1.5 text-xs sm:col-span-2">
                <span className="font-semibold text-white">Category</span>
                <FieldHint>How your business is classified in the directory.</FieldHint>
                <input
                  value={profile?.business.category ?? ""}
                  readOnly
                  placeholder="Not set in Central Hub"
                  className={FIELD_CLASS}
                />
              </label>
            </div>

            <div className="flex items-center gap-2 border-t border-white/10 pt-3">
              <MapPin className="size-4 text-gold-400" />
              <CardTitle>Location</CardTitle>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="flex flex-col gap-1.5 text-xs">
                <span className="font-semibold text-white">City</span>
                <FieldHint>Used for automatic grouping and local discovery.</FieldHint>
                <input
                  value={profile?.business.city ?? ""}
                  readOnly
                  placeholder="Not set in Central Hub"
                  className={FIELD_CLASS}
                />
              </label>
              <label className="flex flex-col gap-1.5 text-xs">
                <span className="font-semibold text-white">Local area</span>
                <FieldHint>Optional area within the city.</FieldHint>
                <input
                  value={profile?.business.localArea ?? ""}
                  readOnly
                  placeholder="Not set in Central Hub"
                  className={FIELD_CLASS}
                />
              </label>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-3">
              <p className="text-[11px] text-slate-500">
                Need to change something? Update your Central Hub profile and the
                change will arrive here automatically.
              </p>
              <a
                href={mcomProfileUrl()}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-slate-300 transition-colors hover:border-gold-500/30 hover:bg-gold-500/10 hover:text-gold-300"
              >
                <ExternalLink className="size-4" /> Open Central Hub profile
              </a>
            </div>
          </CardBody>
        </Card>

        <div className="flex flex-col gap-4">
          <Card>
            <CardBody className="flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="size-4 text-gold-400" />
                <CardTitle>Paid access</CardTitle>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant={access?.paid ? "success" : "warning"}>
                  {access?.paid ? "Paid" : "Unpaid"}
                </Badge>
                {centralSource ? (
                  <Badge variant="info">
                    {access?.accessSource === "membership"
                      ? "Central Hub membership"
                      : access?.accessSource === "access_pass"
                        ? "Central Hub access pass"
                        : "Central Hub trial"}
                  </Badge>
                ) : (
                  <Badge variant={access?.agreementAccepted ? "success" : "warning"}>
                    {access?.agreementAccepted ? "Agreement accepted" : "Agreement pending"}
                  </Badge>
                )}
                <Badge variant="gold">{plan?.plan.planName || "—"}</Badge>
              </div>
              <dl className="flex flex-col gap-1.5 text-[11px]">
                <Row label="Plan" value={plan?.plan.planName || "—"} />
                <Row
                  label="Variant"
                  value={plan?.plan.variant ?? "—"}
                  capitalize
                />
                <Row
                  label="Access period"
                  value={accessDaysLabel(
                    plan?.plan.accessDays ?? access?.accessDays ?? 0,
                  )}
                />
                <Row
                  label="Access fee"
                  value={`£${plan?.plan.accessFee ?? access?.accessFee ?? 0}`}
                />
                <Row
                  label="Expires"
                  value={
                    plan?.plan.accessExpiresAt?.slice(0, 10) ??
                    (centralSource &&
                    access?.accessSource === "membership"
                      ? "Follows membership"
                      : "Not active")
                  }
                />
                {centralSource && (
                  <Row
                    label="Access source"
                    value={
                      access?.accessSource === "membership"
                        ? `${access.membershipName ?? "Central Hub"} membership`
                        : access?.accessSource === "access_pass"
                          ? `Access pass${access.externalPlanId ? ` (${access.externalPlanId})` : ""}`
                          : `Trial${
                              access?.trialDaysRemaining !== undefined
                                ? ` · ${access.trialDaysRemaining} days left`
                                : ""
                            }`
                    }
                  />
                )}
                <Row
                  label="Group quota"
                  value={String(plan?.quotas.groups ?? "—")}
                />
                <Row
                  label="Circle quota"
                  value={String(plan?.quotas.circles ?? "—")}
                />
              </dl>
              <p className="rounded-xl border border-white/10 bg-ink-950/60 px-3 py-2 text-[11px] leading-relaxed text-slate-500">
                Paid access is activated through the access agreement before the dashboard opens.
                Group and circle quotas come from your current plan.
              </p>
            </CardBody>
          </Card>

          <Card>
            <CardBody className="flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <Settings className="size-4 text-gold-400" />
                <CardTitle>Support relationships</CardTitle>
              </div>
              <dl className="flex flex-col gap-1.5 text-[11px]">
                <Row
                  label="Account manager"
                  value={relationships?.accountManager?.name ?? "Not assigned"}
                />
                <Row label="Agent" value={relationships?.agent?.name ?? "Not assigned"} />
                <Row
                  label="Consultant"
                  value={relationships?.consultant?.name ?? "Not assigned"}
                />
              </dl>
              <div className="flex flex-wrap gap-2">
                <LinkButton to="/business/community" size="sm" variant="outline">
                  National Community
                </LinkButton>
                <LinkButton to="/business/location" size="sm" variant="ghost">
                  My Location
                </LinkButton>
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardBody className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <Mail className="size-4 text-gold-400" />
                <CardTitle>Signed-in account</CardTitle>
              </div>
              <p className="text-xs text-slate-300">
                {profile?.user.name || profile?.business.contactName || "Business account"}
              </p>
              <p className="text-[11px] text-slate-500">{profile?.business.email}</p>
              <p className="text-[11px] text-slate-500">
                Member since {profile?.joinedAt?.slice(0, 10) ?? "—"}
              </p>
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}

function Row({
  label,
  value,
  capitalize = false,
}: {
  label: string;
  value: string;
  capitalize?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-3 rounded-lg border border-white/10 bg-ink-950/50 px-3 py-2">
      <dt className="text-[11px] text-slate-500">{label}</dt>
      <dd
        className={`text-right text-xs font-medium text-slate-200 ${
          capitalize ? "capitalize" : ""
        }`}
      >
        {value}
      </dd>
    </div>
  );
}
