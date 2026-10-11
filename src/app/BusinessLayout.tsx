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
  return (
    <DashboardShell
      sectionLabel="Business Dashboard"
      nav={BUSINESS_NAV}
      bottomNav={BUSINESS_BOTTOM_NAV}
    />
  );
}
