import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, Clock, Plus, QrCode, ScanLine, UserPlus, Users } from "lucide-react";
import Badge from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import Card, { CardBody, CardTitle } from "../../components/ui/Card";
import CollapsibleCard from "../../components/ui/CollapsibleCard";
import LinkButton from "../../components/ui/LinkButton";
import SectionHeader from "../../components/ui/SectionHeader";
import StatCard from "../../components/ui/StatCard";
import { LISTS } from "../../data/mockData";
import { resolveContactsOfList } from "../../data/contactHelpers";
import { useNetworkContacts } from "../../store/selectors";
import AddContactFlow from "./AddContactFlow";

const SOURCE_ICON: Record<string, typeof QrCode> = {
  "Manual Contacts": Users,
  "QR Plaque Scans": QrCode,
  "Affiliate Signups": ScanLine,
  "Traffic & Leads Directory": ArrowRight,
};

export default function MyNetworkListsPage() {
  const navigate = useNavigate();
  const networkContacts = useNetworkContacts();
  const [addFlowOpen, setAddFlowOpen] = useState(false);

  const totalContacts =
    LISTS.reduce((sum, list) => sum + list.contactIds.length, 0) + networkContacts.length;
  const b2b = LISTS.filter((list) => list.type === "B2B").length;
  const b2c = LISTS.filter((list) => list.type === "B2C").length;
  const sources = [...new Set(LISTS.map((list) => list.source))];
  const pendingTotal = networkContacts.filter((contact) => contact.confirmation === "pending").length;

  return (
    <div className="flex flex-col gap-4">
      <SectionHeader
        title="My Network — Lists"
        subtitle="The intake layer beneath every circle: B2B and B2C lists captured from manual contacts, QR plaque scans, affiliate signups and the Traffic & Leads Directory."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button size="sm" onClick={() => setAddFlowOpen(true)}>
              <UserPlus className="size-4" /> Add Contact
            </Button>
            <LinkButton to="/business/circles/create" size="sm">
              <Plus className="size-4" /> Create circle
            </LinkButton>
          </div>
        }
      />

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <StatCard
          label="Lists"
          value={LISTS.length.toLocaleString("en-GB")}
          hint="Available to build circles from"
          accent="gold"
        />
        <StatCard
          label="Contacts"
          value={totalContacts.toLocaleString("en-GB")}
          hint={pendingTotal > 0 ? `Across every list · ${pendingTotal} pending` : "Across every list"}
          accent="info"
        />
        <StatCard
          label="B2B / B2C"
          value={`${b2b} / ${b2c}`}
          hint="List types in the demo store"
          accent="success"
        />
        <StatCard
          label="Intake sources"
          value={sources.length.toLocaleString("en-GB")}
          hint="How contacts arrived"
          accent="warning"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2" data-tour="lists">
        {LISTS.map((list) => {
          const contacts = resolveContactsOfList(list, networkContacts);
          const pendingCount = contacts.filter((contact) => contact.pending).length;
          const Icon = SOURCE_ICON[list.source] ?? Users;

          return (
            <CollapsibleCard
              key={list.id}
              title={list.name}
              defaultOpen={false}
              action={
                <>
                  <Badge variant="muted">{contacts.length} contacts</Badge>
                  <Badge variant={list.type === "B2B" ? "gold" : "info"}>{list.type}</Badge>
                </>
              }
              bodyClassName="flex flex-col gap-3"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-[11px] text-slate-500">
                  {list.geography} · {list.status}
                </p>
                {pendingCount > 0 && (
                  <Badge variant="warning">
                    {pendingCount} pending
                  </Badge>
                )}
              </div>

              <p className="flex items-center gap-2 rounded-xl border border-white/10 bg-ink-950/60 px-3 py-2.5 text-[11px] text-slate-400">
                <Icon className="size-3.5 shrink-0 text-gold-400" />
                Intake source: <span className="font-semibold text-white">{list.source}</span>
              </p>

              <div className="flex flex-wrap gap-1.5">
                {contacts.slice(0, 6).map((contact) => (
                  <span
                    key={contact.member.id}
                    title={
                      contact.pending
                        ? "Pending — waiting for their email confirmation"
                        : contact.email
                    }
                    className={`inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-[11px] ${
                      contact.pending
                        ? "border-gold-500/40 bg-gold-500/10 text-gold-200"
                        : "border-white/10 bg-ink-950/60 text-slate-300"
                    }`}
                  >
                    {contact.pending && <Clock className="size-3 shrink-0" />}
                    {contact.member.businessName}
                  </span>
                ))}
                {contacts.length > 6 && (
                  <span className="rounded-lg border border-white/10 bg-ink-950/60 px-2 py-1 text-[11px] text-slate-500">
                    +{contacts.length - 6} more
                  </span>
                )}
              </div>

              <div className="mt-auto flex flex-wrap items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => navigate(`/business/circles/create?list=${list.id}`)}
                  className="inline-flex h-10 cursor-pointer items-center gap-1.5 rounded-lg bg-gold-500 px-3 text-xs font-semibold text-ink-950 transition-colors hover:bg-gold-400"
                >
                  <Plus className="size-3.5" /> Build a circle from this list
                </button>
                <Link
                  to="/business/circles"
                  className="inline-flex items-center gap-1 text-xs font-medium text-gold-300 hover:text-gold-200"
                >
                  Open circles <ArrowRight className="size-3.5" />
                </Link>
              </div>
            </CollapsibleCard>
          );
        })}
      </div>

      <Card data-tour="note">
        <CardBody className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle>How lists, circles and groups relate</CardTitle>
          </div>
          <ul className="flex flex-col gap-2 text-xs leading-relaxed text-slate-400">
            <li className="rounded-xl border border-white/10 bg-ink-950/60 px-3 py-2.5">
              A <span className="font-semibold text-white">list</span> is intake: raw contacts
              captured from one source, with a type (B2B/B2C) and geography.
            </li>
            <li className="rounded-xl border border-white/10 bg-ink-950/60 px-3 py-2.5">
              A <span className="font-semibold text-white">circle</span> is built from one or more
              lists and given a type, duration and interaction level — it is where members work.
            </li>
            <li className="rounded-xl border border-white/10 bg-ink-950/60 px-3 py-2.5">
              A <span className="font-semibold text-white">group</span> is the group-building
              concept: membership, stages and thresholds. Lists never create groups.
            </li>
          </ul>
        </CardBody>
      </Card>

      <AddContactFlow open={addFlowOpen} onClose={() => setAddFlowOpen(false)} />
    </div>
  );
}
