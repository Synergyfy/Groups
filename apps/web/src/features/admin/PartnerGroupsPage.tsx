import { Link } from "react-router-dom";
import { ArrowRight, Handshake, TriangleAlert } from "lucide-react";
import Badge from "../../components/ui/Badge";
import Card, { CardBody, CardTitle } from "../../components/ui/Card";
import SectionHeader from "../../components/ui/SectionHeader";
import StatCard from "../../components/ui/StatCard";
import TipIcon from "../../components/ui/TipIcon";
import { PROGRAMMES } from "../../data/businessData";
import { useAppState } from "../../store/selectors";
import { memberCountOf } from "../groups/groupUtils";

export default function PartnerGroupsPage() {
  const state = useAppState();
  const partnerGroups = state.groups.filter((group) => group.type === "Partner");
  const programme = PROGRAMMES.find((entry) => entry.id === "prog-partner");
  const members = partnerGroups.reduce((sum, group) => sum + memberCountOf(group), 0);

  return (
    <div className="flex flex-col gap-4">
      <SectionHeader
        title="Partner Groups"
        back="/admin/groups"
        tip="Everything here is a read-only report — there is nothing on this screen to configure or save."
        subtitle="Partner membership structures across the network. The financial rules behind partnerships are a placeholder in this prototype — the structure is shown, the money is not."
      />

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <StatCard
          label="Partner groups"
          value={partnerGroups.length.toLocaleString("en-GB")}
          hint="Type: Partner"
          accent="gold"
        />
        <StatCard
          label="Members"
          value={members.toLocaleString("en-GB")}
          hint="Across partner groups"
          accent="info"
        />
        <StatCard
          label="Programme"
          value={programme?.tier ?? "—"}
          hint={programme?.name ?? "No programme"}
          accent="success"
        />
        <StatCard
          label="Financial rules"
          value="Placeholder"
          hint="Not confirmed in the specification"
          accent="warning"
        />
      </div>

      <Card data-tour="notice">
        <CardBody className="flex flex-col gap-3">
          <div className="flex items-start gap-3">
            <TriangleAlert className="mt-0.5 size-5 shrink-0 text-warning-400" />
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-1.5">
                <p className="text-sm font-semibold text-white">
                  Financial rules are out of scope for this prototype
                </p>
                <TipIcon text="Partner groups themselves work normally — only the fee and revenue-share figures are missing." />
              </div>
              <p className="text-xs leading-relaxed text-slate-400">
                Doc B §10.6 marks the partner financial rules as a placeholder. This screen therefore
                shows only what the specification confirms: which partner groups exist, who owns
                them, how big they are, and which membership programme they belong to. No fee,
                revenue-share or settlement logic is simulated, and nothing here implies that a
                payment has happened.
              </p>
            </div>
          </div>
        </CardBody>
      </Card>

      <div className="grid gap-4 lg:grid-cols-3" data-tour="list">
        <Card className="lg:col-span-2">
          <CardBody className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                <CardTitle>Partner groups</CardTitle>
                <TipIcon text="Only groups of type Partner appear here — select one to open it in the register." />
              </div>
            </div>
            {partnerGroups.length === 0 ? (
              <p className="text-xs text-slate-400">
                No group of type Partner exists in the demo store yet.
              </p>
            ) : (
              <ul className="flex flex-col gap-2">
                {partnerGroups.map((group) => (
                  <li key={group.id}>
                    <Link
                      to={`/admin/groups/${group.id}`}
                      className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-ink-950/60 px-3 py-2.5 text-xs transition-colors hover:border-gold-500/40"
                    >
                      <span className="min-w-0">
                        <span className="block truncate font-semibold text-white">{group.name}</span>
                        <span className="text-[11px] text-slate-500">
                          Owner {group.ownerName} · {memberCountOf(group)} members ·{" "}
                          {group.location?.city ?? "No location"}
                        </span>
                      </span>
                      <Badge variant="gold">Partner</Badge>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>

        <Card data-tour="programme">
          <CardBody className="flex flex-col gap-3">
            <div className="flex items-center gap-1.5">
              <CardTitle>Partner membership programme</CardTitle>
              <TipIcon text="Every partner group points to this one programme — it is not copied per group." />
            </div>
            <div className="flex items-center gap-2">
              <Handshake className="size-5 text-gold-400" />
              <span className="text-sm font-semibold text-white">
                {programme?.name ?? "Not configured"}
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge variant="info">{programme?.tier ?? "—"}</Badge>
              <Badge variant="success">{programme?.status ?? "—"}</Badge>
            </div>
            <p className="text-[11px] leading-relaxed text-slate-500">
              A programme is a membership relationship — it is not a group, not a campaign and not a
              payment. Groups reference it by id, which is why the register can filter by
              programme.
            </p>
            <div className="mt-auto flex items-center gap-1.5">
              <Link
                to="/admin/groups/all"
                className="inline-flex items-center gap-1 text-xs font-medium text-gold-300 hover:text-gold-200"
              >
                Filter the register by programme <ArrowRight className="size-3.5" />
              </Link>
              <TipIcon text="Opens the full register — use the programme filter in the filter bar there." />
            </div>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
