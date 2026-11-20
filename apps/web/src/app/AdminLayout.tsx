import {
  Crown,
  FolderKanban,
  LayoutDashboard,
  Mail,
  SlidersHorizontal,
  Tag,
  Users,
} from "lucide-react";
import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import DashboardShell from "./DashboardShell";
import { AdminDataProvider } from "../admin/AdminDataProvider";
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
        to: "/admin/plans",
        label: "Plans",
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
  { to: "/admin/plans", label: "Plans", icon: <Crown className="size-5" /> },
];

export default function AdminLayout() {
  const { pathname } = useLocation();

  useEffect(() => {
    const section =
      ADMIN_NAV.flatMap((group) => group.items).find(
        (item) =>
          pathname === item.to ||
          (item.to !== "/admin/overview" && pathname.startsWith(`${item.to}/`)),
      )?.label ?? "Admin";
    document.title = `Central Hub Solution | Admin · ${section}`;
  }, [pathname]);

  return (
    <AdminDataProvider>
      <DashboardShell
        sectionLabel="Central Solution Admin"
        nav={ADMIN_NAV}
        bottomNav={ADMIN_BOTTOM_NAV}
        wide
      />
    </AdminDataProvider>
  );
}
