import { Construction } from "lucide-react";
import Badge from "../components/ui/Badge";
import Card, { CardBody } from "../components/ui/Card";
import SectionHeader from "../components/ui/SectionHeader";

export interface PlaceholderPageProps {
  title: string;
  doc?: string;
  phase: string;
  description?: string;
}

export default function PlaceholderPage({
  title,
  doc,
  phase,
  description,
}: PlaceholderPageProps) {
  return (
    <div className="flex flex-col gap-4">
      <div data-tour="title">
        <SectionHeader title={title} subtitle={description} />
      </div>
      <Card data-tour="panel">
        <CardBody className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
          <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-ink-800 text-gold-400">
            <Construction className="size-6" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="gold">{phase}</Badge>
              {doc && <Badge variant="muted">{doc}</Badge>}
            </div>
            <p className="mt-2 text-xs leading-relaxed text-slate-400">
              This screen is part of the planned prototype. It will be implemented when
              its phase begins. Routing, layout and navigation are already live.
            </p>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
