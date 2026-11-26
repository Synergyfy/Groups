import { Check, ListChecks, Lock, Plus } from "lucide-react";
import Badge from "../../components/ui/Badge";
import Card, { CardBody } from "../../components/ui/Card";
import LinkButton from "../../components/ui/LinkButton";
import SectionHeader from "../../components/ui/SectionHeader";
import {
  useAppState,
  useBusinessId,
  useMandatoryGroupStatuses,
} from "../../store/selectors";

export default function RequiredGroupsPage() {
  const actorId = useBusinessId();
  const { adminConfig } = useAppState();
  const mandatoryStatuses = useMandatoryGroupStatuses(actorId);

  const requiredRules = [...mandatoryStatuses]
    .filter((entry) => entry.required)
    .sort((a, b) => (a.order ?? 999) - (b.order ?? 999));

  const missingRequired = requiredRules.filter((entry) => !entry.satisfied);
  const nextOrder = missingRequired[0]?.order ?? 1;
  const dueNowTypes = new Set(
    missingRequired
      .filter((entry) => (entry.order ?? 999) === nextOrder)
      .map((entry) => entry.type),
  );

  const optionalTypes = (adminConfig.groupTypes ?? []).filter(
    (entry) =>
      entry.enabled &&
      entry.allowCreate &&
      !requiredRules.some((req) => req.type === entry.type),
  );

  return (
    <div className="flex flex-col gap-5">
      <SectionHeader
        title="Required Groups"
        subtitle="Complete your Admin-configured required groups in order before creating additional group types."
        back="/business/groups"
        backLabel="Overview"
      />

      {missingRequired.length > 0 && (
        <div className="flex items-start gap-2.5 rounded-2xl border border-gold-500/30 bg-gold-500/10 p-4 text-xs text-gold-200">
          <ListChecks className="mt-0.5 size-4 shrink-0 text-gold-400" />
          <div>
            <p className="font-semibold text-white">
              Complete your required group setup before creating additional groups.
            </p>
            <p className="mt-1 text-slate-300">
              {requiredRules.length - missingRequired.length} of{" "}
              {requiredRules.length} required groups created. Next up:{" "}
              <span className="font-semibold text-white">
                {[...dueNowTypes].join(", ")}
              </span>
              .
            </p>
          </div>
        </div>
      )}

      <Card>
        <CardBody className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-white">
              Groups you need to create
            </h2>
            <Badge variant={missingRequired.length === 0 ? "success" : "warning"}>
              {requiredRules.length - missingRequired.length} /{" "}
              {requiredRules.length} Created
            </Badge>
          </div>

          {requiredRules.length === 0 ? (
            <p className="text-xs text-slate-400">
              No mandatory groups are currently required by Admin.
            </p>
          ) : (
            <ul className="flex flex-col gap-2.5">
              {requiredRules.map((entry, idx) => {
                const isDueNow = !entry.satisfied && dueNowTypes.has(entry.type);
                const isLockedLater = !entry.satisfied && !isDueNow;
                return (
                  <li
                    key={entry.type}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 bg-ink-950/60 px-4 py-3"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-ink-900 text-xs font-bold text-slate-300">
                        {entry.satisfied ? (
                          <Check className="size-4 text-success-400" />
                        ) : isLockedLater ? (
                          <Lock className="size-3.5 text-slate-500" />
                        ) : (
                          entry.order ?? idx + 1
                        )}
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-white">
                          {entry.type} Group
                        </p>
                        <p className="mt-0.5 text-[11px] text-slate-400">
                          Required setup ·{" "}
                          {entry.pricing === "paid" ? "Paid" : "Free or paid"}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {entry.satisfied ? (
                        <Badge variant="success">Created</Badge>
                      ) : isDueNow ? (
                        <>
                          <Badge variant="warning">Not created</Badge>
                          <LinkButton
                            to={`/business/groups/create?type=${encodeURIComponent(entry.type)}`}
                            size="sm"
                          >
                            <Plus className="size-3.5" /> Create {entry.type}
                          </LinkButton>
                        </>
                      ) : (
                        <Badge variant="muted">
                          Waiting (Step {entry.order ?? idx + 1})
                        </Badge>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </CardBody>
      </Card>

      {optionalTypes.length > 0 && (
        <Card>
          <CardBody className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-white">
                Additional Group Types
              </h2>
              <Badge variant={missingRequired.length === 0 ? "success" : "muted"}>
                {missingRequired.length === 0 ? "Unlocked" : "Locked"}
              </Badge>
            </div>
            {missingRequired.length > 0 && (
              <p className="text-xs text-slate-400">
                Complete your required group setup before creating additional groups.
              </p>
            )}
            <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
              {optionalTypes.map((entry) => {
                const disabled = missingRequired.length > 0;
                return (
                  <div
                    key={entry.type}
                    className={`flex items-center justify-between rounded-xl border px-3.5 py-2.5 ${
                      disabled
                        ? "border-white/5 bg-ink-950/30 opacity-60"
                        : "border-white/10 bg-ink-950/60"
                    }`}
                  >
                    <span className="text-xs font-medium text-white">
                      {entry.type}
                    </span>
                    {disabled ? (
                      <Lock className="size-3.5 text-slate-500" />
                    ) : (
                      <LinkButton
                        to={`/business/groups/create?type=${encodeURIComponent(entry.type)}`}
                        size="sm"
                        variant="outline"
                      >
                        Create
                      </LinkButton>
                    )}
                  </div>
                );
              })}
            </div>
          </CardBody>
        </Card>
      )}
    </div>
  );
}
