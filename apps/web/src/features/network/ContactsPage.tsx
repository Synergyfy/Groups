import { useMemo, useState } from "react";
import {
  CheckCircle2,
  Clock,
  Layers,
  Plus,
  Search,
  UserPlus,
  XCircle,
} from "lucide-react";
import Badge from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import Card, { CardBody } from "../../components/ui/Card";
import EmptyState from "../../components/ui/EmptyState";
import Modal from "../../components/ui/Modal";
import SectionHeader from "../../components/ui/SectionHeader";
import StatCard from "../../components/ui/StatCard";
import Toast from "../../components/ui/Toast";
import { errorMessage } from "../../app/api";
import { businessApi, useBusinessData } from "../../business/BusinessDataProvider";
import type { NetworkContact } from "../../domain/types";
import AddContactFlow from "./AddContactFlow";

const STATUS_BADGE: Record<
  string,
  { label: string; variant: "success" | "warning" | "muted" | "danger" }
> = {
  confirmed: { label: "Active", variant: "success" },
  pending: { label: "Pending", variant: "warning" },
  inactive: { label: "Inactive", variant: "muted" },
  declined: { label: "Declined", variant: "danger" },
};

export default function ContactsPage() {
  const { contacts, networkLists, refresh } = useBusinessData();
  const lists = useMemo(() => networkLists?.items ?? [], [networkLists]);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [listFilter, setListFilter] = useState("all");
  const [addOpen, setAddOpen] = useState(false);

  const [assignTarget, setAssignTarget] = useState<NetworkContact | null>(null);
  const [selectedListIds, setSelectedListIds] = useState<string[]>([]);
  const [savingLists, setSavingLists] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const listById = useMemo(
    () => new Map(lists.map((l) => [l.id, l])),
    [lists],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return contacts.filter((c) => {
      if (statusFilter !== "all" && c.confirmation !== statusFilter) return false;
      const memberLists = c.listIds ?? [c.listId];
      if (listFilter !== "all" && !memberLists.includes(listFilter)) return false;
      if (q) {
        const hay = `${c.fullName} ${c.email ?? ""} ${c.phone ?? ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [contacts, search, statusFilter, listFilter]);

  const activeCount = contacts.filter((c) => c.confirmation === "confirmed").length;
  const pendingCount = contacts.filter((c) => c.confirmation === "pending").length;

  const openAssignLists = (contact: NetworkContact) => {
    setAssignTarget(contact);
    setSelectedListIds(contact.listIds?.length ? contact.listIds : [contact.listId]);
  };

  const toggleListId = (listId: string) => {
    setSelectedListIds((curr) =>
      curr.includes(listId) ? curr.filter((id) => id !== listId) : [...curr, listId],
    );
  };

  const saveAssignedLists = async () => {
    if (!assignTarget || selectedListIds.length === 0 || savingLists) return;
    setSavingLists(true);
    try {
      await businessApi.assignContactLists(assignTarget.id, selectedListIds);
      await refresh();
      setFeedback(`Updated network lists for ${assignTarget.fullName}.`);
      setAssignTarget(null);
    } catch (cause) {
      setFeedback(errorMessage(cause));
    } finally {
      setSavingLists(false);
    }
  };

  return (
    <div className="flex flex-col gap-5">
      <SectionHeader
        title="Contacts"
        subtitle="Individual people and businesses in your network. Pending contacts never block Circle or Group creation."
        actions={
          <Button size="sm" onClick={() => setAddOpen(true)}>
            <UserPlus className="size-4" /> Add Contact
          </Button>
        }
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard label="Total Contacts" value={contacts.length} />
        <StatCard
          label="Active"
          value={activeCount}
          icon={<CheckCircle2 className="size-4 text-success-400" />}
        />
        <StatCard
          label="Pending"
          value={pendingCount}
          icon={<Clock className="size-4 text-warning-400" />}
        />
      </div>

      <Card>
        <CardBody className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative min-w-[200px] flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-slate-500" />
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search contacts by name, email or phone…"
                className="h-9 w-full rounded-lg border border-white/10 bg-ink-800 pl-8 pr-3 text-xs text-slate-200 placeholder:text-slate-500 focus:border-gold-500/50 focus:outline-none"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-9 rounded-lg border border-white/10 bg-ink-800 px-3 text-xs text-slate-200 focus:border-gold-500/50 focus:outline-none"
            >
              <option value="all">All statuses</option>
              <option value="confirmed">Active</option>
              <option value="pending">Pending</option>
              <option value="inactive">Inactive</option>
              <option value="declined">Declined</option>
            </select>

            <select
              value={listFilter}
              onChange={(e) => setListFilter(e.target.value)}
              className="h-9 rounded-lg border border-white/10 bg-ink-800 px-3 text-xs text-slate-200 focus:border-gold-500/50 focus:outline-none"
            >
              <option value="all">All Network Lists</option>
              {lists.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name} ({l.type})
                </option>
              ))}
            </select>
          </div>

          {filtered.length === 0 ? (
            <EmptyState
              title="No contacts match"
              description="Add a contact or adjust your filters. Contacts can belong to multiple Network Lists."
              icon={<XCircle className="size-6" />}
              action={
                <Button size="sm" onClick={() => setAddOpen(true)}>
                  <Plus className="size-4" /> Add Contact
                </Button>
              }
            />
          ) : (
            <ul className="divide-y divide-white/10">
              {filtered.map((contact) => {
                const badge =
                  STATUS_BADGE[contact.confirmation] ?? STATUS_BADGE.pending;
                const memberListIds = contact.listIds?.length
                  ? contact.listIds
                  : [contact.listId];
                return (
                  <li
                    key={contact.id}
                    className="flex flex-wrap items-center justify-between gap-3 py-3"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-xs font-semibold text-white">
                          {contact.fullName}
                        </p>
                        <Badge variant={badge.variant}>{badge.label}</Badge>
                      </div>
                      <p className="mt-0.5 text-[11px] text-slate-400">
                        {[contact.email, contact.phone].filter(Boolean).join(" · ") ||
                          "No email/phone"}
                      </p>
                      <div className="mt-1.5 flex flex-wrap gap-1.5">
                        {memberListIds.map((lid) => {
                          const list = listById.get(lid);
                          return (
                            <span
                              key={lid}
                              className="inline-flex items-center gap-1 rounded-md border border-white/10 bg-ink-950/60 px-2 py-0.5 text-[10px] text-slate-300"
                            >
                              {list?.name ?? "Network List"}
                            </span>
                          );
                        })}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openAssignLists(contact)}
                      >
                        <Layers className="size-3.5" /> Network Lists
                      </Button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </CardBody>
      </Card>

      {addOpen && (
        <AddContactFlow
          open={addOpen}
          onClose={() => setAddOpen(false)}
        />
      )}

      <Modal
        open={Boolean(assignTarget)}
        title={`Network Lists for ${assignTarget?.fullName ?? ""}`}
        onClose={() => setAssignTarget(null)}
        footer={
          <>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setAssignTarget(null)}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={selectedListIds.length === 0 || savingLists}
              onClick={() => void saveAssignedLists()}
            >
              Save Lists
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-2">
          <p className="text-xs text-slate-400">
            Select all Network Lists this contact should belong to. One contact
            record is shared across all selected lists.
          </p>
          {lists.map((list) => {
            const checked = selectedListIds.includes(list.id);
            return (
              <label
                key={list.id}
                className="flex cursor-pointer items-center justify-between rounded-xl border border-white/10 bg-ink-950/60 px-3 py-2.5 text-xs text-white"
              >
                <span className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleListId(list.id)}
                    className="accent-gold-500"
                  />
                  {list.name}
                </span>
                <Badge variant="muted">{list.type}</Badge>
              </label>
            );
          })}
        </div>
      </Modal>

      {feedback && (
        <Toast message={feedback} onDismiss={() => setFeedback(null)} />
      )}
    </div>
  );
}
