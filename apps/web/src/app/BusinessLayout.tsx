import {
  CircleDot,
  Compass,
  Crown,
  Gift,
  Globe,
  MapPin,
  Megaphone,
  Settings,
  Users,
} from "lucide-react";
import { Navigate, useLocation } from "react-router-dom";
import DashboardShell from "./DashboardShell";
import type { NavSection } from "./Sidebar";
import type { BottomNavItem } from "./BottomNav";
import { useAppState } from "../store/selectors";

// Business data (profile, plan, groups, invitations, …) is hydrated by
// <BusinessDataProvider> before this layout renders.

const BUSINESS_NAV: NavSection[] = [
  {
    items: [
      {
        to: "/business/groups",
        label: "Group",
        icon: <Users className="size-4" />,
        end: true,
      },
    ],
  },
  {
    title: "Network",
    items: [
      {
        to: "/business/network/lists",
        label: "My Network Lists",
        icon: <Globe className="size-4" />,
        end: true,
      },
      {
        to: "/business/circles",
        label: "Circle",
        icon: <CircleDot className="size-4" />,
        end: true,
      },
    ],
  },
  {
    title: "Central Solution",
    items: [
      {
        to: "/business/community",
        label: "National Community",
        icon: <Users className="size-4" />,
        end: true,
      },
      { to: "/business/location", label: "My Location", icon: <MapPin className="size-4" />, end: true },
      {
        to: "/business/campaigns",
        label: "Campaigns",
        icon: <Megaphone className="size-4" />,
        end: true,
      },
      { to: "/business/rewards", label: "Rewards", icon: <Gift className="size-4" />, end: true },
      {
        to: "/business/plan",
        label: "Plan",
        icon: <Crown className="size-4" />,
        end: true,
      },
      {
        to: "/business/settings",
        label: "Account Settings",
        icon: <Settings className="size-4" />,
        end: true,
      },
    ],
  },
];

const PLAN_ONLY_NAV: NavSection[] = [
  {
    title: "Plan",
    items: [
      {
        to: "/business/plan",
        label: "Choose a plan",
        icon: <Crown className="size-4" />,
        end: true,
      },
    ],
  },
];

const BUSINESS_BOTTOM_NAV: BottomNavItem[] = [
  { to: "/business/groups", label: "Group", icon: <Users className="size-5" />, end: true },
  { to: "/business/groups/explore", label: "Explore", icon: <Compass className="size-5" />, end: true },
  { to: "/business/circles", label: "Circle", icon: <CircleDot className="size-5" />, end: true },
];

export default function BusinessLayout() {
  const { adminConfig, plan } = useAppState();
  const location = useLocation();
  const rules = adminConfig.groupCreationRules;
  // Paid access + accepted agreement are required before dashboard entry.
  const entered =
    plan.agreementAccepted && (!rules.requirePaidAccess || plan.paid);
  const planPath = "/business/plan";
  const onPlanPage =
    location.pathname === planPath ||
    location.pathname.startsWith(`${planPath}/`);

  // Without a plan, the plan page is the only place a business can go.
  if (!entered && !onPlanPage) {
    return <Navigate to={planPath} replace />;
  }

  return (
    <DashboardShell
      sectionLabel={entered ? "Business Dashboard" : "Plan"}
      nav={entered ? BUSINESS_NAV : PLAN_ONLY_NAV}
      bottomNav={entered ? BUSINESS_BOTTOM_NAV : undefined}
    />
  );
}
