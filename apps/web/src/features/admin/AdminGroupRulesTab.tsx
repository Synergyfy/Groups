import { useMemo, useState } from "react";
import {
  CircleDot,
  FolderKanban,
  Save,
  ShieldCheck,
  TriangleAlert,
} from "lucide-react";
import Badge from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import Card, { CardBody, CardTitle } from "../../components/ui/Card";
import EmptyState from "../../components/ui/EmptyState";
import Toast from "../../components/ui/Toast";
import { adminApi } from "../../admin/adminApi";
import { useAdminData } from "../../admin/AdminDataProvider";
import { errorMessage } from "../../app/api";
import { useAppState } from "../../store/selectors";
import type {
  AdminConfig,
  MandatoryCircleRule,
  MandatoryGroupRule,
  UserGroupType,
} from "../../domain/types";

const FIELD_CLASS =
  "h-9 rounded-lg border border-white/10 bg-ink-800 px-2.5 text-xs text-slate-200 focus:border-gold-500/50 focus:outline-none";

function sameRules<T>(a: T[], b: T[]): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

/**
 * The admin editor is remounted whenever the persisted rules change. That
 * keeps the draft state in sync with the server without a reset effect, while
 * still allowing unsaved edits to survive unrelated re-renders.
 */
export default function AdminGroupRulesTab() {
  const state = useAppState();
  const { refresh } = useAdminData();
  const config = state.adminConfig;
  const [feedback, setFeedback] = useState<string | null>(null);

  const version = JSON.stringify({
    groups: config.mandatoryGroups ?? [],
    circles: config.mandatoryCircles ?? [],
    groupTypes: config.groupTypes,
    circleTypes: config.circleTypes,
  });

  const handleSaved = async () => {
    await refresh();
    setFeedback("Group and circle rules saved.");
  };

  return (
    <div className="flex flex-col gap-4">
      <RulesEditor
        key={version}
        config={config}
        onSaved={handleSaved}
      />
      {feedback && (
        <Toast message={feedback} onDismiss={() => setFeedback(null)} />
      )}
    </div>
  );
}

