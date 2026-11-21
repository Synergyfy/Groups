import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  User,
  Bell,
  Shield,
  LogOut,
  MapPin,
  ExternalLink,
} from "lucide-react";
import Badge from "../../components/ui/Badge";
import Card, { CardBody, CardTitle } from "../../components/ui/Card";
import { authApi, errorMessage } from "../../app/api";
import {
  clearAuthSession,
  readParticipantSession,
} from "../../app/authSession";
import { consumerApi } from "../../consumer/consumerApi";
import { useConsumerData } from "../../consumer/ConsumerDataProvider";
import { mcomProfileUrl } from "../../lib/mcomProfile";

export default function ConsumerAccountPage() {
  useEffect(() => {
    document.title = "CHS Groups | My Profile";
  }, []);

  const navigate = useNavigate();
  const session = readParticipantSession();
  const { profile, refresh } = useConsumerData();

  const consumerName = profile?.name || session?.name || "Member";
  const consumerEmail = profile?.email || session?.email || "";

  const [emailUpdates, setEmailUpdates] = useState(
    profile?.preferences.emailUpdates ?? true,
  );
  const [localDiscovery, setLocalDiscovery] = useState(
    profile?.preferences.localDiscovery ?? true,
  );
  const [profileVisible, setProfileVisible] = useState(
    profile?.preferences.profileVisible ?? true,
  );

  const [feedback, setFeedback] = useState<string | null>(null);

  useEffect(() => {
    if (!profile) return;
    // Sync the local-only preference toggles once the API profile arrives.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setEmailUpdates(profile.preferences.emailUpdates);
    setLocalDiscovery(profile.preferences.localDiscovery);
    setProfileVisible(profile.preferences.profileVisible);
  }, [profile]);

  const updatePreference = async (
    field: "emailUpdates" | "localDiscovery" | "profileVisible",
    value: boolean,
  ) => {
    setFeedback(null);
    if (field === "emailUpdates") setEmailUpdates(value);
    if (field === "localDiscovery") setLocalDiscovery(value);
    if (field === "profileVisible") setProfileVisible(value);
    try {
      await consumerApi.updatePreferences({ [field]: value });
      await refresh();
    } catch (cause) {
      setFeedback(errorMessage(cause));
    }
  };

  const handleSignOut = async () => {
    try {
      await authApi.logout();
    } finally {
      clearAuthSession();
      navigate("/");
    }
  };

  return (
    <div className="flex flex-col gap-6 pb-8">
      <div>
        <div className="flex items-center gap-2">
          <User className="size-5 text-gold-400" />
          <h1 className="text-xl font-bold text-white sm:text-2xl">My Profile</h1>
          <Badge variant="gold">Consumer Member</Badge>
        </div>
        <p className="mt-1 text-xs text-slate-400">
          Your identity is managed by Central Hub. Manage your local notification
          and discovery preferences here.
        </p>
      </div>

      {feedback && (
        <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-xs text-rose-200">
          {feedback}
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="flex flex-col gap-5 lg:col-span-2">
          <Card className="border border-white/10 bg-ink-900/60">
            <CardBody className="p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <CardTitle className="text-sm font-bold text-white">
                    Member Identity
                  </CardTitle>
                  <p className="mt-1 text-xs text-slate-400">
                    How your profile appears to organizers and fellow group members.
                  </p>
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
                      Free access
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-5 grid grid-cols-1 gap-3 border-t border-white/10 pt-4 sm:grid-cols-2">
                <ReadOnlyField label="Full name" value={profile?.name} />
                <ReadOnlyField label="Phone" value={profile?.phone} />
                <ReadOnlyField
                  label="Address"
                  value={profile?.address}
                  className="sm:col-span-2"
                />
                <ReadOnlyField label="Postcode" value={profile?.postcode} />
                <ReadOnlyField label="City / Town" value={profile?.city} />
                <ReadOnlyField
                  label="Country"
                  value={profile?.country}
                  className="sm:col-span-2"
                />
              </div>
              <p className="mt-3 rounded-xl border border-white/10 bg-ink-950/60 px-3 py-2 text-[11px] leading-relaxed text-slate-500">
                Name, contact details and location are owned by Central Hub. When
                you save them there, Groups &amp; Circles updates automatically.
              </p>
            </CardBody>
          </Card>

          <Card className="border border-white/10 bg-ink-900/60">
            <CardBody className="p-5">
              <div>
                <CardTitle className="flex items-center gap-2 text-sm font-bold text-white">
                  <MapPin className="size-4 text-gold-400" /> Community Location
                </CardTitle>
                <p className="mt-1 text-xs text-slate-400">
                  Your location determines which local groups and meetups we can
                  recommend.
                </p>
              </div>

              <div className="mt-4 flex flex-col gap-4">
                <div className="rounded-xl border border-white/10 bg-ink-950/60 p-3">
                  <p className="text-[10px] font-semibold uppercase text-slate-400">
                    Current location
                  </p>
                  <p className="mt-1 flex items-center gap-2 text-xs font-semibold text-white">
                    <MapPin className="size-4 shrink-0 text-gold-400" />
                    {profile?.city || "Not set"}
                    {profile?.postcode ? (
                      <span className="font-normal text-slate-400">
                        · {profile.postcode}
                      </span>
                    ) : null}
                  </p>
                </div>
                <a
                  href={mcomProfileUrl()}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 py-2.5 text-xs font-semibold text-slate-300 transition-colors hover:border-gold-500/30 hover:bg-gold-500/10 hover:text-gold-300"
                >
                  <ExternalLink className="size-4" /> Update location in Central Hub
                </a>
              </div>
            </CardBody>
          </Card>

          <Card className="border border-white/10 bg-ink-900/60">
            <CardBody className="p-5">
              <CardTitle className="flex items-center gap-2 text-sm font-bold text-white">
                <Shield className="size-4 text-gold-400" /> Privacy &amp; Group Discovery
              </CardTitle>

              <div className="mt-4 flex flex-col gap-3">
                <label className="flex items-center justify-between rounded-xl border border-white/5 bg-white/[0.02] p-3">
                  <div className="flex flex-col">
                    <span className="text-xs font-semibold text-white">
                      Local Group Discovery
                    </span>
                    <span className="text-[11px] text-slate-400">
                      Allow local organizers to recommend relevant community groups.
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={localDiscovery}
                    onChange={(e) =>
                      void updatePreference("localDiscovery", e.target.checked)
                    }
                    className="size-4 accent-gold-500"
                  />
                </label>

                <label className="flex items-center justify-between rounded-xl border border-white/5 bg-white/[0.02] p-3">
                  <div className="flex flex-col">
                    <span className="text-xs font-semibold text-white">
                      Profile Visible in Groups
                    </span>
                    <span className="text-[11px] text-slate-400">
                      Show your display name and location avatar in joined group
                      member lists.
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={profileVisible}
                    onChange={(e) =>
                      void updatePreference("profileVisible", e.target.checked)
                    }
                    className="size-4 accent-gold-500"
                  />
                </label>
              </div>
            </CardBody>
          </Card>
        </div>

        <div className="flex flex-col gap-5">
          <Card className="border border-white/10 bg-ink-900/60">
            <CardBody className="p-5">
              <CardTitle className="flex items-center gap-2 text-sm font-bold text-white">
                <Bell className="size-4 text-gold-400" /> Notifications
              </CardTitle>

              <div className="mt-3 flex flex-col gap-3">
                <label className="flex items-center justify-between rounded-xl border border-white/5 bg-white/[0.02] p-3">
                  <div className="flex flex-col">
                    <span className="text-xs font-semibold text-white">
                      Email Updates
                    </span>
                    <span className="text-[10px] text-slate-400">
                      Invitations &amp; event reminders
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={emailUpdates}
                    onChange={(e) =>
                      void updatePreference("emailUpdates", e.target.checked)
                    }
                    className="size-4 accent-gold-500"
                  />
                </label>
              </div>
            </CardBody>
          </Card>

          <Card className="border border-white/10 bg-ink-900/60">
            <CardBody className="flex flex-col gap-3 p-5">
              <CardTitle className="text-sm font-bold text-white">
                Account Actions
              </CardTitle>
              <button
                type="button"
                onClick={() => void handleSignOut()}
                className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 py-2.5 text-xs font-semibold text-slate-300 transition-colors hover:border-rose-500/30 hover:bg-rose-500/10 hover:text-rose-300"
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

function ReadOnlyField({
  label,
  value,
  className = "",
}: {
  label: string;
  value?: string | null;
  className?: string;
}) {
  return (
    <label className={`flex flex-col gap-1 text-xs text-slate-300 ${className}`}>
      <span>{label}</span>
      <input
        type="text"
        value={value ?? ""}
        readOnly
        placeholder="Not set in Central Hub"
        className="cursor-not-allowed rounded-xl border border-white/10 bg-ink-950 px-3 py-2 text-xs text-slate-300 opacity-80 outline-none placeholder-slate-500"
      />
    </label>
  );
}
