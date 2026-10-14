import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  User,
  Bell,
  Shield,
  LogOut,
  Info,
  MapPin,
  CheckCircle2,
  Sparkles,
} from "lucide-react";
import Badge from "../../components/ui/Badge";
import Card, { CardBody, CardTitle } from "../../components/ui/Card";
import { getParticipantIdentity } from "./participantIdentity";
import { readParticipantSession, writeAuthSession } from "../../app/authSession";
import { inferCityFromPostcode } from "../groups/groupEligibility";

export default function ParticipantAccountPage() {
  useEffect(() => {
    document.title = "CHS Groups | My Profile";
  }, []);

  const navigate = useNavigate();
  const identity = getParticipantIdentity();
  const session = readParticipantSession();

  const [postcode, setPostcode] = useState(session?.postcode || "B1 1AA");
  const [city, setCity] = useState(session?.city || "Birmingham");
  const [isSaved, setIsSaved] = useState(false);

  const [emailNotifs, setEmailNotifs] = useState(true);
  const [localDiscovery, setLocalDiscovery] = useState(true);
  const [profileVisible, setProfileVisible] = useState(true);

  const handlePostcodeChange = (newVal: string) => {
    setPostcode(newVal);
    const inferred = inferCityFromPostcode(newVal);
    if (inferred) {
      setCity(inferred);
    }
  };

  const handleSaveLocation = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanPostcode = postcode.trim().toUpperCase() || "B1 1AA";
    const cleanCity = city.trim() || inferCityFromPostcode(cleanPostcode) || "Birmingham";

    setPostcode(cleanPostcode);
    setCity(cleanCity);

    if (session) {
      writeAuthSession({
        ...session,
        postcode: cleanPostcode,
        city: cleanCity,
      });
    }

    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
  };

  const handleSignOut = () => {
    sessionStorage.removeItem("chs-auth-state");
    navigate("/");
  };

  return (
    <div className="flex flex-col gap-5 pb-6">
      <div>
        <h1 className="text-xl font-bold text-white sm:text-2xl">My Profile</h1>
        <p className="mt-1 text-xs text-slate-400">
          Manage your consumer identity, location preferences, and discovery settings.
        </p>
      </div>

      {/* Profile Overview */}
      <Card>
        <CardBody className="flex flex-col gap-4">
          <CardTitle>Consumer Details</CardTitle>
          <div className="flex items-center gap-4">
            <div className="flex size-14 items-center justify-center rounded-2xl bg-gold-500/15 text-gold-400">
              <User className="size-7" />
            </div>
            <div>
              <p className="text-base font-bold text-white">{identity.name}</p>
              <p className="text-xs text-slate-400">
                {identity.role === "consumer"
                  ? session?.email || "consumer@community.demo"
                  : "invited@business.demo"}
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                <Badge variant="gold">
                  {identity.role === "consumer" ? "Consumer Member" : identity.label}
                </Badge>
                <Badge variant="muted">Free Community Account</Badge>
              </div>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Location & Postcode */}
      <Card>
        <CardBody className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <CardTitle>Location &amp; Postcode</CardTitle>
            <span className="text-[11px] text-slate-400">Used for local group matching</span>
          </div>

          <form onSubmit={handleSaveLocation} className="flex flex-col gap-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-300">
                  UK Postcode
                </label>
                <div className="relative">
                  <MapPin className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-500" />
                  <input
                    type="text"
                    value={postcode}
                    onChange={(e) => handlePostcodeChange(e.target.value)}
                    placeholder="e.g. B1 1AA"
                    className="w-full rounded-xl border border-white/10 bg-ink-950 py-2.5 pl-9 pr-3 text-xs text-white uppercase outline-none focus:border-gold-500"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-slate-300">
                  City / Region
                </label>
                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="e.g. Birmingham"
                  className="w-full rounded-xl border border-white/10 bg-ink-950 px-3 py-2.5 text-xs text-white outline-none focus:border-gold-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-1">
              <p className="text-[11px] text-slate-400">
                Auto-matches groups located in <span className="text-gold-300">{city}</span> or nearby areas.
              </p>
              <button
                type="submit"
                className="cursor-pointer rounded-xl bg-gold-500 px-4 py-2 text-xs font-bold text-ink-950 transition-colors hover:bg-gold-400"
              >
                Save Location
              </button>
            </div>

            {isSaved && (
              <div className="flex items-center gap-2 text-xs text-emerald-400">
                <CheckCircle2 className="size-4" /> Location updated! Group recommendations refreshed.
              </div>
            )}
          </form>
        </CardBody>
      </Card>

      {/* Preferences */}
      <Card>
        <CardBody className="flex flex-col gap-3">
          <CardTitle>Notifications &amp; Preferences</CardTitle>
          <ToggleRow
            icon={<Bell className="size-4" />}
            label="Email notifications for group invitations"
            hint="Receive email notifications whenever a business or group invites you"
            checked={emailNotifs}
            onChange={setEmailNotifs}
          />
          <ToggleRow
            icon={<Sparkles className="size-4" />}
            label="Local group recommendations"
            hint="Show suggested groups and community events near your postcode"
            checked={localDiscovery}
            onChange={setLocalDiscovery}
          />
          <ToggleRow
            icon={<Shield className="size-4" />}
            label="Profile visible to fellow members"
            hint="Allow other members in joined groups to see your name and profile"
            checked={profileVisible}
            onChange={setProfileVisible}
          />
        </CardBody>
      </Card>

      {/* Membership Plan Info */}
      <Card>
        <CardBody className="flex flex-col gap-3">
          <CardTitle>Membership Status</CardTitle>
          <div className="flex items-start gap-3 rounded-xl border border-white/10 bg-ink-950/60 p-4">
            <Info className="mt-0.5 size-4 shrink-0 text-gold-400" />
            <div>
              <p className="text-xs font-semibold text-white">
                CHS Consumer Account &middot; Free Forever
              </p>
              <p className="mt-1 text-[11px] leading-relaxed text-slate-400">
                As a consumer, you can freely discover and join community groups, accept invitations from local businesses, participate in discussions, and attend events. Business creation and Circle hosting tools are available on business plans.
              </p>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Sign Out */}
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
    <label className="flex items-start justify-between gap-3 rounded-xl border border-white/10 bg-ink-950/60 px-4 py-3 text-xs transition-colors hover:border-white/20">
      <span className="flex items-start gap-3">
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