function RulesEditor({
  config,
  onSaved,
}: {
  config: AdminConfig;
  onSaved: () => Promise<void>;
}) {
  const [groupRules, setGroupRules] = useState<MandatoryGroupRule[]>(() =>
    (config.mandatoryGroups ?? []).map((rule) => ({ ...rule })),
  );
  const [circleRules, setCircleRules] = useState<MandatoryCircleRule[]>(() =>
    (config.mandatoryCircles ?? []).map((rule) => ({ ...rule })),
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const dirty =
    !sameRules(groupRules, config.mandatoryGroups ?? []) ||
    !sameRules(circleRules, config.mandatoryCircles ?? []);

  const groupTypes = useMemo(() => {
    const names = new Set<string>([
      ...(config.groupTypes ?? []).map((entry) => entry.type),
      ...groupRules.map((rule) => rule.type),
    ]);
    return [...names].sort((a, b) => a.localeCompare(b));
  }, [config.groupTypes, groupRules]);

  const circleTypes = useMemo(() => {
    const names = new Set<string>([
      ...(config.circleTypes ?? []).map((entry) => entry.type),
      ...circleRules.map((rule) => rule.circleType),
    ]);
    return [...names].sort((a, b) => a.localeCompare(b));
  }, [config.circleTypes, circleRules]);

  const groupRuleFor = (type: string) =>
    groupRules.find((rule) => rule.type === type);
  const circleRuleFor = (type: string) =>
    circleRules.find((rule) => rule.circleType === type);

  const toggleGroup = (type: string) => {
    setGroupRules((current) => {
      if (current.some((rule) => rule.type === type)) {
        return current.map((rule) =>
          rule.type === type ? { ...rule, required: !rule.required } : rule,
        );
      }
      return [
        ...current,
        { type: type as UserGroupType, required: true, pricing: "owner-choice" },
      ];
    });
  };

  const setGroupPricing = (
    type: string,
    pricing: MandatoryGroupRule["pricing"],
  ) => {
    setGroupRules((current) =>
      current.map((rule) => (rule.type === type ? { ...rule, pricing } : rule)),
    );
  };

  const toggleCircle = (type: string) => {
    setCircleRules((current) => {
      if (current.some((rule) => rule.circleType === type)) {
        return current.map((rule) =>
          rule.circleType === type
            ? { ...rule, required: !rule.required }
            : rule,
        );
      }
      const meta = (config.circleTypes ?? []).find((entry) => entry.type === type);
      return [
        ...current,
        {
          circleType: type,
          required: true,
          appliesToTier: "All",
          minMemberCount: meta?.minMembers ?? 1,
          autoEnforce: false,
        },
      ];
    });
  };

  const updateCircle = (
    type: string,
    patch: Partial<MandatoryCircleRule>,
  ) => {
    setCircleRules((current) =>
      current.map((rule) =>
        rule.circleType === type ? { ...rule, ...patch } : rule,
      ),
    );
  };

  const reset = () => {
    setGroupRules((config.mandatoryGroups ?? []).map((rule) => ({ ...rule })));
    setCircleRules(
      (config.mandatoryCircles ?? []).map((rule) => ({ ...rule })),
    );
    setError(null);
  };

  const save = async () => {
    if (saving) return;
    setSaving(true);
    setError(null);
    try {
      await adminApi.patchConfig({
        mandatoryGroups: groupRules,
        mandatoryCircles: circleRules,
      });
      await onSaved();
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Card>
        <CardBody className="flex items-start gap-3">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-gold-500/30 bg-gold-500/10 text-gold-500">
            <ShieldCheck className="size-4" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-white">
              Business group creation rules
            </p>
            <p className="mt-1 max-w-3xl text-xs leading-relaxed text-slate-400">
              These rules are enforced by the Groups API. Required groups must
              be created before any other group type, and required circles must
              exist with the minimum members before <em>any</em> group can be
              created. Businesses see a blocking modal with a link to the right
              setup screen.
            </p>
          </div>
        </CardBody>
      </Card>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardBody className="flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <FolderKanban className="size-4 text-gold-500" />
              <CardTitle>Required groups</CardTitle>
              <Badge variant="muted">{groupRules.filter((rule) => rule.required).length} required</Badge>
            </div>
            <p className="text-[11px] leading-relaxed text-slate-500">
              The owner must create these group types first. “Free or paid”
              lets the owner pick inside the wizard; “Paid group” forces the
              paid path.
            </p>

            {groupTypes.length === 0 ? (
              <EmptyState
                title="No group types configured"
                description="Add group types from the admin group configuration before setting mandatory rules."
              />
            ) : (
              <div className="flex flex-col gap-2">
                {groupTypes.map((type) => {
                  const meta = (config.groupTypes ?? []).find(
                    (entry) => entry.type === type,
                  );
                  const rule = groupRuleFor(type);
                  const unavailable = Boolean(
                    meta && (!meta.enabled || !meta.allowCreate),
                  );
                  return (
                    <div
                      key={type}
                      className="flex flex-col gap-2 rounded-xl border border-white/10 bg-ink-950/60 p-3 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-xs font-semibold text-white">
                            {type} group
                          </p>
                          {rule?.required && <Badge variant="gold">Required</Badge>}
                          {unavailable && (
                            <Badge variant="warning">
                              <TriangleAlert className="size-3" />
                              Disabled for creation
                            </Badge>
                          )}
                        </div>
                        <p className="mt-1 text-[11px] text-slate-500">
                          {meta
                            ? meta.enabled && meta.allowCreate
                              ? "Enabled and creatable by businesses."
                              : "Businesses cannot create this type until it is enabled and allowed."
                            : "No group type configuration found."}
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center gap-3">
                        {rule?.required && (
                          <label className="flex items-center gap-2 text-[11px] text-slate-400">
                            Pricing
                            <select
                              value={rule.pricing}
                              onChange={(event) =>
                                setGroupPricing(
                                  type,
                                  event.target
                                    .value as MandatoryGroupRule["pricing"],
                                )
                              }
                              className={FIELD_CLASS}
                            >
                              <option value="owner-choice">Free or paid</option>
                              <option value="paid">Paid group</option>
                            </select>
                          </label>
                        )}
                        <label className="flex cursor-pointer items-center gap-2 text-xs text-slate-300">
                          <input
                            type="checkbox"
                            checked={Boolean(rule?.required)}
                            onChange={() => toggleGroup(type)}
                            className="size-4 accent-gold-500"
                          />
                          Required
                        </label>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardBody className="flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <CircleDot className="size-4 text-gold-500" />
              <CardTitle>Required circles</CardTitle>
              <Badge variant="muted">{circleRules.filter((rule) => rule.required).length} required</Badge>
            </div>
            <p className="text-[11px] leading-relaxed text-slate-500">
              Circles are audiences built from network contacts. The business
              must have each required circle with at least the minimum number
              of members before it can create a group.
            </p>

            {circleTypes.length === 0 ? (
              <EmptyState
                title="No circle types configured"
                description="Add circle types from the admin circle configuration before setting mandatory rules."
              />
            ) : (
              <div className="flex flex-col gap-2">
                {circleTypes.map((type) => {
                  const meta = (config.circleTypes ?? []).find(
                    (entry) => entry.type === type,
                  );
                  const rule = circleRuleFor(type);
                  return (
                    <div
                      key={type}
                      className="flex flex-col gap-2 rounded-xl border border-white/10 bg-ink-950/60 p-3"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-xs font-semibold text-white">
                              {meta?.shortLabel ?? type}
                            </p>
                            <span className="text-[11px] text-slate-500">
                              {type}
                            </span>
                            {rule?.required && <Badge variant="gold">Required</Badge>}
                            {meta && !meta.enabled && (
                              <Badge variant="warning">
                                <TriangleAlert className="size-3" />
                                Type disabled
                              </Badge>
                            )}
                          </div>
                          {meta && (
                            <p className="mt-1 text-[11px] text-slate-500">
                              Type limits: {meta.minMembers ?? 0}
                              {meta.maxMembers === null
                                ? "+ members"
                                : `–${meta.maxMembers} members`}
                            </p>
                          )}
                        </div>
                        <label className="flex cursor-pointer items-center gap-2 text-xs text-slate-300">
                          <input
                            type="checkbox"
                            checked={Boolean(rule?.required)}
                            onChange={() => toggleCircle(type)}
                            className="size-4 accent-gold-500"
                          />
                          Required
                        </label>
                      </div>

                      {rule?.required && (
                        <div className="flex flex-wrap items-center gap-3 border-t border-white/5 pt-2">
                          <label className="flex items-center gap-2 text-[11px] text-slate-400">
                            Applies to
                            <select
                              value={rule.appliesToTier}
                              onChange={(event) =>
                                updateCircle(type, {
                                  appliesToTier: event.target
                                    .value as MandatoryCircleRule["appliesToTier"],
                                })
                              }
                              className={FIELD_CLASS}
                            >
                              <option value="All">All tiers</option>
                              <option value="Free">Free plans</option>
                              <option value="Paid">Paid plans</option>
                            </select>
                          </label>
                          <label className="flex items-center gap-2 text-[11px] text-slate-400">
                            Min members
                            <input
                              type="number"
                              min={0}
                              value={rule.minMemberCount}
                              onChange={(event) =>
                                updateCircle(type, {
                                  minMemberCount: Math.max(
                                    0,
                                    Number(event.target.value) || 0,
                                  ),
                                })
                              }
                              className={`${FIELD_CLASS} w-16`}
                            />
                          </label>
                          <label className="flex cursor-pointer items-center gap-2 text-[11px] text-slate-400">
                            <input
                              type="checkbox"
                              checked={rule.autoEnforce}
                              onChange={(event) =>
                                updateCircle(type, {
                                  autoEnforce: event.target.checked,
                                })
                              }
                              className="size-4 accent-gold-500"
                            />
                            Auto-create
                          </label>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
            <p className="text-[11px] leading-relaxed text-slate-500">
              Auto-create builds missing mandatory circles from the business's
              confirmed contacts when its circle list loads, subject to the
              plan/circle quota.
            </p>
          </CardBody>
        </Card>
      </div>

      {error && (
        <p className="rounded-xl border border-danger-500/30 bg-danger-500/10 px-3 py-2.5 text-xs text-danger-400">
          {error}
        </p>
      )}

      <div className="sticky bottom-4 z-10 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-ink-900/95 px-4 py-3 shadow-lg shadow-black/10 backdrop-blur">
        <p className="text-[11px] text-slate-500">
          {dirty ? "You have unsaved rule changes." : "All rule changes saved."}
        </p>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={reset}
            disabled={!dirty || saving}
          >
            Discard
          </Button>
          <Button
            size="sm"
            onClick={() => void save()}
            disabled={!dirty || saving}
          >
            <Save className="size-4" />
            {saving ? "Saving…" : "Save rules"}
          </Button>
        </div>
      </div>
    </>
  );
}
