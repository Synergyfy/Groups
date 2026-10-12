import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { User, Bell, Shield, LogOut, Info } from "lucide-react";
import Badge from "../../components/ui/Badge";
import Card, { CardBody, CardTitle } from "../../components/ui/Card";
import { getParticipantIdentity } from "./participantIdentity";

export default function ParticipantAccountPage() {
  useEffect(() => {
    document.title = "Groups & Circles | Account";
  }, []);

  const navigate = useNavigate();
  const identity = getParticipantIdentity();
  const [emailNotifs, setEmailNotifs] = useState(true);
  const [profileVisible, setProfileVisible] = useState(true);

  const handleSignOut = () => {
    sessionStorage.removeItem("chs-auth-state");
    navigate("/");
  };

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-lg font-bold text-white sm:text-xl">Account</h1>
        <p className="mt-1 text-xs text-slate-400">
          Manage your profile and preferences.
        </p>
      </div>

      {/* Profile */}
      <Card>
        <CardBody className="flex flex-col gap-3">
          <CardTitle>Profile</CardTitle>
          <div className="flex items-center gap-3">
            <div className="flex size-12 items-center justify-center rounded-full bg-gold-500/15 text-gold-400">
              <User className="size-6" />
            </div>
            <div>
              <p className="text-sm font-semibold text-white">{identity.name}</p>
              <p className="text-[11px] text-slate-500">
                {identity.role === "consumer" ? "consumer@community.demo" : "invited@business.demo"}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge variant="info">{identity.label}</Badge>
            <Badge variant="muted">Free account</Badge>
          </div>
        </CardBody>
      </Card>

      {/* Notifications */}
      <Card>
        <CardBody className="flex flex-col gap-3">
          <CardTitle>Notifications</CardTitle>
          <ToggleRow
            icon={<Bell className="size-4" />}
            label="Email notifications"
            hint="Receive updates about your circles via email"
            checked={emailNotifs}
            onChange={setEmailNotifs}
          />
        </CardBody>
      </Card>

      {/* Privacy */}
      <Card>
        <CardBody className="flex flex-col gap-3">
          <CardTitle>Privacy</CardTitle>
          <ToggleRow
            icon={<Shield className="size-4" />}
            label="Profile visible to circle members"
            hint="Allow members of your circles to see your profile"
            checked={profileVisible}
            onChange={setProfileVisible}
          />
        </CardBody>
      </Card>

      {/* Plan info */}
      <Card>
        <CardBody className="flex flex-col gap-3">
          <CardTitle>Plan</CardTitle>
          <div className="flex items-start gap-3 rounded-lg border border-white/10 bg-ink-950/60 p-3">
            <Info className="mt-0.5 size-4 shrink-0 text-gold-400" />
            <div>
              <p className="text-xs font-semibold text-white">
                Free {identity.role === "consumer" ? "Consumer" : "Participant"}
              </p>
              <p className="mt-1 text-[11px] leading-relaxed text-slate-400">
                You have free access to circles you have been invited to. To create and manage
                your own circles, upgrade to a paid Groups &amp; Circles plan.
              </p>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Sign out */}
      <button
        type="button"
        onClick={handleSignOut}
        className="inline-flex h-11 cursor-pointer items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/5 px-6 text-sm font-medium text-slate-300 transition-colors hover:border-white/25 hover:text-white"
      >
        <LogOut className="size-4" /> Sign out
      </button>
    </div>
  );
}

function ToggleRow({
  icon,
  label,
  hint,
  checked,
  onChange,
}: {
  icon: React.ReactNode;
  label: string;
  hint: string;
  checked: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <label className="flex items-start justify-between gap-3 rounded-xl border border-white/10 bg-ink-950/60 px-3 py-3 text-xs">
      <span className="flex items-start gap-2.5">
        <span className="mt-0.5 text-gold-400">{icon}</span>
        <span>
          <span className="font-semibold text-white">{label}</span>
          <span className="mt-0.5 block text-[11px] text-slate-400">{hint}</span>
        </span>
      </span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="mt-0.5 size-4 shrink-0 cursor-pointer accent-gold-500"
      />
    </label>
  );
}
