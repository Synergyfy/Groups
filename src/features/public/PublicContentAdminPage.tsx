import { useState } from "react";
import Card, { CardBody } from "../../components/ui/Card";
import Badge from "../../components/ui/Badge";
import FieldHint from "../../components/ui/FieldHint";

export default function PublicContentAdminPage() {
  const [published, setPublished] = useState(false);

  const sections = [
    "hero",
    "cta",
    "product",
    "group-types",
    "how-it-works",
    "connected-products",
    "faqs",
    "notices",
    "navigation",
  ];

  const sectionLabels: Record<string, string> = {
    hero: "Homepage Hero",
    cta: "Primary & Secondary CTAs",
    product: "Product Introduction",
    group_types: "Group Type Descriptions",
    "how-it-works": "How It Works Steps",
    "connected-products": "Connected Products",
    faqs: "FAQs",
    notices: "Public Notices & Announcements",
    navigation: "Navigation Visibility",
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="bg-ink-950/80 p-4 rounded-lg mb-4">
        <h2 className="text-xl font-bold text-white mb-2">Website Content Administration</h2>
        <p className="text-slate-400">
          Manage all publicly visible content fields — every section is versioned and publishes
          to the live site when saved.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        {sections.map((section) => (
          <Card key={section} className="lg:col-span-2 xl:col-span-3">
            <CardBody className="flex flex-col gap-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-lg font-semibold text-white">{sectionLabels[section]}</span>
              </div>
              <p className="text-[11px] leading-relaxed text-slate-400">
                Manage the configurable fields from Section 7 of the specification. Every section
                is saved as draft first, then published to the live public website.
              </p>
            </CardBody>
          </Card>
        ))}
      </div>

      <div className="mt-8 grid gap-4 lg:grid-cols-2">
        <div className="bg-ink-950/80 p-4 rounded-lg">
          <h3 className="text-font-semibold text-white mb-2">Published state</h3>
          <Badge
            variant={published ? "success" : "muted"}
            className="text-lg"
          >
            {published ? "Published — live on site" : "Draft — not visible publicly"}
          </Badge>
          <p className="text-[11px] leading-relaxed text-slate-500">
            Changes are saved to draft first. Publish when ready for the public website to reflect
            updates.
          </p>
          <div className="flex gap-3">
            <button
              onClick={() => setPublished(false)}
              className="flex-1 h-10 rounded-lg border border-white/10 bg-ink-950/60 px-3 text-xs font-medium text-slate-300 transition-colors hover:border-gold-500/40"
            >
              Save draft
            </button>
            <button
              onClick={() => setPublished(true)}
              className="flex-1 h-10 rounded-lg bg-gold-500 px-3 text-xs font-semibold text-ink-950 transition-colors hover:bg-gold-400"
            >
              Publish
            </button>
          </div>
        </div>

        <div className="bg-ink-950/80 p-4 rounded-lg">
          <h3 className="text-font-semibold text-white mb-2">Preview result</h3>
          <p className="text-[11px] leading-relaxed text-slate-400">
            The public website will reflect published content on the next load. Use the preview
            section below to see how each content area renders.
          </p>
          <button
            className="w-full h-10 rounded-lg border border-gold-500/30 bg-gold-500/10 px-3 text-xs font-medium text-gold-200 transition-colors hover:bg-gold-500/20"
          >
            Preview site
          </button>
        </div>
      </div>

      <div className="mt-8 grid gap-4 lg:grid-cols-3">
        <div className="bg-ink-950/80 p-4 rounded-lg">
          <h3 className="text-font-semibold text-white mb-2">Hero headline & supporting text</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-white/10 bg-ink-950/60 p-3">
              <p className="text-[11px] uppercase tracking-wide text-slate-500">Hero headline</p>
              <textarea
                className="w-full h-24 rounded-lg border border-white/10 bg-ink-800 px-3 text-xs text-white outline-none resize-none placeholder:text-slate-500"
                rows={3}
              ></textarea>
            </div>
            <div className="rounded-xl border border-white/10 bg-ink-950/60 p-3">
              <p className="text-[11px] uppercase tracking-wide text-slate-500">Supporting text</p>
              <textarea
                className="w-full h-40 rounded-lg border border-white/10 bg-ink-800 px-3 text-xs text-white outline-none resize-none placeholder:text-slate-500"
                rows={4}
              ></textarea>
            </div>
          </div>
        </div>

        <div className="bg-ink-950/80 p-4 rounded-lg">
          <h3 className="text-font-semibold text-white mb-2">Primary & Secondary CTAs</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-white/10 bg-ink-950/60 p-3">
              <p className="text-[11px] uppercase tracking-wide text-slate-500">Primary CTA label</p>
              <input
                type="text"
                className="w-full rounded-lg border border-white/10 bg-ink-800 px-2.5 text-xs text-white outline-none placeholder:text-slate-500"
                placeholder="Get Started"
              />
            </div>
            <div className="rounded-xl border border-white/10 bg-ink-950/60 p-3">
              <p className="text-[11px] uppercase tracking-wide text-slate-500">Primary CTA destination</p>
              <input
                type="text"
                className="w-full rounded-lg border border-white/10 bg-ink-800 px-2.5 text-xs text-white outline-none placeholder:text-slate-500"
                placeholder="/business/groups"
              />
            </div>
            <div className="rounded-xl border border-white/10 bg-ink-950/60 p-3">
              <p className="text-[11px] uppercase tracking-wide text-slate-500">Secondary CTA label</p>
              <input
                type="text"
                className="w-full rounded-lg border border-white/10 bg-ink-800 px-2.5 text-xs text-white outline-none placeholder:text-slate-500"
                placeholder="Learn More"
              />
            </div>
            <div className="rounded-xl border border-white/10 bg-ink-950/60 p-3">
              <p className="text-[11px] uppercase tracking-wide text-slate-500">Secondary CTA destination</p>
              <input
                type="text"
                className="w-full rounded-lg border border-white/10 bg-ink-800 px-2.5 text-xs text-white outline-none placeholder:text-slate-500"
                placeholder="/business/overview"
              />
            </div>
          </div>
        </div>

        <div className="bg-ink-950/80 p-4 rounded-lg">
          <h3 className="text-font-semibold text-white mb-2">Product introduction</h3>
          <textarea
            className="w-full h-24 rounded-lg border border-white/10 bg-ink-800 px-3 text-xs text-white outline-none resize-none placeholder:text-slate-500"
            rows={3}
          ></textarea>
        </div>

        <div className="bg-ink-950/80 p-4 rounded-lg">
          <h3 className="text-font-semibold text-white mb-2">Group type descriptions</h3>
          <select
            className="h-10 rounded-lg border border-white/10 bg-ink-800 px-3 text-xs text-white outline-none focus:border-gold-500/50"
          >
            <option>Marketing</option>
            <option>Advertising</option>
            <option>Partner</option>
            <option>B2B</option>
            <option>Event/Expo</option>
            <option>Other</option>
          </select>
          <FieldHint>Edit the description for each group type shown in Explore Groups and the register.</FieldHint>
        </div>

        <div className="bg-ink-950/80 p-4 rounded-lg">
          <h3 className="text-font-semibold text-white mb-2">How It Works steps</h3>
          <select
            className="h-10 rounded-lg border border-white/10 bg-ink-800 px-3 text-xs text-white outline-none focus:border-gold-500/50"
          >
            <option>Discover group types that match your needs</option>
            <option>Connect your products and see compatible groups</option>
            <option>Join a group or request membership</option>
            <option>Participate in group activity and updates</option>
            <option>Manage your membership and group settings</option>
          </select>
          <FieldHint>Reorder or edit the steps shown on the How It Works page.</FieldHint>
        </div>

        <div className="bg-ink-950/80 p-4 rounded-lg">
          <h3 className="text-font-semibold text-white mb-2">Connected product entries</h3>
          <select
            className="h-10 rounded-lg border border-white/10 bg-ink-800 px-3 text-xs text-white outline-none focus:border-gold-500/50"
          >
            <option>Product 1 — Available</option>
            <option>Product 2 — Available</option>
            <option>Product 3 — Coming soon</option>
          </select>
          <FieldHint>Manage connected product availability statuses shown on the product page.</FieldHint>
        </div>

        <div className="bg-ink-950/80 p-4 rounded-lg">
          <h3 className="text-font-semibold text-white mb-2">FAQs</h3>
          <select
            className="h-10 rounded-lg border border-white/10 bg-ink-800 px-3 text-xs text-white outline-none focus:border-gold-500/50"
          >
            <option>What is a group?</option>
            <option>How do I create a group?</option>
            <option>How do I join a group?</option>
            <option>What are the membership costs?</option>
          </select>
          <FieldHint>Add or edit FAQ entries shown in the website footer.</FieldHint>
        </div>

        <div className="bg-ink-950/80 p-4 rounded-lg">
          <h3 className="text-font-semibold text-white mb-2">Public notices & announcements</h3>
          <select
            className="h-10 rounded-lg border border-white/10 bg-ink-800 px-3 text-xs text-white outline-none focus:border-gold-500/50"
          >
            <option>No active notices</option>
            <option>System maintenance — Friday 6-8pm</option>
            <option>New group type: Event/Expo now available</option>
          </select>
          <FieldHint>Public notices shown at the top of the public website. Temporary or permanent.</FieldHint>
        </div>

        <div className="bg-ink-950/80 p-4 rounded-lg">
          <h3 className="text-font-semibold text-white mb-2">Navigation visibility</h3>
          <select
            className="h-10 rounded-lg border border-white/10 bg-ink-800 px-3 text-xs text-white outline-none focus:border-gold-500/50"
          >
            <option>Home — visible</option>
            <option>Groups — visible</option>
            <option>Products — visible</option>
            <option>FAQs — visible</option>
            <option>All navigation items hidden</option>
          </select>
          <FieldHint>Control which top-level navigation items are visible on the public site.</FieldHint>
        </div>
      </div>
    </div>
  );
}