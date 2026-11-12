import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import {
  destinationForSession,
  loginPathForRole,
  readAuthSession,
  type AuthRole,
} from "./authSession";

interface RoleGuardProps {
  allow: AuthRole | AuthRole[];
  children: ReactNode;
}

/**
 * Dashboard-level role gate. Unauthenticated visitors are sent to the login
 * page for the dashboard they tried to open; authenticated users who open a
 * dashboard for a different role are sent back to their own dashboard.
 */
export default function RoleGuard({ allow, children }: RoleGuardProps) {
  const session = readAuthSession();
  const location = useLocation();
  const allowed = Array.isArray(allow) ? allow : [allow];

  if (!session) {
    const loginPath = loginPathForRole(allowed[0]);
    const next = `${location.pathname}${location.search}`;
    return (
      <Navigate
        to={`${loginPath}?next=${encodeURIComponent(next)}`}
        replace
      />
    );
  }

  if (!allowed.includes(session.role)) {
    return <Navigate to={destinationForSession(session)} replace />;
  }

  return <>{children}</>;
}
