import { useEffect } from "react";
import {
  CircleDot,
  Compass,
  Gift,
  Globe,
  MapPin,
  Megaphone,
  Settings,
  Users,
} from "lucide-react";
import DashboardShell from "./DashboardShell";
import type { NavSection } from "./Sidebar";
import type { BottomNavItem } from "./BottomNav";
import MembershipAgreementPage from "../features/membership/MembershipAgreementPage";
import { CURRENT_BUSINESS } from "../data/businessData";
import { useAppStore } from "../store/context";
import { useCanCreateGroups, usePlatformGroup } from "../store/selectors";

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
        to: "/business/settings",
        label: "Account Settings",
        icon: <Settings className="size-4" />,
        end: true,
      },
    ],
  },
];

const BUSINESS_BOTTOM_NAV: BottomNavItem[] = [
  { to: "/business/groups", label: "Group", icon: <Users className="size-5" />, end: true },
  { to: "/business/groups/explore", label: "Explore", icon: <Compass className="size-5" /> },
  { to: "/business/circles", label: "Circle", icon: <CircleDot className="size-5" /> },
];

export default function BusinessLayout() {
  const { state, dispatch } = useAppStore();
  const rules = state.adminConfig.groupCreationRules;
  const membership = state.membership;
  const canCreate = useCanCreateGroups();
  const platformGroup = usePlatformGroup();

  // Paid access + accepted agreement are required before dashboard entry.
  const entered =
    membership.agreementAccepted && (!rules.requirePaidAccess || membership.paid);

  // On entry the dashboard hands over its pre-populated, incomplete
  // "head start" groups (idempotent — a no-op once they exist).
  useEffect(() => {
    if (!entered) return;
    dispatch({ type: "group/head-start" });
  }, [entered, dispatch]);

  // Members without creation rights are placed into the admin-set platform
  // group instead of creating their own.
  const platformMember = platformGroup?.memberIds.includes(membership.ownerId) ?? false;
  const platformGroupId = platformGroup?.id ?? null;
  const placeInPlatformGroup =
    entered &&
    !canCreate &&
    rules.restrictToPlatformGroup &&
    platformGroupId !== null &&
    !platformMember;

  useEffect(() => {
    if (!placeInPlatformGroup || !platformGroupId) return;
    dispatch({
      type: "group/add-member",
      groupId: platformGroupId,
      member: { id: membership.ownerId, name: CURRENT_BUSINESS.businessName },
      actor: { id: "admin", name: "Administrator" },
    });
  }, [placeInPlatformGroup, platformGroupId, membership.ownerId, dispatch]);

  if (!entered) {
    return <MembershipAgreementPage />;
  }

  return (
    <DashboardShell
      sectionLabel="Business Dashboard"
      nav={BUSINESS_NAV}
      bottomNav={BUSINESS_BOTTOM_NAV}
    />
  );
}
