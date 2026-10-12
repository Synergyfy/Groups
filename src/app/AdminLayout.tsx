import {
  ChartColumn,
  ChartPie,
  CircleDot,
  Handshake,
  Inbox,
  ListChecks,
  MapPin,
  ScrollText,
  ShieldAlert,
  Shield,
  SlidersHorizontal,
  Users,
  Building2,
  BadgePercent,
  Megaphone,
  Link2,
  FileText,
} from "lucide-react";
import DashboardShell from "./DashboardShell";
import type { NavSection } from "./Sidebar";
import type { BottomNavItem } from "./BottomNav";

const ADMIN_NAV: NavSection[] = [
  {
    title: "Group Management",
    items: [
      { to: "/admin/groups", label: "Group Overview", icon: <ChartColumn className="size-4" /> },
      { to: "/admin/groups/all", label: "All Groups", icon: <Users className="size-4" />, end: true },
      { to: "/admin/pending-review", label: "Moderation Queue", icon: <ShieldAlert className="size-4" />, end: true },
      { to: "/admin/invitations", label: "Invitations & Requests", icon: <Inbox className="size-4" />, end: true },
    ],
  },
  {
    title: "Partner & Business",
    items: [
      { to: "/admin/partners", label: "Partners", icon: <Handshake className="size-4" />, end: true },
      { to: "/admin/businesses", label: "Business Directory", icon: <Building2 className="size-4" />, end: true },
      { to: "/admin/programmes", label: "Programmes", icon: <BadgePercent className="size-4" />, end: true },
      { to: "/admin/campaigns", label: "Campaigns", icon: <Megaphone className="size-4" />, end: true },
      { to: "/admin/relationships", label: "Relationships", icon: <Link2 className="size-4" />, end: true },
    ],
  },
  {
    title: "Configuration",
    items: [
      { to: "/admin/config/automatic", label: "Automatic Grouping", icon: <SlidersHorizontal className="size-4" />, end: true },
      { to: "/admin/config/types", label: "Group Types & Rules", icon: <ListChecks className="size-4" />, end: true },
      { to: "/admin/config/circles", label: "Circle Types", icon: <CircleDot className="size-4" />, end: true },
      { to: "/admin/config/permissions", label: "Permissions Matrix", icon: <Shield className="size-4" />, end: true },
      { to: "/admin/locations", label: "Location Relationships", icon: <MapPin className="size-4" />, end: true },
      { to: "/admin/mandatory-circles", label: "Mandatory Circles", icon: <CircleDot className="size-4" />, end: true },
    ],
  },
  {
    title: "Platform",
    items: [
      { to: "/admin/reports", label: "Reports & Statistics", icon: <ChartPie className="size-4" />, end: true },
      { to: "/admin/audit-log", label: "Audit Log", icon: <ScrollText className="size-4" />, end: true },
      { to: "/admin/content", label: "Website Content", icon: <FileText className="size-4" />, end: true },
    ],
  },
];

const ADMIN_BOTTOM_NAV: BottomNavItem[] = [
  { to: "/admin/groups", label: "Overview", icon: <ChartColumn className="size-5" /> },
  { to: "/admin/groups/all", label: "Groups", icon: <Users className="size-5" /> },
  { to: "/admin/partners", label: "Partners", icon: <Handshake className="size-5" /> },
  { to: "/admin/audit-log", label: "Audit", icon: <ScrollText className="size-5" /> },
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
