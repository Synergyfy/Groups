import { Navigate, createBrowserRouter, type RouteObject } from "react-router-dom";
import BusinessLayout from "./BusinessLayout";
import AdminLayout from "./AdminLayout";
import PublicLayout from "./PublicLayout";
import NotFoundPage from "./NotFoundPage";
import PlaceholderPage from "./PlaceholderPage";
import CirclesWorkspacePage from "../features/circles/CirclesWorkspacePage";
import CircleCreatePage from "../features/circles/CircleCreatePage";
import CircleWorkspaceDetailPage from "../features/circles/CircleWorkspaceDetailPage";
import MyNetworkListsPage from "../features/network/MyNetworkListsPage";
import GroupsOverviewPage from "../features/groups/GroupsOverviewPage";
import MyGroupsPage from "../features/groups/MyGroupsPage";
import NetworkGroupPage from "../features/groups/NetworkGroupPage";
import GroupDetailsPage from "../features/groups/GroupDetailsPage";
import GroupMembersPage from "../features/groups/GroupMembersPage";
import GroupActivityPage from "../features/groups/GroupActivityPage";
import GroupInvitationsPage from "../features/groups/GroupInvitationsPage";
import GroupSettingsPage from "../features/groups/GroupSettingsPage";
import InvitationReviewPage from "../features/invitations/InvitationReviewPage";
import InvitationsInboxPage from "../features/invitations/InvitationsInboxPage";
import ExploreGroupsPage from "../features/groups/ExploreGroupsPage";
import CreateGroupWizardPage from "../features/groups/CreateGroupWizardPage";
import GroupCreatedPage from "../features/groups/GroupCreatedPage";
import NationalCommunityPage from "../features/platform/NationalCommunityPage";
import MyLocationPage from "../features/platform/MyLocationPage";
import CampaignsPage from "../features/platform/CampaignsPage";
import RewardsPage from "../features/platform/RewardsPage";
import JourneyPage from "../journey/JourneyPage";
import AdminOverviewPage from "../features/admin/AdminOverviewPage";
import AdminUsersPage from "../features/admin/AdminUsersPage";
import AdminGroupsHubPage from "../features/admin/AdminGroupsHubPage";
import AdminAccessRulesPage from "../features/admin/AdminAccessRulesPage";
import AdminMembershipsPage from "../features/admin/AdminMembershipsPage";
import AdminRewardsDealsPage from "../features/admin/AdminRewardsDealsPage";
import AdminSettingsReportsPage from "../features/admin/AdminSettingsReportsPage";
import AdminGroupsDashboardPage from "../features/admin/AdminGroupsDashboardPage";
import AdminGroupListPage from "../features/admin/AdminGroupListPage";
import AdminGroupDetailsPage from "../features/admin/AdminGroupDetailsPage";
import AdminGroupMembersPage from "../features/admin/AdminGroupMembersPage";
import AdminGroupActivityPage from "../features/admin/AdminGroupActivityPage";
import AdminGroupRelationshipsPage from "../features/admin/AdminGroupRelationshipsPage";
import AutomaticGroupRulesPage from "../features/admin/AutomaticGroupRulesPage";
import AdminGroupRulesPage from "../features/admin/AdminGroupRulesPage";
import GroupTypeConfigPage from "../features/admin/GroupTypeConfigPage";
import AdminReportsPage from "../features/admin/AdminReportsPage";
import LocationRelationshipsPage from "../features/admin/LocationRelationshipsPage";
import PartnerGroupsPage from "../features/admin/PartnerGroupsPage";
import MandatoryCirclesPage from "../features/admin/MandatoryCirclesPage";
import AdminInvitationsPage from "../features/admin/AdminInvitationsPage";
import PublicContentAdminPage from "../features/public/PublicContentAdminPage";
import AdminPendingReviewPage from "../features/admin/AdminPendingReviewPage";
import AdminAuditLogPage from "../features/admin/AdminAuditLogPage";
import AdminPartnersPage from "../features/admin/AdminPartnersPage";
import AdminBusinessesPage from "../features/admin/AdminBusinessesPage";
import AdminProgrammesPage from "../features/admin/AdminProgrammesPage";
import AdminCampaignsPage from "../features/admin/AdminCampaignsPage";
import AdminRelationshipsPage from "../features/admin/AdminRelationshipsPage";
import AdminCircleConfigPage from "../features/admin/AdminCircleConfigPage";
import AdminPermissionsPage from "../features/admin/AdminPermissionsPage";
import LandingPage from "../features/public/LandingPage";
import SignInPage from "../app/SignInPage";
import GetStartedPage from "../app/GetStartedPage";
import GroupInvitationLandingPage from "../features/invitations/GroupInvitationLandingPage";
import GroupAccessDashboardPage from "../features/groups/GroupAccessDashboardPage";
import CentralCirclePage from "../features/groups/CentralCirclePage";
import ParticipantLayout from "../features/participant/ParticipantLayout";
import ParticipantDashboardPage from "../features/participant/ParticipantDashboardPage";
import ParticipantInvitationsPage from "../features/participant/ParticipantInvitationsPage";
import ParticipantCircleDetailPage from "../features/participant/ParticipantCircleDetailPage";
import ParticipantGroupPage from "../features/participant/ParticipantGroupPage";
import ParticipantAccountPage from "../features/participant/ParticipantAccountPage";
import ParticipantInvitedGroupsPage from "../features/participant/ParticipantInvitedGroupsPage";
import ParticipantOnboardingPage from "../features/participant/ParticipantOnboardingPage";
import ConsumerMyGroupsPage from "../features/participant/ConsumerMyGroupsPage";
import ConsumerDiscoverGroupsPage from "../features/participant/ConsumerDiscoverGroupsPage";
import ConsumerLayout from "../features/consumer/ConsumerLayout";
import ConsumerDashboardPage from "../features/consumer/ConsumerDashboardPage";
import DedicatedConsumerMyGroupsPage from "../features/consumer/ConsumerMyGroupsPage";
import DedicatedConsumerDiscoverGroupsPage from "../features/consumer/ConsumerDiscoverGroupsPage";
import ConsumerInvitationsPage from "../features/consumer/ConsumerInvitationsPage";
import ConsumerAccountPage from "../features/consumer/ConsumerAccountPage";

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
    path: "invitations/:invitationId/review",
    element: <InvitationReviewPage />,
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
  { index: true, element: <Navigate to="overview" replace /> },
  {
    path: "overview",
    element: <AdminOverviewPage />,
  },
  {
    path: "users",
    element: <AdminUsersPage />,
  },
  {
    path: "groups",
    element: <AdminGroupsHubPage />,
  },
  {
    path: "access-rules",
    element: <AdminAccessRulesPage />,
  },
  {
    path: "memberships",
    element: <AdminMembershipsPage />,
  },
  {
    path: "rewards-deals",
    element: <AdminRewardsDealsPage />,
  },
  {
    path: "settings-reports",
    element: <AdminSettingsReportsPage />,
  },
  {
    path: "groups/dashboard",
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
    path: "config/group-rules",
    element: <AdminGroupRulesPage />,
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
    path: "pending-review",
    element: <AdminPendingReviewPage />,
  },
  {
    path: "audit-log",
    element: <AdminAuditLogPage />,
  },
  {
    path: "partners",
    element: <AdminPartnersPage />,
  },
  {
    path: "businesses",
    element: <AdminBusinessesPage />,
  },
  {
    path: "programmes",
    element: <AdminProgrammesPage />,
  },
  {
    path: "campaigns",
    element: <AdminCampaignsPage />,
  },
  {
    path: "relationships",
    element: <AdminRelationshipsPage />,
  },
  {
    path: "config/circles",
    element: <AdminCircleConfigPage />,
  },
  {
    path: "config/permissions",
    element: <AdminPermissionsPage />,
  },
  {
    path: "content",
    element: <PublicContentAdminPage />,
  },
  {
    path: "reports",
    element: <AdminReportsPage />,
  },
];

