import { Link } from "react-router-dom";
import { ArrowRight, CirclePlus, TriangleAlert } from "lucide-react";
import Badge from "../../components/ui/Badge";
import Card, { CardBody, CardTitle } from "../../components/ui/Card";
import SectionHeader from "../../components/ui/SectionHeader";
import StatCard from "../../components/ui/StatCard";
import TipIcon from "../../components/ui/TipIcon";
import { useAppState } from "../../store/selectors";

export default function MandatoryCirclesPage() {
  const state = useAppState();
  const circles = state.circles;

  const visibilityCounts = circles.reduce<Record<string, number>>((counts, circle) => {
    counts[circle.config.visibility] = (counts[circle.config.visibility] ?? 0) + 1;
    return counts;
  }, {});

  return (
    <div className="flex flex-col gap-4">
      <SectionHeader
        title="Mandatory Circles"
        back="/admin/groups"
        tip="Nothing here can be changed — this screen is a report until the rules are confirmed."
        subtitle="The required circle structure at a glance: which circles exist in the demo store, how they are configured, and what still needs to be confirmed by the specification."
      />

      <Card data-tour="notice">
        <CardBody className="flex flex-col gap-3">
          <div className="flex items-start gap-3">
            <TriangleAlert className="mt-0.5 size-5 shrink-0 text-warning-400" />
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-1.5">
                <p className="text-sm font-semibold text-white">Rules to confirm</p>
                <TipIcon text="Nothing here is enforced yet — no circle is required, blocked or created by these rules." />
              </div>
              <p className="text-xs leading-relaxed text-slate-400">
                Which circles are mandatory, who must belong to them and how they are enforced are
                marked as "rules to confirm" in Doc B §10.6. This screen therefore reports the
                structure that exists — it does not enforce anything, and it never pretends a rule
                has been agreed when it has not.
              </p>
            </div>
          </div>
        </CardBody>
      </Card>

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <StatCard
          label="Circles configured"
          value={circles.length.toLocaleString("en-GB")}
          hint="From the demo store"
          accent="gold"
        />
        <StatCard
          label="Private circles"
          value={(visibilityCounts.private ?? 0).toLocaleString("en-GB")}
          hint="Owner-only visibility"
          accent="info"
        />
        <StatCard
          label="Invite only"
          value={(visibilityCounts["invite only"] ?? 0).toLocaleString("en-GB")}
          hint="Members added by invitation"
          accent="success"
        />
        <StatCard
          label="Active circle"
          value={state.activeCircleId ? "Set" : "None"}
          hint="The circle currently open in the workspace"
          accent="warning"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2" data-tour="circles">
        {circles.length === 0 ? (
          <Card>
            <CardBody>
              <p className="text-xs text-slate-400">No circles are configured in the demo store.</p>
            </CardBody>
          </Card>
        ) : (
          circles.map((circle) => (
            <Card key={circle.id}>
              <CardBody className="flex flex-col gap-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <CardTitle>{circle.config.name}</CardTitle>
                    <TipIcon text="Report only — the values come from the circle's configuration and cannot be edited here." />
                  </div>
                  <Badge variant={circle.id === state.activeCircleId ? "gold" : "muted"}>
                    {circle.id === state.activeCircleId ? "Active" : circle.type}
                  </Badge>
                </div>
                <p className="text-xs leading-relaxed text-slate-400">{circle.config.description}</p>
                <dl className="grid gap-2 text-xs sm:grid-cols-2">
                  <div className="flex items-center justify-between gap-2 rounded-xl border border-white/10 bg-ink-950/60 px-3 py-2.5">
                    <dt className="text-slate-400">Duration</dt>
                    <dd className="font-semibold text-white">{circle.config.duration} days</dd>
                  </div>
                  <div className="flex items-center justify-between gap-2 rounded-xl border border-white/10 bg-ink-950/60 px-3 py-2.5">
                    <dt className="text-slate-400">Visibility</dt>
                    <dd className="font-semibold capitalize text-white">
                      {circle.config.visibility}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between gap-2 rounded-xl border border-white/10 bg-ink-950/60 px-3 py-2.5">
                    <dt className="flex items-center gap-1.5 text-slate-400">
                      Interaction
                      <TipIcon text="How members may act inside the circle: read only, post messages, or collaborate." />
                    </dt>
                    <dd className="font-semibold capitalize text-white">
                      {circle.config.interactionLevel}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between gap-2 rounded-xl border border-white/10 bg-ink-950/60 px-3 py-2.5">
                    <dt className="text-slate-400">Members</dt>
                    <dd className="font-semibold text-white">{circle.memberIds.length}</dd>
                  </div>
                </dl>
              </CardBody>
            </Card>
          ))
        )}

        <Card data-tour="note">
          <CardBody className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <CardTitle>Structure notes</CardTitle>
            </div>
            <ul className="flex flex-col gap-2 text-xs leading-relaxed text-slate-400">
              <li className="rounded-xl border border-white/10 bg-ink-950/60 px-3 py-2.5">
                A circle is its own concept: it has duration, visibility and interaction level, none
                of which belong to a group.
              </li>
              <li className="rounded-xl border border-white/10 bg-ink-950/60 px-3 py-2.5">
                Membership of a circle never grants membership of a group, and vice versa.
              </li>
              <li className="rounded-xl border border-white/10 bg-ink-950/60 px-3 py-2.5">
                The workspace below is where circle members actually work — configuration here only
                describes the structure.
              </li>
            </ul>
            <Link
              to="/business/circles"
              className="mt-auto inline-flex items-center gap-1 text-xs font-medium text-gold-300 hover:text-gold-200"
            >
              Open the circle workspace <ArrowRight className="size-3.5" />
            </Link>
          </CardBody>
        </Card>
      </div>

      <p className="flex items-center gap-2 text-[11px] text-slate-500">
        <CirclePlus className="size-3.5 text-gold-400" />
        New circles are created from the workspace, not from this overview — this screen stays a
        read-only report until the mandatory rules are confirmed.
      </p>
    </div>
  );
}
