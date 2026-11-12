import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  User,
  Bell,
  Shield,
  LogOut,
  MapPin,
  CheckCircle2,
} from "lucide-react";
import Badge from "../../components/ui/Badge";
import Card, { CardBody, CardTitle } from "../../components/ui/Card";
import { readParticipantSession, writeAuthSession } from "../../app/authSession";
import { inferCityFromPostcode } from "../groups/groupEligibility";

export default function ConsumerAccountPage() {
  useEffect(() => {
    document.title = "CHS Groups | My Profile";
  }, []);

  const navigate = useNavigate();
  const session = readParticipantSession();

  const consumerName = (session?.role === "consumer" && session.name) ? session.name : "John Doe";
  const consumerEmail = session?.email || "consumer@community.demo";

  const [postcode, setPostcode] = useState(session?.postcode || "B1 2AB");
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
    const cleanPostcode = postcode.trim().toUpperCase() || "B1 2AB";
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
    <div className="flex flex-col gap-6 pb-8">
      {/* Page Header */}
      <div>
        <div className="flex items-center gap-2">
          <User className="size-5 text-gold-400" />
          <h1 className="text-xl font-bold text-white sm:text-2xl">My Profile</h1>
          <Badge variant="gold">Consumer Member</Badge>
        </div>
        <p className="mt-1 text-xs text-slate-400">
          Manage your personal consumer profile, community location, and notification preferences.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left Column (2 cols): Profile and Location */}
        <div className="flex flex-col gap-5 lg:col-span-2">
          {/* Identity Card */}
          <Card className="border border-white/10 bg-ink-900/60">
            <CardBody className="p-5">
              <CardTitle className="text-sm font-bold text-white">Member Identity</CardTitle>
              <p className="mt-1 text-xs text-slate-400">
                How your profile appears to organizers and fellow group members.
              </p>

              <div className="mt-4 flex items-center gap-4">
                <div className="flex size-14 items-center justify-center rounded-2xl bg-gold-500/20 text-lg font-bold text-gold-300 ring-1 ring-gold-500/30">
                  {consumerName.slice(0, 1).toUpperCase()}
                </div>
                <div>
                  <p className="text-sm font-bold text-white">{consumerName}</p>
                  <p className="text-xs text-slate-400">{consumerEmail}</p>
                  <div className="mt-1 flex items-center gap-2">
                    <span className="rounded bg-white/5 px-2 py-0.5 text-[10px] text-slate-300">
                      Role: Consumer Member
                    </span>
                    <span className="rounded bg-emerald-500/10 px-2 py-0.5 text-[10px] text-emerald-300">
                      Active
                    </span>
                  </div>
                </div>
              </div>
            </CardBody>
          </Card>

          {/* Location & Postcode Card */}
          <Card className="border border-white/10 bg-ink-900/60">
            <CardBody className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-sm font-bold text-white flex items-center gap-2">
                    <MapPin className="size-4 text-gold-400" /> Community Location &amp; Postcode
                  </CardTitle>
                  <p className="mt-1 text-xs text-slate-400">
                    Your location determines which local groups, circles, and meetups you are eligible to discover.
                  </p>
                </div>
              </div>

              {isSaved && (
                <div className="mt-3 flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/15 p-2.5 text-xs font-semibold text-emerald-200">
                  <CheckCircle2 className="size-4 text-emerald-400" />
                  Location successfully updated!
                </div>
              )}

              <form onSubmit={handleSaveLocation} className="mt-4 flex flex-col gap-4">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <label className="flex flex-col gap-1 text-xs text-slate-300">
                    <span>Postcode</span>
                    <input
                      type="text"
                      value={postcode}
                      onChange={(e) => handlePostcodeChange(e.target.value)}
                      placeholder="e.g. B1 2AB"
                      className="rounded-xl border border-white/10 bg-ink-950 px-3 py-2 text-xs text-white placeholder-slate-500 outline-none focus:border-gold-500"
                    />
                  </label>

                  <label className="flex flex-col gap-1 text-xs text-slate-300">
                    <span>Inferred City / Town</span>
                    <input
                      type="text"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      placeholder="e.g. Birmingham"
                      className="rounded-xl border border-white/10 bg-ink-950 px-3 py-2 text-xs text-white placeholder-slate-500 outline-none focus:border-gold-500"
                    />
                  </label>
                </div>

                <div className="flex items-center justify-end">
                  <button
                    type="submit"
                    className="cursor-pointer rounded-xl bg-gold-500 px-4 py-2 text-xs font-bold text-ink-950 transition-colors hover:bg-gold-400"
                  >
                    Save Location
                  </button>
                </div>
              </form>
            </CardBody>
          </Card>

          {/* Privacy & Discovery Settings */}
          <Card className="border border-white/10 bg-ink-900/60">
            <CardBody className="p-5">
              <CardTitle className="text-sm font-bold text-white flex items-center gap-2">
                <Shield className="size-4 text-gold-400" /> Privacy &amp; Group Discovery
              </CardTitle>

              <div className="mt-4 flex flex-col gap-3">
                <label className="flex items-center justify-between rounded-xl bg-white/[0.02] p-3 border border-white/5">
                  <div className="flex flex-col">
                    <span className="text-xs font-semibold text-white">Local Group Discovery</span>
                    <span className="text-[11px] text-slate-400">
                      Allow local organizers in {city} to recommend relevant community groups.
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={localDiscovery}
                    onChange={(e) => setLocalDiscovery(e.target.checked)}
                    className="size-4 accent-gold-500"
                  />
                </label>

                <label className="flex items-center justify-between rounded-xl bg-white/[0.02] p-3 border border-white/5">
                  <div className="flex flex-col">
                    <span className="text-xs font-semibold text-white">Profile Visible in Groups</span>
                    <span className="text-[11px] text-slate-400">
                      Show your display name and location avatar in joined group member lists.
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={profileVisible}
                    onChange={(e) => setProfileVisible(e.target.checked)}
                    className="size-4 accent-gold-500"
                  />
                </label>
              </div>
            </CardBody>
          </Card>
        </div>

        {/* Right Column (1 col): Notifications and Actions */}
        <div className="flex flex-col gap-5">
          {/* Notifications Card */}
          <Card className="border border-white/10 bg-ink-900/60">
            <CardBody className="p-5">
              <CardTitle className="text-sm font-bold text-white flex items-center gap-2">
                <Bell className="size-4 text-gold-400" /> Notifications
              </CardTitle>

              <div className="mt-3 flex flex-col gap-3">
                <label className="flex items-center justify-between rounded-xl bg-white/[0.02] p-3 border border-white/5">
                  <div className="flex flex-col">
                    <span className="text-xs font-semibold text-white">Email Updates</span>
                    <span className="text-[10px] text-slate-400">Invitations &amp; event reminders</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={emailNotifs}
                    onChange={(e) => setEmailNotifs(e.target.checked)}
                    className="size-4 accent-gold-500"
                  />
                </label>
              </div>
            </CardBody>
          </Card>

          {/* Account Actions */}
          <Card className="border border-white/10 bg-ink-900/60">
            <CardBody className="p-5 flex flex-col gap-3">
              <CardTitle className="text-sm font-bold text-white">Account Actions</CardTitle>
              <button
                type="button"
                onClick={handleSignOut}
                className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 py-2.5 text-xs font-semibold text-slate-300 transition-colors hover:bg-rose-500/10 hover:border-rose-500/30 hover:text-rose-300"
              >
                <LogOut className="size-4" /> Sign Out of CHS
              </button>
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}
