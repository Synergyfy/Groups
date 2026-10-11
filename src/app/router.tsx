import { Navigate, createBrowserRouter, type RouteObject } from "react-router-dom";
import BusinessLayout from "./BusinessLayout";
import AdminLayout from "./AdminLayout";
import NotFoundPage from "./NotFoundPage";
import PlaceholderPage from "./PlaceholderPage";
import CirclesWorkspacePage from "../features/circles/CirclesWorkspacePage";
import CircleCreatePage from "../features/circles/CircleCreatePage";
import CircleWorkspaceDetailPage from "../features/circles/CircleWorkspaceDetailPage";
import MyNetworkListsPage from "../features/network/MyNetworkListsPage";
import JoinListPage from "../features/network/JoinListPage";
import ConfirmContactPage from "../features/network/ConfirmContactPage";
import GroupsOverviewPage from "../features/groups/GroupsOverviewPage";
import MyGroupsPage from "../features/groups/MyGroupsPage";
import NetworkGroupPage from "../features/groups/NetworkGroupPage";
import GroupDetailsPage from "../features/groups/GroupDetailsPage";
import GroupMembersPage from "../features/groups/GroupMembersPage";
import GroupActivityPage from "../features/groups/GroupActivityPage";
import GroupInvitationsPage from "../features/groups/GroupInvitationsPage";
import GroupSettingsPage from "../features/groups/GroupSettingsPage";
import InvitationsInboxPage from "../features/invitations/InvitationsInboxPage";
import ExploreGroupsPage from "../features/groups/ExploreGroupsPage";
import CreateGroupWizardPage from "../features/groups/CreateGroupWizardPage";
import GroupCreatedPage from "../features/groups/GroupCreatedPage";
import NationalCommunityPage from "../features/platform/NationalCommunityPage";
import MyLocationPage from "../features/platform/MyLocationPage";
import CampaignsPage from "../features/platform/CampaignsPage";
import RewardsPage from "../features/platform/RewardsPage";
import JourneyPage from "../journey/JourneyPage";
import AdminGroupsDashboardPage from "../features/admin/AdminGroupsDashboardPage";
import AdminGroupListPage from "../features/admin/AdminGroupListPage";
import AdminGroupDetailsPage from "../features/admin/AdminGroupDetailsPage";
import AdminGroupMembersPage from "../features/admin/AdminGroupMembersPage";
import AdminGroupActivityPage from "../features/admin/AdminGroupActivityPage";
import AdminGroupRelationshipsPage from "../features/admin/AdminGroupRelationshipsPage";
import AutomaticGroupRulesPage from "../features/admin/AutomaticGroupRulesPage";
import GroupTypeConfigPage from "../features/admin/GroupTypeConfigPage";
import AdminReportsPage from "../features/admin/AdminReportsPage";
import LocationRelationshipsPage from "../features/admin/LocationRelationshipsPage";
import PartnerGroupsPage from "../features/admin/PartnerGroupsPage";
import MandatoryCirclesPage from "../features/admin/MandatoryCirclesPage";
import AdminInvitationsPage from "../features/admin/AdminInvitationsPage";

const businessRoutes = [
  { index: true, element: <Navigate to="/business/groups" replace /> },
  {
    path: "overview",
    element: <Navigate to="/business/groups" replace />,
  },
  {
    path: "groups",
    element: <GroupsOverviewPage />,
  },
  {
    path: "groups/mine",
    element: <MyGroupsPage />,
  },
  {
    path: "groups/mine/:section",
    element: <MyGroupsPage />,
  },
  {
    path: "groups/network",
    element: <NetworkGroupPage />,
  },
  {
    path: "groups/explore",
    element: <ExploreGroupsPage />,
  },
  {
    path: "groups/create",
    element: <CreateGroupWizardPage />,
  },
  {
    path: "groups/create/success",
    element: <GroupCreatedPage />,
  },
  {
    path: "groups/:groupId",
    element: <GroupDetailsPage />,
  },
  {
    path: "groups/:groupId/members",
    element: <GroupMembersPage />,
  },
  {
    path: "groups/:groupId/activity",
    element: <GroupActivityPage />,
  },
  {
    path: "groups/:groupId/invitations",
    element: <GroupInvitationsPage />,
  },
  {
    path: "groups/:groupId/settings",
    element: <GroupSettingsPage />,
  },
  {
    path: "invitations",
    element: <InvitationsInboxPage />,
  },
  {
    path: "network/lists",
    element: <MyNetworkListsPage />,
  },
  {
    path: "circles",
    element: <CirclesWorkspacePage />,
  },
  {
    path: "circles/create",
    element: <CircleCreatePage />,
  },
  {
    path: "circles/:circleId",
    element: <CircleWorkspaceDetailPage />,
  },
  {
    path: "community",
    element: <NationalCommunityPage />,
  },
  {
    path: "location",
    element: <MyLocationPage />,
  },
  {
    path: "campaigns",
    element: <CampaignsPage />,
  },
  {
    path: "rewards",
    element: <RewardsPage />,
  },
  {
    path: "settings",
    element: (
      <PlaceholderPage
        title="Account Settings"
        doc="Doc B §3"
        phase="Stub"
        description="Central Solution account area — outside the Group Building prototype scope."
      />
    ),
  },
  {
    path: "journey",
    element: <JourneyPage />,
  },
];

const adminRoutes = [
  { index: true, element: <Navigate to="groups" replace /> },
  {
    path: "groups",
    element: <AdminGroupsDashboardPage />,
  },
  {
    path: "groups/all",
    element: <AdminGroupListPage />,
  },
  {
    path: "groups/:groupId",
    element: <AdminGroupDetailsPage />,
  },
  {
    path: "groups/:groupId/members",
    element: <AdminGroupMembersPage />,
  },
  {
    path: "groups/:groupId/activity",
    element: <AdminGroupActivityPage />,
  },
  {
    path: "groups/:groupId/relationships",
    element: <AdminGroupRelationshipsPage />,
  },
  {
    path: "config/automatic",
    element: <AutomaticGroupRulesPage />,
  },
  {
    path: "config/types",
    element: <GroupTypeConfigPage />,
  },
  {
    path: "locations",
    element: <LocationRelationshipsPage />,
  },
  {
    path: "partner-groups",
    element: <PartnerGroupsPage />,
  },
  {
    path: "mandatory-circles",
    element: <MandatoryCirclesPage />,
  },
  {
    path: "invitations",
    element: <AdminInvitationsPage />,
  },
  {
    path: "reports",
    element: <AdminReportsPage />,
  },
  {
    path: "journey",
    element: <JourneyPage />,
  },
];

export const routes: RouteObject[] = [
  { path: "/", element: <Navigate to="/business/groups" replace /> },
  { path: "/join/:listId", element: <JoinListPage /> },
  { path: "/join/:listId/confirm/:contactId", element: <ConfirmContactPage /> },
  {
    path: "/business",
    element: <BusinessLayout />,
    children: [...businessRoutes, { path: "*", element: <NotFoundPage /> }],
  },
  {
    path: "/admin",
    element: <AdminLayout />,
    children: [...adminRoutes, { path: "*", element: <NotFoundPage /> }],
  },
  { path: "*", element: <NotFoundPage /> },
];

export const router = createBrowserRouter(routes);
