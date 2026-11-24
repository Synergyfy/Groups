import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowRight,
  CheckCircle2,
  Clock,
  Pencil,
  Plus,
  QrCode,
  ScanLine,
  Trash2,
  UserPlus,
  Users,
  XCircle,
} from "lucide-react";
import Badge from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import Card, { CardBody, CardTitle } from "../../components/ui/Card";
import CollapsibleCard from "../../components/ui/CollapsibleCard";
import FieldHint from "../../components/ui/FieldHint";
import LinkButton from "../../components/ui/LinkButton";
import Modal from "../../components/ui/Modal";
import SectionHeader from "../../components/ui/SectionHeader";
import StatCard from "../../components/ui/StatCard";
import { errorMessage } from "../../app/api";
import { businessApi, useBusinessData } from "../../business/BusinessDataProvider";
import type { NetworkListResponse } from "../../business/businessApi";
import AddContactFlow from "./AddContactFlow";

const SOURCE_ICON: Record<string, typeof QrCode> = {
  "Manual Contacts": Users,
  "QR Plaque Scans": QrCode,
  "Affiliate Signups": ScanLine,
  "Traffic & Leads Directory": ArrowRight,
};

const LIST_SOURCES = [
  "Manual Contacts",
  "QR Plaque Scans",
  "Affiliate Signups",
  "Traffic & Leads Directory",
];
const FIELD_CLASS =
  "h-10 rounded-lg border border-white/10 bg-ink-800 px-3 text-xs text-slate-200 placeholder:text-slate-500 focus:border-gold-500/50 focus:outline-none";

