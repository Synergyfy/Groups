import { useState } from "react";
import {
  Building2,
  CheckCircle2,
  Mail,
  MapPin,
  Settings,
  ShieldCheck,
} from "lucide-react";
import Badge from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import Card, { CardBody, CardTitle } from "../../components/ui/Card";
import FieldHint from "../../components/ui/FieldHint";
import LinkButton from "../../components/ui/LinkButton";
import SectionHeader from "../../components/ui/SectionHeader";
import Toast from "../../components/ui/Toast";
import { errorMessage } from "../../app/api";
import { accessDaysLabel } from "../../domain/types";
import { businessApi, useBusinessData } from "../../business/BusinessDataProvider";

const FIELD_CLASS =
  "h-11 rounded-lg border border-white/10 bg-ink-800 px-3 text-sm text-slate-200 placeholder:text-slate-500 focus:border-gold-500/50 focus:outline-none";

export default function BusinessSettingsPage() {
  const { profile, plan, locations, refresh } = useBusinessData();

  const [name, setName] = useState(profile?.business.name ?? "");
  const [contactName, setContactName] = useState(
    profile?.business.contactName ?? ""
  );
  const [phone, setPhone] = useState(profile?.business.phone ?? "");
  const [category, setCategory] = useState(profile?.business.category ?? "");
  const [city, setCity] = useState(profile?.business.city ?? "");
  const [localArea, setLocalArea] = useState(
    profile?.business.localArea ?? ""
  );
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const cities = locations?.cities ?? [];
  const cityNames = cities.map((entry) => entry.name);
  const areas =
    cities.find((entry) => entry.name === city)?.areas.map((entry) => entry.name) ??
    [];

  const save = async () => {
    if (!name.trim() || saving) return;
    setSaving(true);
    setFeedback(null);
    setError(null);
    try {
      await businessApi.updateProfile({
        name: name.trim(),
        contactName: contactName.trim(),
        phone: phone.trim() || undefined,
        category: category.trim(),
        city,
        localArea: localArea || undefined,
      });
      await refresh();
      setFeedback("Account settings saved");
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setSaving(false);
    }
  };

  const access = profile?.access;
  const relationships = profile?.relationships;

  return (
    <div className="flex flex-col gap-4">
      <SectionHeader
        title="Account Settings"
        subtitle="Your business identity, location and paid access — the details other members and the platform use."
      />

      <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <Card>
          <CardBody className="flex flex-col gap-4">
            <div className="flex items-center gap-2">
              <Building2 className="size-4 text-gold-400" />
              <CardTitle>Business profile</CardTitle>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="flex flex-col gap-1.5 text-xs">
                <span className="font-semibold text-white">Business name</span>
                <FieldHint>Shown on every group, invitation and circle you own.</FieldHint>
                <input
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="e.g. City Foods"
                  className={FIELD_CLASS}
                />
              </label>
              <label className="flex flex-col gap-1.5 text-xs">
                <span className="font-semibold text-white">Contact name</span>
                <FieldHint>The person other members should ask for.</FieldHint>
                <input
                  value={contactName}
                  onChange={(event) => setContactName(event.target.value)}
                  placeholder="e.g. Jordan Blake"
                  className={FIELD_CLASS}
                />
              </label>
              <label className="flex flex-col gap-1.5 text-xs">
                <span className="font-semibold text-white">Email address</span>
                <FieldHint>Sign-in email — managed by your account, not this form.</FieldHint>
                <input
                  value={profile?.business.email ?? ""}
                  readOnly
                  className={`${FIELD_CLASS} cursor-not-allowed opacity-60`}
                />
              </label>
              <label className="flex flex-col gap-1.5 text-xs">
                <span className="font-semibold text-white">Phone</span>
                <FieldHint>Optional contact number for your business.</FieldHint>
                <input
                  value={phone}
                  onChange={(event) => setPhone(event.target.value)}
                  inputMode="tel"
                  placeholder="+44 7700 900000"
                  className={FIELD_CLASS}
                />
              </label>
              <label className="flex flex-col gap-1.5 text-xs sm:col-span-2">
                <span className="font-semibold text-white">Category</span>
                <FieldHint>How your business is classified in the directory.</FieldHint>
                <input
                  value={category}
                  onChange={(event) => setCategory(event.target.value)}
                  placeholder="e.g. Food & Beverage"
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
                <select
                  value={city}
                  onChange={(event) => {
                    setCity(event.target.value);
                    setLocalArea("");
                  }}
                  className={FIELD_CLASS}
                >
                  <option value="">Choose a city…</option>
                  {cityNames.map((entry) => (
                    <option key={entry} value={entry}>
                      {entry}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1.5 text-xs">
                <span className="font-semibold text-white">Local area</span>
                <FieldHint>Optional area within the city.</FieldHint>
                <select
                  value={localArea}
                  onChange={(event) => setLocalArea(event.target.value)}
                  className={FIELD_CLASS}
                  disabled={areas.length === 0}
                >
                  <option value="">No local area</option>
                  {areas.map((entry) => (
                    <option key={entry} value={entry}>
                      {entry}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            {error && (
              <p className="rounded-xl border border-danger-500/30 bg-danger-500/10 px-3 py-2.5 text-xs text-danger-400">
                {error}
              </p>
            )}

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-3">
              <p className="text-[11px] text-slate-500">
                Saving updates your business record and the location used by grouping rules.
              </p>
              <Button
                variant="primary"
                size="md"
                onClick={save}
                disabled={!name.trim() || saving}
              >
                <CheckCircle2 className="size-4" />
                {saving ? "Saving…" : "Save changes"}
              </Button>
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
                <Badge variant={access?.agreementAccepted ? "success" : "warning"}>
                  {access?.agreementAccepted ? "Agreement accepted" : "Agreement pending"}
                </Badge>
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
                    plan?.plan.accessExpiresAt?.slice(0, 10) ?? "Not active"
                  }
                />
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

      {feedback && <Toast message={feedback} onDismiss={() => setFeedback(null)} />}
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
