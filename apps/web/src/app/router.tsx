import { Navigate, createBrowserRouter, type RouteObject } from "react-router-dom";
import BusinessLayout from "./BusinessLayout";
import { BusinessDataProvider } from "../business/BusinessDataProvider";
import AdminLayout from "./AdminLayout";
import PublicLayout from "./PublicLayout";
import NotFoundPage from "./NotFoundPage";
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
import InvitationDetailPage from "../features/invitations/InvitationDetailPage";
import InvitationsInboxPage from "../features/invitations/InvitationsInboxPage";
import ExploreGroupsPage from "../features/groups/ExploreGroupsPage";
import CreateGroupWizardPage from "../features/groups/CreateGroupWizardPage";
import GroupCreatedPage from "../features/groups/GroupCreatedPage";
import NationalCommunityPage from "../features/platform/NationalCommunityPage";
import MyLocationPage from "../features/platform/MyLocationPage";
import CampaignsPage from "../features/platform/CampaignsPage";
import RewardsPage from "../features/platform/RewardsPage";
import BusinessSettingsPage from "../features/settings/BusinessSettingsPage";
import PlanPage from "../features/plan/PlanPage";
import JourneyPage from "../journey/JourneyPage";
import AdminOverviewPage from "../features/admin/AdminOverviewPage";
import AdminUsersPage from "../features/admin/AdminUsersPage";
import AdminGroupsHubPage from "../features/admin/AdminGroupsHubPage";
import AdminPlansPage from "../features/admin/AdminPlansPage";
import AdminRewardsDealsPage from "../features/admin/AdminRewardsDealsPage";
import AdminSettingsReportsPage from "../features/admin/AdminSettingsReportsPage";
import AdminGroupsDashboardPage from "../features/admin/AdminGroupsDashboardPage";
import AdminGroupListPage from "../features/admin/AdminGroupListPage";
import AdminGroupDetailsPage from "../features/admin/AdminGroupDetailsPage";
import AdminGroupMembersPage from "../features/admin/AdminGroupMembersPage";
import AdminGroupActivityPage from "../features/admin/AdminGroupActivityPage";
import AdminGroupRelationshipsPage from "../features/admin/AdminGroupRelationshipsPage";
import AdminInvitationsPage from "../features/admin/AdminInvitationsPage";
import LandingPage from "../features/public/LandingPage";
import SignInPage from "../app/SignInPage";
import AdminSignInPage from "../app/AdminSignInPage";
import AuthCallbackPage from "../app/AuthCallbackPage";
import RoleGuard from "../app/RoleGuard";
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
import { ConsumerDataProvider } from "../consumer/ConsumerDataProvider";
import {
  PaymentCancelPage,
  PaymentReturnPage,
} from "../features/payments/PaymentReturnPage";

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
    path: "invitations/:invitationId",
    element: <InvitationDetailPage />,
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
    element: <BusinessSettingsPage />,
  },
  {
    path: "plan",
    element: <PlanPage />,
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
    path: "plans",
    element: <AdminPlansPage />,
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
    path: "config/group-rules",
    element: <Navigate to="/admin/plans" replace />,
  },
  {
    path: "invitations",
    element: <AdminInvitationsPage />,
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
    path: "/auth/callback",
    element: <AuthCallbackPage />,
  },
  {
    path: "/payment/return",
    element: <PaymentReturnPage />,
  },
  {
    path: "/payment/cancel",
    element: <PaymentCancelPage />,
  },
  {
    path: "/admin/login",
    element: <AdminSignInPage />,
  },
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
    element: (
      <RoleGuard allow="business">
        <BusinessDataProvider>
          <BusinessLayout />
        </BusinessDataProvider>
      </RoleGuard>
    ),
    children: [...businessRoutes, { path: "*", element: <NotFoundPage /> }],
  },
  {
    path: "/admin",
    element: (
      <RoleGuard allow="admin">
        <AdminLayout />
      </RoleGuard>
    ),
    children: [...adminRoutes, { path: "*", element: <NotFoundPage /> }],
  },
  {
    path: "/consumer",
    element: (
      <RoleGuard allow="consumer">
        <ConsumerDataProvider>
          <ConsumerLayout />
        </ConsumerDataProvider>
      </RoleGuard>
    ),
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
    element: (
      <RoleGuard allow="business-invitee">
        <ParticipantLayout />
      </RoleGuard>
    ),
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
