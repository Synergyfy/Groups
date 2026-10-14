import { useState } from "react";
import {
  CheckCircle2,
  Eye,
  EyeOff,
  Gift,
  Percent,
  Plus,
  Sparkles,
  Ticket,
} from "lucide-react";
import Badge from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import Card, { CardBody } from "../../components/ui/Card";
import SectionHeader from "../../components/ui/SectionHeader";
import StatCard from "../../components/ui/StatCard";
import Table, { type TableColumn } from "../../components/ui/Table";
import Toast from "../../components/ui/Toast";
import Modal from "../../components/ui/Modal";

export type DealCategory = "voucher" | "gift-card" | "coupon" | "incentive";

interface RewardDeal {
  id: string;
  title: string;
  category: DealCategory;
  discountValue: string;
  code?: string;
  targetAudience: "All Users" | "Consumers Only" | "Business Owners" | "Gold & Platinum";
  liveOnFrontend: boolean;
  status: "Active" | "Draft" | "Expired";
  expiryDate: string;
  claimsCount: number;
  maxClaims: number;
  sponsorBusiness: string;
}

const INITIAL_DEALS: RewardDeal[] = [
  {
    id: "deal-001",
    title: "£25 Welcome Voucher",
    category: "voucher",
    discountValue: "£25.00 Off",
    code: "WELCOME25",
    targetAudience: "All Users",
    liveOnFrontend: true,
    status: "Active",
    expiryDate: "2026-12-31",
    claimsCount: 84,
    maxClaims: 200,
    sponsorBusiness: "City Foods",
  },
  {
    id: "deal-002",
    title: "£50 Local Dining Gift Card",
    category: "gift-card",
    discountValue: "£50 Card",
    code: "DINE50",
    targetAudience: "Consumers Only",
    liveOnFrontend: true,
    status: "Active",
    expiryDate: "2026-11-30",
    claimsCount: 39,
    maxClaims: 100,
    sponsorBusiness: "Urban Events",
  },
  {
    id: "deal-003",
    title: "20% Seasonal Flash Coupon",
    category: "coupon",
    discountValue: "20% Off",
    code: "FLASH20",
    targetAudience: "All Users",
    liveOnFrontend: true,
    status: "Active",
    expiryDate: "2026-10-31",
    claimsCount: 142,
    maxClaims: 500,
    sponsorBusiness: "Green Market",
  },
  {
    id: "deal-004",
    title: "5% Local Loyalty Cashback",
    category: "incentive",
    discountValue: "5% Cashback",
    targetAudience: "Consumers Only",
    liveOnFrontend: true,
    status: "Active",
    expiryDate: "2026-12-31",
    claimsCount: 215,
    maxClaims: 1000,
    sponsorBusiness: "Fresh Living",
  },
  {
    id: "deal-005",
    title: "B2B Marketing Grant Voucher",
    category: "voucher",
    discountValue: "£100 Credit",
    code: "BIZGRANT100",
    targetAudience: "Business Owners",
    liveOnFrontend: true,
    status: "Active",
    expiryDate: "2026-12-15",
    claimsCount: 18,
    maxClaims: 50,
    sponsorBusiness: "Central Solution Admin",
  },
  {
    id: "deal-006",
    title: "VIP Gold Partner Incentive",
    category: "incentive",
    discountValue: "Double Points",
    targetAudience: "Gold & Platinum",
    liveOnFrontend: false,
    status: "Draft",
    expiryDate: "2027-01-31",
    claimsCount: 0,
    maxClaims: 250,
    sponsorBusiness: "Smith Business",
  },
];

const CATEGORY_ICONS: Record<DealCategory, React.ReactNode> = {
  voucher: <Ticket className="size-4 text-gold-400" />,
  "gift-card": <Gift className="size-4 text-emerald-400" />,
  coupon: <Percent className="size-4 text-sky-400" />,
  incentive: <Sparkles className="size-4 text-amber-400" />,
};

const CATEGORY_LABELS: Record<DealCategory, string> = {
  voucher: "Voucher",
  "gift-card": "Gift Card",
  coupon: "Coupon Deal",
  incentive: "Incentive / Cashback",
};

