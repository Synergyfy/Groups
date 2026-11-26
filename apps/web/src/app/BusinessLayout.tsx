import {
  CircleDot,
  Compass,
  Crown,
  // Gift,
  Globe,
  MapPin,
  // Megaphone,
  Settings,
  Users,
} from "lucide-react";
import { useEffect, useState } from "react";
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
      // {
      //   to: "/business/campaigns",
      //   label: "Campaigns",
      //   icon: <Megaphone className="size-4" />,
      //   end: true,
      // },
      // { to: "/business/rewards", label: "Rewards", icon: <Gift className="size-4" />, end: true },
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
  // Re-check the time-based expiry while the business is sitting on a page so
  // they are moved back to the plan page as soon as access lapses.
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  // An active plan is required before any dashboard page. Paid access and the
  // accepted agreement are additional gates on top of the active plan — but a
  // Central Hub membership, access pass or trial already covers both.
  const accessExpired =
    plan.status === "Expired" ||
    (plan.accessExpiresAt
      ? new Date(plan.accessExpiresAt).getTime() <= now
      : false);
  const hasActivePlan = plan.status === "Active" && !accessExpired;
  const centralAccess =
    plan.accessSource !== undefined && plan.accessSource !== "local";
  const entered =
    hasActivePlan &&
    (centralAccess ||
      (plan.agreementAccepted &&
        (!rules.requirePaidAccess || plan.paid)));
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
      wide
    />
  );
}