const publicRoutes: RouteObject[] = [
  {
    path: "/",
    element: <PublicLayout />,
    children: [
      { index: true, element: <LandingPage /> },
      { path: "sign-in", element: <SignInPage /> },
      { path: "login", element: <SignInPage /> },
      { path: "get-started", element: <GetStartedPage /> },
      { path: "register", element: <GetStartedPage /> },
      { path: "*", element: <NotFoundPage /> },
    ],
  },
];

export const routes: RouteObject[] = [
  ...publicRoutes,
  {
    path: "/groups/invitation/business/:invitationId",
    element: <GroupInvitationLandingPage targetAudience="business" />,
  },
  {
    path: "/groups/invitation/consumer/:invitationId",
    element: <GroupInvitationLandingPage targetAudience="consumer" />,
  },
  {
    path: "/groups/invitation/:invitationId",
    element: <GroupInvitationLandingPage />,
  },
  {
    path: "/invite/business/:invitationId",
    element: <GroupInvitationLandingPage targetAudience="business" />,
  },
  {
    path: "/invite/consumer/:invitationId",
    element: <GroupInvitationLandingPage targetAudience="consumer" />,
  },
  {
    path: "/invite/customer/:invitationId",
    element: <GroupInvitationLandingPage targetAudience="consumer" />,
  },
  {
    path: "/invite/:invitationId",
    element: <GroupInvitationLandingPage />,
  },
  {
    path: "/login",
    element: <SignInPage />,
  },
  {
    path: "/register",
    element: <GetStartedPage />,
  },
  {
    path: "/get-started",
    element: <GetStartedPage />,
  },
  {
    path: "/groups/access",
    element: <GroupAccessDashboardPage />,
  },
  {
    path: "/groups/central-circle",
    element: <CentralCirclePage />,
  },
  {
    path: "/groups/:groupId",
    element: <GroupDetailsPage />,
  },
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
  {
    path: "/consumer",
    element: <ConsumerLayout />,
    children: [
      { index: true, element: <ConsumerDashboardPage /> },
      { path: "my-groups", element: <DedicatedConsumerMyGroupsPage /> },
      { path: "discover", element: <DedicatedConsumerDiscoverGroupsPage /> },
      { path: "invitations", element: <ConsumerInvitationsPage /> },
      { path: "invitations/:invitationId/review", element: <InvitationReviewPage /> },
      { path: "groups/:groupId", element: <ParticipantGroupPage /> },
      { path: "circles/:groupId", element: <ParticipantCircleDetailPage /> },
      { path: "account", element: <ConsumerAccountPage /> },
      { path: "*", element: <NotFoundPage /> },
    ],
  },
  {
    path: "/participant",
    element: <ParticipantLayout />,
    children: [
      { index: true, element: <ParticipantDashboardPage /> },
      { path: "groups", element: <ParticipantInvitedGroupsPage /> },
      { path: "onboarding", element: <ParticipantOnboardingPage /> },
      { path: "my-groups", element: <ConsumerMyGroupsPage /> },
      { path: "discover", element: <ConsumerDiscoverGroupsPage /> },
      { path: "invitations", element: <ParticipantInvitationsPage /> },
      { path: "invitations/:invitationId/review", element: <InvitationReviewPage /> },
      { path: "groups/:groupId", element: <ParticipantGroupPage /> },
      { path: "circles/:groupId", element: <ParticipantCircleDetailPage /> },
      { path: "account", element: <ParticipantAccountPage /> },
      { path: "*", element: <NotFoundPage /> },
    ],
  },
  { path: "*", element: <NotFoundPage /> },
];

export const router = createBrowserRouter(routes);
