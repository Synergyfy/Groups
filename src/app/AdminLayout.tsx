import {
  ChartColumn,
  ChartPie,
  CircleDot,
  Handshake,
  Inbox,
  ListChecks,
  MapPin,
  SlidersHorizontal,
  Users,
} from "lucide-react";
import DashboardShell from "./DashboardShell";
import type { NavSection } from "./Sidebar";
import type { BottomNavItem } from "./BottomNav";

const ADMIN_NAV: NavSection[] = [
  {
    title: "Group Management",
    items: [
      {
        to: "/admin/groups",
        label: "Group Overview",
        icon: <ChartColumn className="size-4" />,
      },
      { to: "/admin/groups/all", label: "All Groups", icon: <Users className="size-4" />, end: true },
      {
        to: "/admin/invitations",
        label: "Invitations & Requests",
        icon: <Inbox className="size-4" />,
        end: true,
      },
    ],
  },
  {
    title: "Configuration",
    items: [
      {
        to: "/admin/config/automatic",
        label: "Automatic Grouping",
        icon: <SlidersHorizontal className="size-4" />,
        end: true,
      },
      {
        to: "/admin/config/types",
        label: "Group Types & Rules",
        icon: <ListChecks className="size-4" />,
        end: true,
      },
      {
        to: "/admin/locations",
        label: "Location Relationships",
        icon: <MapPin className="size-4" />,
        end: true,
      },
      {
        to: "/admin/partner-groups",
        label: "Partner Groups",
        icon: <Handshake className="size-4" />,
        end: true,
      },
      {
        to: "/admin/mandatory-circles",
        label: "Mandatory Circles",
        icon: <CircleDot className="size-4" />,
        end: true,
      },
    ],
  },
  {
    title: "Reporting",
    items: [
      {
        to: "/admin/reports",
        label: "Reports & Statistics",
        icon: <ChartPie className="size-4" />,
        end: true,
      },
    ],
  },
];

const ADMIN_BOTTOM_NAV: BottomNavItem[] = [
  { to: "/admin/groups", label: "Overview", icon: <ChartColumn className="size-5" /> },
  { to: "/admin/groups/all", label: "Groups", icon: <Users className="size-5" /> },
  { to: "/admin/invitations", label: "Inbox", icon: <Inbox className="size-5" /> },
  { to: "/admin/reports", label: "Reports", icon: <ChartPie className="size-5" /> },
];

export default function AdminLayout() {
  return (
    <DashboardShell
      sectionLabel="Central Solution Admin"
      nav={ADMIN_NAV}
      bottomNav={ADMIN_BOTTOM_NAV}
    />
  );
}
