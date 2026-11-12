import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, PlayCircle, Users, MapPin, Layers, Shield, Zap, Globe } from "lucide-react";

const YOUTUBE_EMBED_URL = "https://www.youtube.com/embed/dQw4w9WgXcQ";

export default function LandingPage() {
  useEffect(() => {
    document.title = "Groups & Circles | Central Hub Solution";
  }, []);
  const [videoLoaded, setVideoLoaded] = useState(false);

  return (
    <div className="bg-ink-950 text-white">
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-white/10">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-gold-500/[0.06] via-transparent to-transparent" />
        <div className="mx-auto max-w-6xl px-4 pt-8 pb-10 sm:px-6 sm:pt-14 sm:pb-16">
          <div className="mx-auto max-w-3xl text-center">
            <h1 className="text-2xl font-bold leading-snug tracking-tight sm:text-4xl lg:text-5xl">
              Build stronger <span className="text-gold-400">business networks</span> with Groups &amp; Circles
            </h1>
            <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-slate-400 sm:mt-4 sm:text-base">
              Connect with like-minded businesses, join industry-specific groups, and grow through
              collaboration — all in one place.
            </p>

            {/* Video */}
            <div className="mx-auto mt-6 max-w-2xl sm:mt-8">
              <div className="relative aspect-video w-full overflow-hidden rounded-xl border border-white/10 bg-ink-900 shadow-xl shadow-black/40">
                {!videoLoaded ? (
                  <button
                    type="button"
                    onClick={() => setVideoLoaded(true)}
                    className="group absolute inset-0 flex cursor-pointer flex-col items-center justify-center gap-3 bg-gradient-to-br from-ink-900 to-ink-950 transition-colors hover:from-ink-800 hover:to-ink-900"
                    aria-label="Play introduction video"
                  >
                    <div className="flex size-14 items-center justify-center rounded-full bg-gold-500/20 transition-all group-hover:scale-110 group-hover:bg-gold-500/30 sm:size-16">
                      <PlayCircle className="size-10 text-gold-400 transition-colors group-hover:text-gold-300 sm:size-12" />
                    </div>
                    <div className="text-center">
                      <p className="text-xs font-semibold text-white sm:text-sm">Watch how it works</p>
                      <p className="mt-0.5 text-[11px] text-slate-500">Video coming soon</p>
                    </div>
                  </button>
                ) : (
                  <iframe
                    src={YOUTUBE_EMBED_URL}
                    title="Groups & Circles — Introduction"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    className="absolute inset-0 h-full w-full"
                  />
                )}
                <div className="pointer-events-none absolute bottom-2 left-2 rounded-md bg-black/60 px-2 py-0.5 text-[10px] font-medium text-slate-400 backdrop-blur sm:bottom-3 sm:left-3 sm:text-[11px]">
                  Placeholder — replace with your video URL
                </div>
              </div>
            </div>

            <div className="mt-6 flex flex-wrap items-center justify-center gap-3 sm:mt-8 sm:gap-4">
              <Link
                to="/get-started"
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-gold-500 px-6 text-sm font-semibold text-ink-950 shadow-lg shadow-gold-500/20 transition-colors hover:bg-gold-400"
              >
                Get Started <ArrowRight className="size-4" />
              </Link>
              <Link
                to="/sign-in"
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/5 px-6 text-sm font-semibold text-white transition-colors hover:border-gold-500/40 hover:bg-gold-500/10"
              >
                Sign In
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="border-b border-white/10">
        <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-16">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-xl font-bold sm:text-2xl">What is Groups &amp; Circles?</h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-400 sm:mt-3 sm:text-base">
              A networking platform that brings businesses together through structured groups —
              organised by industry, location, and shared goals.
            </p>
          </div>

          <div className="mt-8 grid grid-cols-2 gap-3 sm:mt-12 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3">
            <InfoCard
              icon={<Users className="size-4 sm:size-5" />}
              title="Join Groups"
              text="Discover groups that match your business — from marketing to B2B networking."
            />
            <InfoCard
              icon={<MapPin className="size-4 sm:size-5" />}
              title="Location-based"
              text="Organised by National Community, City, and Local Area so you connect nearby."
            />
            <InfoCard
              icon={<Layers className="size-4 sm:size-5" />}
              title="Circles workspace"
              text="Dedicated collaboration spaces for campaigns, events, and team projects."
            />
            <InfoCard
              icon={<Shield className="size-4 sm:size-5" />}
              title="Managed access"
              text="Open, invitation-only, or request-based — owners control who joins."
            />
            <InfoCard
              icon={<Zap className="size-4 sm:size-5" />}
              title="Automatic grouping"
              text="The system forms groups based on your profile so you never miss a connection."
            />
            <InfoCard
              icon={<Globe className="size-4 sm:size-5" />}
              title="One platform"
              text="Groups, circles, invitations, campaigns, and rewards — all in one place."
            />
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="border-b border-white/10">
        <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-16">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-xl font-bold sm:text-2xl">How it works</h2>
            <p className="mt-2 text-sm text-slate-400">Four simple steps to start networking.</p>
          </div>

          <ol className="mx-auto mt-8 grid max-w-4xl grid-cols-2 gap-3 sm:mt-12 sm:grid-cols-2 sm:gap-6 lg:grid-cols-4">
            {[
              { step: "01", title: "Create account", text: "Sign up with your business details through CHS authentication." },
              { step: "02", title: "Explore groups", text: "Browse by type, city, or industry — or let the system find matches." },
              { step: "03", title: "Join & connect", text: "Request to join or accept invitations. Start engaging." },
              { step: "04", title: "Collaborate", text: "Use Circles, campaigns, and activities to grow opportunities." },
            ].map((item) => (
              <li key={item.step} className="rounded-xl border border-white/10 bg-ink-900/60 p-4 sm:rounded-2xl sm:p-6">
                <span className="text-[11px] font-bold text-gold-400 sm:text-xs">{item.step}</span>
                <h3 className="mt-2 text-xs font-semibold text-white sm:mt-3 sm:text-sm">{item.title}</h3>
                <p className="mt-1.5 text-[11px] leading-relaxed text-slate-400 sm:mt-2 sm:text-xs">{item.text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Group types */}
      <section className="border-b border-white/10">
        <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-16">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-xl font-bold sm:text-2xl">Group types</h2>
            <p className="mt-2 text-sm text-slate-400">
              Categorised so you can find exactly the right network.
            </p>
          </div>

          <div className="mt-6 flex flex-wrap justify-center gap-2 sm:mt-10 sm:gap-3">
            {["Marketing", "Advertising", "Partner", "B2B", "Affiliate", "Event / Expo", "Other"].map(
              (type) => (
                <span
                  key={type}
                  className="rounded-lg border border-white/10 bg-ink-900/60 px-3.5 py-2 text-xs font-medium text-slate-300 transition-colors hover:border-gold-500/30 hover:text-white sm:rounded-xl sm:px-5 sm:py-3 sm:text-sm"
                >
                  {type}
                </span>
              )
            )}
          </div>
          <p className="mx-auto mt-4 max-w-md text-center text-[11px] text-slate-500 sm:mt-6 sm:text-xs">
            Group types are configurable by administrators.
          </p>
        </div>
      </section>

      {/* FAQ */}
      <section className="border-b border-white/10">
        <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6 sm:py-16">
          <h2 className="text-center text-xl font-bold sm:text-2xl">Frequently asked questions</h2>

          <div className="mt-6 flex flex-col gap-2 sm:mt-10 sm:gap-3">
            {[
              {
                q: "What is a group?",
                a: "A group is a community of businesses with shared interests, industry, or location. Groups can be open, invitation-only, or require approval.",
              },
              {
                q: "How do I join a group?",
                a: "Browse Explore Groups to find matches. Click 'Join' for open groups or 'Request to join' for approval-based groups.",
              },
              {
                q: "What are Circles?",
                a: "Circles are focused collaboration workspaces with their own duration, visibility, and interaction settings.",
              },
              {
                q: "Is there a cost to join?",
                a: "Basic membership is free. Some groups may have voluntary contributions — always shown before you join.",
              },
              {
                q: "Who can see my activity?",
                a: "Activity is visible to group members only. Your profile shows group membership, not internal activity.",
              },
            ].map((item) => (
              <details
                key={item.q}
                className="group rounded-lg border border-white/10 bg-ink-900/60 px-4 py-3 transition-colors hover:border-white/20 sm:rounded-xl sm:px-5 sm:py-4"
              >
                <summary className="cursor-pointer list-none text-xs font-semibold text-white sm:text-sm [&::-webkit-details-marker]:hidden">
                  <span className="flex items-center justify-between gap-3">
                    {item.q}
                    <span className="text-gold-400 transition-transform group-open:rotate-45">+</span>
                  </span>
                </summary>
                <p className="mt-2 text-[11px] leading-relaxed text-slate-400 sm:mt-3 sm:text-xs">{item.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section>
        <div className="mx-auto max-w-2xl px-4 py-10 text-center sm:px-6 sm:py-16">
          <h2 className="text-xl font-bold sm:text-2xl">Ready to get started?</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-slate-400 sm:mt-3">
            Create your account or sign in to access your dashboard.
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3 sm:mt-8 sm:gap-4">
            <Link
              to="/get-started"
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-gold-500 px-6 text-sm font-semibold text-ink-950 shadow-lg shadow-gold-500/20 transition-colors hover:bg-gold-400"
            >
              Get Started <ArrowRight className="size-4" />
            </Link>
            <Link
              to="/sign-in"
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/5 px-6 text-sm font-semibold text-white transition-colors hover:border-gold-500/40 hover:bg-gold-500/10"
            >
              Sign In
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10">
        <div className="mx-auto flex max-w-6xl items-center justify-center px-4 py-5 sm:px-6 sm:py-6">
          <p className="text-[11px] text-slate-500 sm:text-xs">
            &copy; {new Date().getFullYear()} Central Hub Solution. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}

function InfoCard({
  icon,
  title,
  text,
}: {
  icon: React.ReactNode;
  title: string;
  text: string;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-ink-900/60 p-3.5 transition-colors hover:border-gold-500/20 sm:rounded-2xl sm:p-5 lg:p-6">
      <div className="mb-2.5 inline-flex size-8 items-center justify-center rounded-lg bg-gold-500/10 text-gold-400 sm:mb-4 sm:size-10 sm:rounded-xl">
        {icon}
      </div>
      <h3 className="text-xs font-semibold text-white sm:text-sm">{title}</h3>
      <p className="mt-1 text-[11px] leading-relaxed text-slate-400 sm:mt-2 sm:text-xs">{text}</p>
    </div>
  );
}