export default function AdminRewardsDealsPage() {
  const [deals, setDeals] = useState<RewardDeal[]>(INITIAL_DEALS);
  const [activeTab, setActiveTab] = useState<"all" | DealCategory>("all");
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  // Form state
  const [newTitle, setNewTitle] = useState("");
  const [newCategory, setNewCategory] = useState<DealCategory>("voucher");
  const [newDiscount, setNewDiscount] = useState("");
  const [newCode, setNewCode] = useState("");
  const [newAudience, setNewAudience] = useState<RewardDeal["targetAudience"]>("All Users");
  const [newSponsor, setNewSponsor] = useState("Central Solution Network");
  const [newMaxClaims, setNewMaxClaims] = useState(100);

  const toggleFrontendVisibility = (id: string) => {
    setDeals((prev) =>
      prev.map((d) => {
        if (d.id === id) {
          const next = !d.liveOnFrontend;
          setFeedback(
            `Deal "${d.title}" is now ${next ? "LIVE on the frontend" : "HIDDEN from users"}.`
          );
          return { ...d, liveOnFrontend: next };
        }
        return d;
      })
    );
  };

  const handleCreateDeal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newDiscount.trim()) {
      setFeedback("Please enter title and discount value.");
      return;
    }

    const created: RewardDeal = {
      id: `deal-${Date.now()}`,
      title: newTitle.trim(),
      category: newCategory,
      discountValue: newDiscount.trim(),
      code: newCode.trim() || undefined,
      targetAudience: newAudience,
      liveOnFrontend: true,
      status: "Active",
      expiryDate: "2026-12-31",
      claimsCount: 0,
      maxClaims: newMaxClaims,
      sponsorBusiness: newSponsor.trim(),
    };

    setDeals((prev) => [created, ...prev]);
    setFeedback(`Deal "${created.title}" configured and published live!`);
    setCreateModalOpen(false);
    setNewTitle("");
    setNewDiscount("");
    setNewCode("");
  };

  const liveCount = deals.filter((d) => d.liveOnFrontend).length;
  const totalClaims = deals.reduce((s, d) => s + d.claimsCount, 0);

  const filteredDeals = deals.filter((d) => {
    if (activeTab !== "all" && d.category !== activeTab) return false;
    return true;
  });

  const columns: TableColumn<RewardDeal>[] = [
    {
      key: "title",
      header: "Reward / Deal",
      render: (d) => (
        <div className="flex items-center gap-2.5">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-ink-800">
            {CATEGORY_ICONS[d.category]}
          </div>
          <div className="min-w-0">
            <p className="truncate text-xs font-semibold text-white">{d.title}</p>
            <p className="truncate text-[11px] text-slate-500">
              Sponsor: {d.sponsorBusiness} {d.code && `· Code: ${d.code}`}
            </p>
          </div>
        </div>
      ),
    },
    {
      key: "category",
      header: "Category",
      render: (d) => <Badge variant="default">{CATEGORY_LABELS[d.category]}</Badge>,
    },
    {
      key: "value",
      header: "Discount / Value",
      render: (d) => <span className="font-semibold text-gold-300 text-xs">{d.discountValue}</span>,
    },
    {
      key: "audience",
      header: "Target Audience",
      render: (d) => (
        <Badge
          variant={
            d.targetAudience === "Consumers Only"
              ? "info"
              : d.targetAudience === "Gold & Platinum"
                ? "gold"
                : "default"
          }
        >
          {d.targetAudience}
        </Badge>
      ),
    },
    {
      key: "claims",
      header: "Claims / Cap",
      render: (d) => (
        <div className="flex flex-col text-xs">
          <span className="text-white font-medium">
            {d.claimsCount} / {d.maxClaims}
          </span>
          <div className="h-1 w-20 rounded-full bg-ink-800 mt-1 overflow-hidden">
            <div
              className="h-full bg-gold-400"
              style={{ width: `${Math.min(100, (d.claimsCount / d.maxClaims) * 100)}%` }}
            />
          </div>
        </div>
      ),
    },
    {
      key: "live",
      header: "Frontend Visibility",
      render: (d) => (
        <button
          type="button"
          onClick={() => toggleFrontendVisibility(d.id)}
          className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-medium transition-colors ${
            d.liveOnFrontend
              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20"
              : "border-white/10 bg-white/5 text-slate-400 hover:text-white"
          }`}
        >
          {d.liveOnFrontend ? (
            <>
              <Eye className="size-3.5" /> Live on Frontend
            </>
          ) : (
            <>
              <EyeOff className="size-3.5" /> Hidden / Draft
            </>
          )}
        </button>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <SectionHeader
        title="Rewards and Deals"
        subtitle="Configure vouchers, gift cards, coupon deals, offers and incentives; control what appears on the frontend and ensure offers are available to users."
        tip="Admin controls dictate which offers appear in the business and consumer portals."
        actions={
          <Button variant="primary" size="sm" onClick={() => setCreateModalOpen(true)}>
            <Plus className="size-4" /> Add Reward / Deal
          </Button>
        }
      />

      {/* --- Stat Cards ------------------------------------------------ */}
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <StatCard
          label="Total configured deals"
          value={deals.length}
          hint="Vouchers, cards & discounts"
          accent="gold"
        />
        <StatCard
          label="Live on frontend"
          value={liveCount}
          hint="Visible to members right now"
          accent="success"
        />
        <StatCard
          label="Total redemptions"
          value={totalClaims}
          hint="Claimed by business & consumers"
          accent="info"
        />
        <StatCard
          label="Frontend delivery"
          value="100% Operational"
          hint="Syncing to /rewards"
          accent="gold"
        />
      </div>

      {/* --- Guidance Card ---------------------------------------------- */}
      <div className="flex items-start gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4">
        <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-emerald-400" />
        <div>
          <p className="text-xs font-semibold text-emerald-300">
            Frontend Offer Distribution Verified
          </p>
          <p className="mt-1 text-[11px] leading-relaxed text-slate-300">
            Offers marked <strong>Live on Frontend</strong> are delivered directly into the business
            and consumer reward hubs. Consumers in consumer groups receive vouchers and gift cards,
            while business owners access B2B grants and marketing vouchers according to tier.
          </p>
        </div>
      </div>

      {/* --- Tabs & Deals Table ----------------------------------------- */}
      <Card>
        <CardBody className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-1.5 border-b border-white/10 pb-3">
            {[
              { id: "all", label: "All Rewards & Deals", count: deals.length },
              { id: "voucher", label: "Vouchers", count: deals.filter((d) => d.category === "voucher").length },
              { id: "gift-card", label: "Gift Cards", count: deals.filter((d) => d.category === "gift-card").length },
              { id: "coupon", label: "Coupon Deals", count: deals.filter((d) => d.category === "coupon").length },
              { id: "incentive", label: "Incentives / Cashback", count: deals.filter((d) => d.category === "incentive").length },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as any)}
                className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                  activeTab === tab.id
                    ? "bg-gold-500/15 text-gold-300 border border-gold-500/30"
                    : "text-slate-400 hover:bg-white/5 hover:text-white"
                }`}
              >
                <span>{tab.label}</span>
                <span className="rounded-full bg-white/10 px-1.5 py-0.2 text-[10px] text-slate-300">
                  {tab.count}
                </span>
              </button>
            ))}
          </div>

          <Table
            columns={columns}
            rows={filteredDeals}
            rowKey={(d) => d.id}
            emptyMessage="No deals configured under this category."
          />
        </CardBody>
      </Card>

      {/* --- Create Deal Modal ------------------------------------------ */}
      {createModalOpen && (
        <Modal open={createModalOpen} title="Configure New Reward or Deal" onClose={() => setCreateModalOpen(false)}>
          <form onSubmit={handleCreateDeal} className="flex flex-col gap-4">
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-medium text-slate-300">Deal Title</span>
              <input
                type="text"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="e.g. £30 Community Shopping Voucher"
                className="h-10 rounded-lg border border-white/10 bg-ink-800 px-3 text-xs text-white focus:border-gold-500/50 focus:outline-none"
                required
              />
            </label>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-medium text-slate-300">Category</span>
                <select
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value as DealCategory)}
                  className="h-10 rounded-lg border border-white/10 bg-ink-800 px-3 text-xs text-slate-200 focus:outline-none"
                >
                  <option value="voucher">Voucher</option>
                  <option value="gift-card">Gift Card</option>
                  <option value="coupon">Coupon Deal</option>
                  <option value="incentive">Incentive / Cashback</option>
                </select>
              </label>

              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-medium text-slate-300">Discount / Value</span>
                <input
                  type="text"
                  value={newDiscount}
                  onChange={(e) => setNewDiscount(e.target.value)}
                  placeholder="e.g. 15% Off or £20 Card"
                  className="h-10 rounded-lg border border-white/10 bg-ink-800 px-3 text-xs text-white focus:outline-none"
                  required
                />
              </label>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-medium text-slate-300">Promo Code (Optional)</span>
                <input
                  type="text"
                  value={newCode}
                  onChange={(e) => setNewCode(e.target.value.toUpperCase())}
                  placeholder="e.g. SAVE20"
                  className="h-10 rounded-lg border border-white/10 bg-ink-800 px-3 text-xs text-white focus:outline-none"
                />
              </label>

              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-medium text-slate-300">Target Audience</span>
                <select
                  value={newAudience}
                  onChange={(e) => setNewAudience(e.target.value as any)}
                  className="h-10 rounded-lg border border-white/10 bg-ink-800 px-3 text-xs text-slate-200 focus:outline-none"
                >
                  <option value="All Users">All Users (Network-wide)</option>
                  <option value="Consumers Only">Consumers Only</option>
                  <option value="Business Owners">Business Owners</option>
                  <option value="Gold & Platinum">Gold &amp; Platinum Members</option>
                </select>
              </label>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-medium text-slate-300">Sponsor Business</span>
                <input
                  type="text"
                  value={newSponsor}
                  onChange={(e) => setNewSponsor(e.target.value)}
                  className="h-10 rounded-lg border border-white/10 bg-ink-800 px-3 text-xs text-white focus:outline-none"
                />
              </label>

              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-medium text-slate-300">Maximum Claims Cap</span>
                <input
                  type="number"
                  value={newMaxClaims}
                  onChange={(e) => setNewMaxClaims(Number(e.target.value))}
                  min={1}
                  className="h-10 rounded-lg border border-white/10 bg-ink-800 px-3 text-xs text-white focus:outline-none"
                />
              </label>
            </div>

            <div className="mt-2 flex justify-end gap-2">
              <Button variant="ghost" size="sm" type="button" onClick={() => setCreateModalOpen(false)}>
                Cancel
              </Button>
              <Button variant="primary" size="sm" type="submit">
                Publish Deal
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {feedback && <Toast message={feedback} onDismiss={() => setFeedback(null)} />}
    </div>
  );
}
