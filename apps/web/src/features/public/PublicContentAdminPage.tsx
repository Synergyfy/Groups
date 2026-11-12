import { useMemo, useState } from "react";
import Card, { CardBody, CardTitle } from "../../components/ui/Card";
import Badge from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import FieldHint from "../../components/ui/FieldHint";
import Toast from "../../components/ui/Toast";
import { adminApi, type AdminContentSection } from "../../admin/adminApi";
import { useAdminData } from "../../admin/AdminDataProvider";

export default function PublicContentAdminPage() {
  const { data, refresh } = useAdminData();
  const sections = useMemo(() => data?.content ?? [], [data]);

  const [selectedId, setSelectedId] = useState<string>("hero");
  const [feedback, setFeedback] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const selected = sections.find((section) => section.id === selectedId) ?? sections[0];

  const published =
    sections.length > 0 &&
    sections.every((section) => section.status === "published");

  const publishAll = async () => {
    setSaving(true);
    try {
      await adminApi.publishAllContent();
      await refresh();
      setFeedback("All content sections published to the live site.");
    } catch {
      setFeedback("Could not publish the content.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-lg bg-ink-950/80 p-4">
        <h2 className="mb-2 text-xl font-bold text-white">
          Website Content Administration
        </h2>
        <p className="text-slate-400">
          Manage all publicly visible content fields — every section is versioned and publishes
          to the live site when saved.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        {sections.map((section) => (
          <button
            key={section.id}
            type="button"
            onClick={() => setSelectedId(section.id)}
            className={`rounded-xl border p-4 text-left transition-colors ${
              selected?.id === section.id
                ? "border-gold-500/50 bg-gold-500/10"
                : "border-white/10 bg-ink-950/60 hover:border-white/20"
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-semibold text-white">{section.label}</span>
              <Badge variant={section.status === "published" ? "success" : "muted"}>
                {section.status === "published" ? "Published" : "Draft"}
              </Badge>
            </div>
          </button>
        ))}
      </div>

      {selected && (
        <div className="grid gap-4 lg:grid-cols-2">
          <SectionEditor
            key={selected.id}
            section={selected}
            onFeedback={setFeedback}
          />

          <Card>
            <CardBody className="flex flex-col gap-3">
              <div className="flex items-center justify-between gap-2">
                <CardTitle>Published state</CardTitle>
                <Badge variant={published ? "success" : "muted"}>
                  {published ? "Published — live on site" : "Draft — not visible publicly"}
                </Badge>
              </div>
              <p className="text-[11px] leading-relaxed text-slate-400">
                {published
                  ? "Every content section is published. The public website reflects the latest published copy."
                  : "Some sections are still drafts. Changes are saved to draft first, then published to the live site."}
              </p>
              <Button variant="primary" size="sm" onClick={publishAll} disabled={saving}>
                Publish all sections
              </Button>
              <div className="rounded-lg border border-white/10 bg-ink-950/60 p-3 text-[11px] text-slate-400">
                <p className="font-semibold text-slate-300">Last published</p>
                <p className="mt-1">
                  {selected.publishedAt
                    ? new Date(selected.publishedAt).toLocaleString("en-GB")
                    : "Not published yet"}
                </p>
              </div>
            </CardBody>
          </Card>
        </div>
      )}

      {feedback && <Toast message={feedback} onDismiss={() => setFeedback(null)} />}
    </div>
  );
}

function SectionEditor({
  section,
  onFeedback,
}: {
  section: AdminContentSection;
  onFeedback: (message: string) => void;
}) {
  const { refresh } = useAdminData();
  const draft = section.draft as {
    headline?: string;
    body?: string;
    text?: string;
  };
  const [headline, setHeadline] = useState(draft.headline ?? draft.text ?? "");
  const [body, setBody] = useState(draft.body ?? "");
  const [saving, setSaving] = useState(false);

  const saveDraft = async () => {
    setSaving(true);
    try {
      await adminApi.updateContent(section.id, {
        draft: { ...section.draft, headline, body },
      });
      await refresh();
      onFeedback(`Draft saved for ${section.label}.`);
    } catch {
      onFeedback("Could not save the draft.");
    } finally {
      setSaving(false);
    }
  };

  const publishSelected = async () => {
    setSaving(true);
    try {
      await adminApi.updateContent(section.id, {
        draft: { ...section.draft, headline, body },
      });
      await adminApi.publishContent(section.id);
      await refresh();
      onFeedback(`${section.label} published to the live site.`);
    } catch {
      onFeedback("Could not publish this section.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardBody className="flex flex-col gap-3">
        <CardTitle>{section.label}</CardTitle>
        <label className="flex flex-col gap-1.5">
          <span className="text-[11px] uppercase tracking-wide text-slate-500">
            Headline / title
          </span>
          <input
            type="text"
            value={headline}
            onChange={(event) => setHeadline(event.target.value)}
            className="w-full rounded-lg border border-white/10 bg-ink-800 px-3 py-2 text-xs text-white outline-none placeholder:text-slate-500"
            placeholder="Section headline"
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-[11px] uppercase tracking-wide text-slate-500">
            Body copy
          </span>
          <textarea
            value={body}
            onChange={(event) => setBody(event.target.value)}
            rows={8}
            className="w-full resize-none rounded-lg border border-white/10 bg-ink-800 px-3 py-2 text-xs text-white outline-none placeholder:text-slate-500"
            placeholder="Section body copy"
          />
        </label>
        <FieldHint>
          Saves to draft first. Publish when the section is ready for the public website.
        </FieldHint>
        <div className="flex gap-3">
          <Button variant="secondary" size="sm" onClick={saveDraft} disabled={saving}>
            Save draft
          </Button>
          <Button variant="primary" size="sm" onClick={publishSelected} disabled={saving}>
            Publish section
          </Button>
        </div>
      </CardBody>
    </Card>
  );
}
