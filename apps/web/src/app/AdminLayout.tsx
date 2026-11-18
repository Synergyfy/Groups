import {
  Building2,
  CircleDashed,
  ClipboardList,
  Crown,
  FolderKanban,
  Gauge,
  Handshake,
  KeyRound,
  Layers,
  LayoutDashboard,
  Mail,
  MapPin,
  Megaphone,
  ShieldAlert,
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
        to: "/admin/access-rules",
        label: "Access Rules",
        icon: <KeyRound className="size-4" />,
        end: true,
      },
      {
        to: "/admin/config/group-rules",
        label: "Group Rules",
        icon: <Gauge className="size-4" />,
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
  {
    title: "Operations",
    items: [
      {
        to: "/admin/pending-review",
        label: "Moderation Queue",
        icon: <ShieldAlert className="size-4" />,
        end: true,
      },
      {
        to: "/admin/businesses",
        label: "Businesses",
        icon: <Building2 className="size-4" />,
        end: true,
      },
      {
        to: "/admin/partners",
        label: "Partners",
        icon: <Handshake className="size-4" />,
        end: true,
      },
      {
        to: "/admin/programmes",
        label: "Programmes",
        icon: <Layers className="size-4" />,
        end: true,
      },
      {
        to: "/admin/campaigns",
        label: "Campaigns",
        icon: <Megaphone className="size-4" />,
        end: true,
      },
      {
        to: "/admin/relationships",
        label: "Relationships",
        icon: <Users className="size-4" />,
        end: true,
      },
      {
        to: "/admin/locations",
        label: "Locations",
        icon: <MapPin className="size-4" />,
        end: true,
      },
      {
        to: "/admin/reports",
        label: "Reports",
        icon: <ClipboardList className="size-4" />,
        end: true,
      },
      {
        to: "/admin/audit-log",
        label: "Audit Log",
        icon: <ClipboardList className="size-4" />,
        end: true,
      },
    ],
  },
  {
    title: "Group Configuration",
    items: [
      {
        to: "/admin/config/automatic",
        label: "Automatic Grouping",
        icon: <Gauge className="size-4" />,
        end: true,
      },
      {
        to: "/admin/config/types",
        label: "Group Types",
        icon: <Layers className="size-4" />,
        end: true,
      },
      {
        to: "/admin/config/circles",
        label: "Circle Types",
        icon: <CircleDashed className="size-4" />,
        end: true,
      },
      {
        to: "/admin/config/permissions",
        label: "Permissions",
        icon: <KeyRound className="size-4" />,
        end: true,
      },
      {
        to: "/admin/mandatory-circles",
        label: "Mandatory Circles",
        icon: <CircleDashed className="size-4" />,
        end: true,
      },
      {
        to: "/admin/partner-groups",
        label: "Partner Groups",
        icon: <Handshake className="size-4" />,
        end: true,
      },
      {
        to: "/admin/content",
        label: "Public Content",
        icon: <ClipboardList className="size-4" />,
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
      />
    </AdminDataProvider>
  );
}
