import {
  Crown,
  FolderKanban,
  KeyRound,
  LayoutDashboard,
  Mail,
  SlidersHorizontal,
  Tag,
  Users,
} from "lucide-react";
import DashboardShell from "./DashboardShell";
import type { NavSection } from "./Sidebar";
import type { BottomNavItem } from "./BottomNav";

const ADMIN_NAV: NavSection[] = [
  {
    title: "Admin Dashboard",
    items: [
      {
        to: "/admin/overview",
        label: "Overview",
        icon: <LayoutDashboard className="size-4" />,
        end: true,
      },
      {
        to: "/admin/users",
        label: "Users",
        icon: <Users className="size-4" />,
        end: true,
      },
      {
        to: "/admin/groups",
        label: "Groups",
        icon: <FolderKanban className="size-4" />,
      },
      {
        to: "/admin/invitations",
        label: "Invitations",
        icon: <Mail className="size-4" />,
        end: true,
      },
      {
        to: "/admin/access-rules",
        label: "Access Rules",
        icon: <KeyRound className="size-4" />,
        end: true,
      },
      {
        to: "/admin/memberships",
        label: "Memberships",
        icon: <Crown className="size-4" />,
        end: true,
      },
      {
        to: "/admin/rewards-deals",
        label: "Rewards and Deals",
        icon: <Tag className="size-4" />,
        end: true,
      },
      {
        to: "/admin/settings-reports",
        label: "Settings and Reports",
        icon: <SlidersHorizontal className="size-4" />,
        end: true,
      },
    ],
  },
];

const ADMIN_BOTTOM_NAV: BottomNavItem[] = [
  { to: "/admin/overview", label: "Overview", icon: <LayoutDashboard className="size-5" /> },
  { to: "/admin/users", label: "Users", icon: <Users className="size-5" /> },
  { to: "/admin/groups", label: "Groups", icon: <FolderKanban className="size-5" /> },
  { to: "/admin/invitations", label: "Invites", icon: <Mail className="size-5" /> },
  { to: "/admin/memberships", label: "Members", icon: <Crown className="size-5" /> },
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