export default function MyNetworkListsPage() {
  const navigate = useNavigate();
  const { networkLists, contacts, refresh } = useBusinessData();
  const [addFlowOpen, setAddFlowOpen] = useState(false);
  const [listOpen, setListOpen] = useState(false);
  const [listName, setListName] = useState("");
  const [listType, setListType] = useState("B2B");
  const [savingList, setSavingList] = useState(false);
  const [listError, setListError] = useState<string | null>(null);

  const createList = async () => {
    if (!listName.trim() || savingList) return;
    setSavingList(true);
    setListError(null);
    try {
      await businessApi.createNetworkList({
        name: listName.trim(),
        type: listType,
        source: "Manual Contacts",
      });
      await refresh();
      setListName("");
      setListType("B2B");
      setListOpen(false);
    } catch (cause) {
      setListError(errorMessage(cause));
    } finally {
      setSavingList(false);
    }
  };

  const [editTarget, setEditTarget] = useState<NetworkListResponse | null>(null);
  const [editName, setEditName] = useState("");
  const [editType, setEditType] = useState("B2B");
  const [editStatus, setEditStatus] = useState("Active");
  const [editSource, setEditSource] = useState("Manual Contacts");
  const [savingEdit, setSavingEdit] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const openEdit = (list: NetworkListResponse) => {
    setEditTarget(list);
    setEditName(list.name);
    setEditType(list.type);
    setEditStatus(list.status);
    setEditSource(list.source);
    setEditError(null);
  };

  const saveEdit = async () => {
    if (!editTarget || !editName.trim() || savingEdit) return;
    setSavingEdit(true);
    setEditError(null);
    try {
      await businessApi.updateNetworkList(editTarget.id, {
        name: editName.trim(),
        type: editType,
        status: editStatus,
        source: editSource,
      });
      await refresh();
      setEditTarget(null);
    } catch (cause) {
      setEditError(errorMessage(cause));
    } finally {
      setSavingEdit(false);
    }
  };

  const [deleteTarget, setDeleteTarget] = useState<NetworkListResponse | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const confirmDelete = async () => {
    if (!deleteTarget || deleting) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      await businessApi.removeNetworkList(deleteTarget.id);
      await refresh();
      setDeleteTarget(null);
    } catch (cause) {
      setDeleteError(errorMessage(cause));
    } finally {
      setDeleting(false);
    }
  };

  const [manageTarget, setManageTarget] = useState<NetworkListResponse | null>(null);
  const [contactBusyId, setContactBusyId] = useState<string | null>(null);
  const [contactError, setContactError] = useState<string | null>(null);

  const confirmContact = async (contactId: string) => {
    if (contactBusyId) return;
    setContactBusyId(contactId);
    setContactError(null);
    try {
      await businessApi.confirmContact(contactId, true);
      await refresh();
    } catch (cause) {
      setContactError(errorMessage(cause));
    } finally {
      setContactBusyId(null);
    }
  };

  const removeContact = async (contactId: string) => {
    if (contactBusyId) return;
    setContactBusyId(contactId);
    setContactError(null);
    try {
      await businessApi.removeContact(contactId);
      await refresh();
    } catch (cause) {
      setContactError(errorMessage(cause));
    } finally {
      setContactBusyId(null);
    }
  };

  const manageContacts = manageTarget
    ? contacts.filter((contact) => contact.listId === manageTarget.id)
    : [];

  const lists = networkLists?.items ?? [];
  const stats = networkLists?.stats;

  const totalContacts = stats?.contacts ?? contacts.length;
  const b2b = stats?.b2bLists ?? lists.filter((list) => list.type === "B2B").length;
  const b2c = stats?.b2cLists ?? lists.filter((list) => list.type === "B2C").length;
  const sources = stats?.sources ?? [...new Set(lists.map((list) => list.source))];
  const pendingTotal =
    stats?.pending ?? contacts.filter((contact) => contact.confirmation === "pending").length;

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
            <Button
              size="sm"
              variant="secondary"
              onClick={() => {
                setListError(null);
                setListOpen(true);
              }}
            >
              <Plus className="size-4" /> New list
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
          value={(stats?.lists ?? lists.length).toLocaleString("en-GB")}
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
          hint="List types in your network"
          accent="success"
        />
        <StatCard
          label="Intake sources"
          value={sources.length.toLocaleString("en-GB")}
          hint="How contacts arrived"
          accent="warning"
        />
      </div>

      {lists.length === 0 ? (
        <Card>
          <CardBody className="flex flex-col items-center gap-3 py-10 text-center">
            <Users className="size-8 text-slate-500" />
            <p className="text-sm font-semibold text-white">No network lists yet</p>
            <p className="max-w-sm text-xs leading-relaxed text-slate-400">
              Add your first contact to start building a network list, then create a circle
              from it.
            </p>
            <Button size="sm" onClick={() => setAddFlowOpen(true)}>
              <UserPlus className="size-4" /> Add Contact
            </Button>
          </CardBody>
        </Card>
      ) : (
        <div className="flex flex-col gap-4" data-tour="lists">
          {lists.map((list) => {
            const listContacts = contacts.filter((contact) => contact.listId === list.id);
            const pendingCount =
              listContacts.filter((contact) => contact.confirmation === "pending").length;
            const contactCount = list.contactCount ?? listContacts.length;
            const Icon = SOURCE_ICON[list.source] ?? Users;

            return (
              <CollapsibleCard
                key={list.id}
                title={list.name}
                subtitle={`${list.geography} · ${list.status}`}
                defaultOpen
                leading={
                  <span className="flex size-9 items-center justify-center rounded-xl border border-white/10 bg-ink-950 text-gold-500">
                    <Icon className="size-4" />
                  </span>
                }
                action={
                  <>
                    {pendingCount > 0 && (
                      <Badge variant="warning">{pendingCount} pending</Badge>
                    )}
                    <Badge variant="muted">
                      {contactCount} contact{contactCount === 1 ? "" : "s"}
                    </Badge>
                    <Badge variant={list.type === "B2B" ? "gold" : "info"}>{list.type}</Badge>
                  </>
                }
                bodyClassName="flex flex-col gap-3"
              >
                <p className="flex items-center gap-2 rounded-xl border border-white/10 bg-ink-950/60 px-3 py-2.5 text-[11px] text-slate-400">
                  <Icon className="size-3.5 shrink-0 text-gold-400" />
                  Intake source: <span className="font-semibold text-white">{list.source}</span>
                </p>

                <div className="flex flex-wrap gap-1.5">
                  {listContacts.slice(0, 6).map((contact) => (
                    <span
                      key={contact.id}
                      title={
                        contact.confirmation === "pending"
                          ? "Pending — waiting for their email confirmation"
                          : contact.email
                      }
                      className={`inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-[11px] ${
                        contact.confirmation === "pending"
                          ? "border-gold-500/40 bg-gold-500/10 text-gold-200"
                          : "border-white/10 bg-ink-950/60 text-slate-300"
                      }`}
                    >
                      {contact.confirmation === "pending" && (
                        <Clock className="size-3 shrink-0" />
                      )}
                      {contact.fullName}
                    </span>
                  ))}
                  {listContacts.length > 6 && (
                    <span className="rounded-lg border border-white/10 bg-ink-950/60 px-2 py-1 text-[11px] text-slate-500">
                      +{listContacts.length - 6} more
                    </span>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-1.5 border-t border-white/5 pt-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setContactError(null);
                      setManageTarget(list);
                    }}
                  >
                    <Users className="size-3.5" /> Manage contacts
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => openEdit(list)}>
                    <Pencil className="size-3.5" /> Edit list
                  </Button>
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => {
                      setDeleteError(null);
                      setDeleteTarget(list);
                    }}
                  >
                    <Trash2 className="size-3.5" /> Delete
                  </Button>
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
      )}

      <Card data-tour="note">
        <CardBody className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle>How lists, circles and groups relate</CardTitle>
          </div>
          <ul className="flex flex-col gap-2 text-xs leading-relaxed text-slate-400">
            <li className="rounded-xl border border-white/10 bg-ink-950/60 px-3 py-2.5">
              A <span className="font-semibold text-white">list</span> is intake: raw contacts
              captured from one source, with a type (B2B/B2C). Its reach follows your business
              location, so you never set it by hand.
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

      <Modal
        open={listOpen}
        title="Create a network list"
        onClose={() => setListOpen(false)}
        footer={
          <>
            <Button variant="ghost" size="sm" onClick={() => setListOpen(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={createList}
              disabled={!listName.trim() || savingList}
            >
              {savingList ? "Creating…" : "Create list"}
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-3">
          <label className="flex flex-col gap-1.5 text-xs">
            <span className="font-semibold text-white">List name</span>
            <FieldHint>How this intake list appears across your network.</FieldHint>
            <input
              value={listName}
              onChange={(event) => {
                setListName(event.target.value);
                setListError(null);
              }}
              placeholder="e.g. Autumn referrals"
              className="h-10 rounded-lg border border-white/10 bg-ink-800 px-3 text-xs text-slate-200 placeholder:text-slate-500 focus:border-gold-500/50 focus:outline-none"
            />
          </label>
          <label className="flex flex-col gap-1.5 text-xs">
            <span className="font-semibold text-white">Type</span>
            <select
              value={listType}
              onChange={(event) => setListType(event.target.value)}
              className="h-10 rounded-lg border border-white/10 bg-ink-800 px-3 text-xs text-slate-200 focus:border-gold-500/50 focus:outline-none"
            >
              <option value="B2B">B2B</option>
              <option value="B2C">B2C</option>
            </select>
          </label>
          {listError && (
            <p className="rounded-xl border border-danger-500/30 bg-danger-500/10 px-3 py-2.5 text-xs text-danger-400">
              {listError}
            </p>
          )}
        </div>
      </Modal>

      <Modal
        open={Boolean(editTarget)}
        title="Edit network list"
        onClose={() => setEditTarget(null)}
        footer={
          <>
            <Button variant="ghost" size="sm" onClick={() => setEditTarget(null)}>
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={saveEdit}
              disabled={!editName.trim() || savingEdit}
            >
              {savingEdit ? "Saving…" : "Save changes"}
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-3">
          <label className="flex flex-col gap-1.5 text-xs">
            <span className="font-semibold text-white">List name</span>
            <input
              value={editName}
              onChange={(event) => {
                setEditName(event.target.value);
                setEditError(null);
              }}
              className={FIELD_CLASS}
            />
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="flex flex-col gap-1.5 text-xs">
              <span className="font-semibold text-white">Type</span>
              <select
                value={editType}
                onChange={(event) => setEditType(event.target.value)}
                className={FIELD_CLASS}
              >
                <option value="B2B">B2B</option>
                <option value="B2C">B2C</option>
              </select>
            </label>
            <label className="flex flex-col gap-1.5 text-xs">
              <span className="font-semibold text-white">Status</span>
              <select
                value={editStatus}
                onChange={(event) => setEditStatus(event.target.value)}
                className={FIELD_CLASS}
              >
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
            </label>
            <label className="flex flex-col gap-1.5 text-xs">
              <span className="font-semibold text-white">Intake source</span>
              <select
                value={editSource}
                onChange={(event) => setEditSource(event.target.value)}
                className={FIELD_CLASS}
              >
                {LIST_SOURCES.map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            </label>
          </div>
          {editError && (
            <p className="rounded-xl border border-danger-500/30 bg-danger-500/10 px-3 py-2.5 text-xs text-danger-400">
              {editError}
            </p>
          )}
        </div>
      </Modal>

      <Modal
        open={Boolean(deleteTarget)}
        title="Delete this list?"
        onClose={() => setDeleteTarget(null)}
        footer={
          <>
            <Button variant="ghost" size="sm" onClick={() => setDeleteTarget(null)}>
              Keep list
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={confirmDelete}
              disabled={deleting}
            >
              {deleting ? "Deleting…" : "Delete list"}
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-3 text-xs leading-relaxed text-slate-400">
          <p>
            <span className="font-semibold text-white">{deleteTarget?.name}</span> and its{" "}
            {deleteTarget?.contactCount ?? 0} contact(s) will be removed. Circles built
            from this list keep their existing members but lose the list link.
          </p>
          {deleteError && (
            <p className="rounded-xl border border-danger-500/30 bg-danger-500/10 px-3 py-2.5 text-danger-400">
              {deleteError}
            </p>
          )}
        </div>
      </Modal>

      <Modal
        open={Boolean(manageTarget)}
        title={`Contacts — ${manageTarget?.name ?? ""}`}
        onClose={() => setManageTarget(null)}
        footer={
          <Button variant="secondary" size="sm" onClick={() => setManageTarget(null)}>
            Done
          </Button>
        }
      >
        <div className="flex flex-col gap-3">
          {contactError && (
            <p className="rounded-xl border border-danger-500/30 bg-danger-500/10 px-3 py-2.5 text-xs text-danger-400">
              {contactError}
            </p>
          )}
          {manageContacts.length === 0 ? (
            <p className="rounded-xl border border-white/10 bg-ink-950/60 px-3 py-4 text-center text-xs text-slate-500">
              This list has no contacts yet.
            </p>
          ) : (
            <ul className="flex max-h-80 flex-col gap-2 overflow-y-auto pr-1">
              {manageContacts.map((contact) => (
                <li
                  key={contact.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/10 bg-ink-950/60 px-3 py-2"
                >
                  <div className="min-w-0">
                    <p className="truncate text-xs font-semibold text-white">
                      {contact.fullName}
                    </p>
                    <p className="truncate text-[11px] text-slate-500">
                      {contact.email || contact.phone || "No contact details"}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1.5">
                    <Badge
                      variant={contact.confirmation === "confirmed" ? "success" : "warning"}
                    >
                      {contact.confirmation}
                    </Badge>
                    {contact.confirmation !== "confirmed" && (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={contactBusyId === contact.id}
                        onClick={() => confirmContact(contact.id)}
                      >
                        <CheckCircle2 className="size-3.5" /> Confirm
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="danger"
                      disabled={contactBusyId === contact.id}
                      onClick={() => removeContact(contact.id)}
                    >
                      <XCircle className="size-3.5" /> Remove
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
          <p className="text-[11px] text-slate-500">
            Confirming records the contact as verified. Removing also takes them out of
            any circle they were added to.
          </p>
        </div>
      </Modal>
    </div>
  );
}
