import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  Compass,
  Inbox,
  Sparkles,
  Users,
} from "lucide-react";
import Avatar from "../../components/ui/Avatar";
import Badge from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import Card, { CardBody } from "../../components/ui/Card";
import ChsLogo from "../../components/ui/ChsLogo";
import { readAuthSession } from "../../app/authSession";
import { useAppState } from "../../store/selectors";
import { memberCountOf } from "./groupUtils";
import {
  evaluateGroupEligibility,
  inferCityFromPostcode,
  type UserEligibilityProfile,
} from "./groupEligibility";
import type { Group, Invitation } from "../../domain/types";

interface CentralNode {
  id: string;
  name: string;
  kind: "joined" | "invitation" | "recommended";
  group: Group;
  invitation?: Invitation;
  x: number;
  y: number;
}

export default function CentralCirclePage() {
  const navigate = useNavigate();
  const state = useAppState();
  const session = readAuthSession();

  const [selectedNode, setSelectedNode] = useState<CentralNode | null>(null);

  const activeUser: UserEligibilityProfile = useMemo(() => {
    if (session?.authenticated) {
      return {
        id: session.accountId || session.email || "demo-user",
        name: session.name || "Member",
        accountType: session.role === "business" ? "business" : "consumer",
        city: session.city || inferCityFromPostcode(session.postcode) || "Birmingham",
        postcode: session.postcode,
        sector: session.sector,
        businessName: session.businessName,
      };
    }
    return {
      id: "demo-user",
      name: "Guest Explorer",
      accountType: "consumer",
      city: "Birmingham",
      postcode: "B1 1AA",
    };
  }, [session]);

  // Joined groups
  const myJoinedGroups = useMemo(() => {
    return state.groups.filter(
      (g) =>
        g.status !== "Closed" &&
        (g.memberIds.includes(activeUser.id) ||
          g.ownerId === activeUser.id ||
          (activeUser.id === "biz-smith" && g.memberIds.includes("biz-smith")))
    );
  }, [state.groups, activeUser.id]);

  // Pending invitations
  const pendingInvites = useMemo(() => {
    return state.invitations.filter(
      (inv) =>
        (inv.inviteeId === activeUser.id || inv.inviteeEmail === session?.email) &&
        inv.status === "pending"
    );
  }, [state.invitations, activeUser.id, session?.email]);

  // Eligible recommended groups
  const recommendedGroups = useMemo(() => {
    return state.groups
      .map((g) => evaluateGroupEligibility(g, activeUser, state.invitations))
      .filter((res) => res.isEligible && res.status !== "joined")
      .slice(0, 4)
      .map((res) => res.group);
  }, [state.groups, activeUser]);

  // Assemble orbital nodes
  const nodes: CentralNode[] = useMemo(() => {
    const list: Omit<CentralNode, "x" | "y">[] = [];

    // Joined groups (Emerald)
    myJoinedGroups.forEach((g) => {
      list.push({ id: `j-${g.id}`, name: g.name, kind: "joined", group: g });
    });

    // Pending invites (Gold)
    pendingInvites.forEach((inv) => {
      const g = state.groups.find((grp) => grp.id === inv.groupId) || {
        id: inv.groupId || "grp-inv",
        name: "Invited Group",
        type: "Seasonal" as any,
        source: "user-created" as any,
        purpose: "Group invitation",
        ownerId: inv.invitedById,
        ownerName: inv.invitedByName,
        memberIds: [inv.invitedById],
        status: "Active" as any,
        accessType: "open" as any,
        createdAt: "2026-09-01",
      };
      list.push({ id: `inv-${inv.id}`, name: g.name, kind: "invitation", group: g, invitation: inv });
    });

    // Recommended local groups (Sky)
    recommendedGroups.forEach((g) => {
      if (!list.some((item) => item.group.id === g.id)) {
        list.push({ id: `rec-${g.id}`, name: g.name, kind: "recommended", group: g });
      }
    });

    // Place symmetrically along an orbital ring (radius 38%)
    const count = list.length;
    const radius = 38;

    return list.map((item, i) => {
      const angle = ((360 / Math.max(count, 1)) * i - 90) * (Math.PI / 180);
      return {
        ...item,
        x: 50 + radius * Math.cos(angle),
        y: 50 + radius * Math.sin(angle),
      };
    });
  }, [myJoinedGroups, pendingInvites, recommendedGroups, state.groups]);

  return (
    <div className="min-h-screen bg-ink-950 text-slate-100 pb-16">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-white/10 bg-ink-950/90 backdrop-blur-md">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-3 px-4 py-3">
          <div className="flex items-center gap-3">
            <Link
              to="/groups/access"
              className="flex size-8 items-center justify-center rounded-lg border border-white/10 bg-ink-900 text-slate-300 hover:text-white transition-colors"
              title="Back to Group Access Dashboard"
            >
              <ArrowLeft className="size-4" />
            </Link>
            <ChsLogo size="sm" linkTo="/groups/access" />
          </div>

          <Link
            to="/groups/access"
            className="inline-flex items-center gap-1.5 text-xs text-gold-300 hover:underline"
          >
            Dashboard <ArrowRight className="size-3" />
          </Link>
        </div>
      </header>

      {/* Main Circle Canvas */}
      <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 pt-6 sm:px-6">
        <div className="text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-gold-500/15 border border-gold-500/30 px-3 py-1 text-[11px] font-semibold text-gold-300">
            <Sparkles className="size-3 text-gold-400" /> Interactive Network
          </span>
          <h1 className="mt-2 text-2xl font-extrabold text-white">My Central Circle</h1>
          <p className="mt-1 text-xs text-slate-400 max-w-md mx-auto">
            You are at the core of your community. Orbiting nodes represent your joined groups, pending invites, and local neighborhood connections.
          </p>
        </div>

        {/* Circular Orbital Diagram */}
        <div className="relative mx-auto aspect-square w-full max-w-[540px] select-none rounded-3xl border border-white/10 bg-gradient-to-b from-ink-900/90 via-ink-950 to-ink-950 p-4 shadow-2xl overflow-hidden">
          {/* Animated concentric rings */}
          <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
            <div className="absolute inset-[10%] rounded-full border border-dashed border-white/10 animate-spin-slow opacity-60" />
            <div className="absolute inset-[24%] rounded-full border border-white/10" />
            <div className="absolute inset-[38%] rounded-full border border-dashed border-gold-500/20" />
            <div className="absolute left-1/2 top-1/2 size-48 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(230,169,43,0.18)_0%,transparent_70%)]" />
          </div>

          {/* SVG Spokes connecting User to Orbiting Nodes */}
          <svg className="absolute inset-0 size-full pointer-events-none" xmlns="http://www.w3.org/2000/svg">
            {nodes.map((node) => (
              <line
                key={`line-${node.id}`}
                x1="50%"
                y1="50%"
                x2={`${node.x}%`}
                y2={`${node.y}%`}
                stroke={
                  selectedNode?.id === node.id
                    ? "#e6a92b"
                    : node.kind === "joined"
                    ? "rgba(52, 211, 153, 0.3)"
                    : node.kind === "invitation"
                    ? "rgba(230, 169, 43, 0.4)"
                    : "rgba(56, 189, 248, 0.25)"
                }
                strokeWidth={selectedNode?.id === node.id ? "2" : "1"}
                strokeDasharray={selectedNode?.id === node.id ? undefined : "3 3"}
              />
            ))}
          </svg>

          {/* CENTER CORE: YOU */}
          <div className="absolute left-1/2 top-1/2 z-30 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center">
            <div className="relative flex size-16 items-center justify-center rounded-full ring-4 ring-gold-400 bg-ink-900 shadow-[0_0_35px_rgba(230,169,43,0.45)]">
              <Avatar id={activeUser.id} name={activeUser.name} className="size-full rounded-full text-base font-bold text-white" />
              <span className="absolute -top-1 -right-1 flex size-5 items-center justify-center rounded-full bg-gold-500 text-ink-950 font-bold shadow-md">
                ★
              </span>
            </div>
            <span className="mt-1.5 max-w-[120px] truncate rounded-full border border-gold-500/40 bg-ink-900/90 px-2 py-0.5 text-[10px] font-bold text-gold-300">
              {activeUser.name}
            </span>
            <span className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider">
              Central Core
            </span>
          </div>

          {/* ORBITING NODES */}
          {nodes.map((node) => {
            const isSelected = selectedNode?.id === node.id;
            return (
              <div
                key={node.id}
                className={`absolute -translate-x-1/2 -translate-y-1/2 ${isSelected ? "z-40" : "z-20"}`}
                style={{ left: `${node.x}%`, top: `${node.y}%` }}
              >
                <button
                  type="button"
                  onClick={() => setSelectedNode(node)}
                  className={`group relative flex size-11 cursor-pointer items-center justify-center rounded-full border bg-ink-900 text-xs font-bold transition-all duration-200 hover:scale-115 focus:outline-none ${
                    isSelected
                      ? "ring-2 ring-gold-400 scale-110 border-gold-400 text-white"
                      : node.kind === "joined"
                      ? "border-emerald-500/50 text-emerald-300 hover:border-emerald-400"
                      : node.kind === "invitation"
                      ? "border-amber-500/60 text-amber-300 hover:border-amber-400"
                      : "border-sky-500/50 text-sky-300 hover:border-sky-400"
                  }`}
                  title={`${node.name} (${node.kind})`}
                >
                  {node.kind === "joined" ? (
                    <Users className="size-5" />
                  ) : node.kind === "invitation" ? (
                    <Inbox className="size-5" />
                  ) : (
                    <Compass className="size-5" />
                  )}

                  <span
                    className={`absolute -bottom-1 -right-0.5 size-2.5 rounded-full ring-2 ring-ink-950 ${
                      node.kind === "joined"
                        ? "bg-emerald-400"
                        : node.kind === "invitation"
                        ? "bg-amber-400"
                        : "bg-sky-400"
                    }`}
                  />
                </button>
                <span className="mt-1 block max-w-[85px] truncate text-center text-[9px] font-medium text-slate-300">
                  {node.name.split(" ")[0]}
                </span>
              </div>
            );
          })}
        </div>

        {/* Selected Node Inspector Card */}
        {selectedNode && (
          <Card className="border border-gold-500/30 bg-ink-900/95 shadow-xl max-w-lg mx-auto w-full">
            <CardBody className="p-4 flex flex-col gap-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-white">{selectedNode.group.name}</h3>
                    <Badge
                      variant={
                        selectedNode.kind === "joined"
                          ? "success"
                          : selectedNode.kind === "invitation"
                          ? "gold"
                          : "info"
                      }
                    >
                      {selectedNode.kind === "joined"
                        ? "Joined Group"
                        : selectedNode.kind === "invitation"
                        ? "Pending Invitation"
                        : "Nearby Community"}
                    </Badge>
                  </div>
                  <p className="mt-1 text-xs text-slate-300 leading-relaxed">
                    {selectedNode.group.purpose}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-400 border-t border-white/5 pt-2">
                <p>
                  Owner: <strong className="text-white">{selectedNode.group.ownerName}</strong>
                </p>
                <p>
                  Location: <strong className="text-white">{selectedNode.group.location?.city || "National"}</strong>
                </p>
                <p>
                  Members: <strong className="text-white">{memberCountOf(selectedNode.group)}</strong>
                </p>
                <p>
                  Access: <strong className="text-white capitalize">{selectedNode.group.accessType}</strong>
                </p>
              </div>

              <div className="flex justify-end gap-2 pt-1 border-t border-white/5">
                <Button variant="ghost" size="sm" onClick={() => setSelectedNode(null)}>
                  Close
                </Button>
                {selectedNode.kind === "joined" ? (
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => navigate(`/groups/access`)}
                  >
                    Open in Dashboard
                  </Button>
                ) : (
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => navigate(`/groups/access?invitationId=${selectedNode.invitation?.id || ""}`)}
                  >
                    View in Dashboard <ArrowRight className="size-3.5" />
                  </Button>
                )}
              </div>
            </CardBody>
          </Card>
        )}

        {/* Legend */}
        <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs text-slate-400">
          <span className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-full bg-gold-400" />
            ★ Central Core (You)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-full bg-emerald-400" />
            Joined Groups ({myJoinedGroups.length})
          </span>
          <span className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-full bg-amber-400" />
            Invitations ({pendingInvites.length})
          </span>
          <span className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-full bg-sky-400" />
            Available Near You ({recommendedGroups.length})
          </span>
        </div>
      </main>
    </div>
  );
}
