import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import {
  destinationForSession,
  loginPathForRole,
  readAuthSession,
  type AuthRole,
} from "./authSession";
import { useSessionVerification } from "./useSessionVerification";

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
  // The stored session can outlive the httpOnly cookie that authorises the
  // API calls — after a sign-out in another tab, an expired session, or a
  // server restart. The dashboard must not render in that state: it would
  // fail with "Not signed in" instead of offering the login page.
  const sessionCheck = useSessionVerification();

  if (!session) {
    return <Navigate to={loginTarget()} replace />;
  }

  if (sessionCheck === "anonymous") {
    return <Navigate to={loginTarget()} replace />;
  }

  if (sessionCheck === "checking") {
    return <RoleGuardLoading />;
  }

  if (!allowed.includes(session.role)) {
    return <Navigate to={destinationForSession(session)} replace />;
  }

  return <>{children}</>;

  function loginTarget(): string {
    const loginPath = loginPathForRole(allowed[0]);
    const next = `${location.pathname}${location.search}`;
    return `${loginPath}?next=${encodeURIComponent(next)}`;
  }
}

function RoleGuardLoading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-ink-950 px-6">
      <div className="flex flex-col items-center gap-3 text-center">
        <span className="size-8 animate-spin rounded-full border-2 border-gold-500/30 border-t-gold-400" />
        <p className="text-sm font-medium text-slate-300">
          Checking your session…
        </p>
      </div>
    </div>
  );
}
