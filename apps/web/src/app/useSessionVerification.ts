import { useEffect, useState } from "react";
import { ApiError, authApi } from "./api";
import {
  clearAuthSession,
  readAuthSession,
  sessionFromApiUser,
  writeAuthSession,
} from "./authSession";

export type SessionCheck = "checking" | "valid" | "anonymous";

/**
 * Confirm that a locally stored session still exists on the API before trusting
 * it. The cookie that authorises API calls is http-only and expires on the
 * server, so sessionStorage can outlive it (for example after the session TTL
 * passes or the browser drops the cookie).
 */
export function useSessionVerification(): SessionCheck {
  const [check, setCheck] = useState<SessionCheck>(() =>
    readAuthSession() ? "checking" : "anonymous",
  );

  useEffect(() => {
    if (!readAuthSession()) return undefined;

    let active = true;

    authApi
      .me()
      .then(({ user }) => {
        if (!active) return;
        const current = readAuthSession();
        writeAuthSession({
          ...current,
          ...sessionFromApiUser(user),
        });
        setCheck("valid");
      })
      .catch((cause: unknown) => {
        if (!active) return;

        if (cause instanceof ApiError && cause.status === 401) {
          clearAuthSession();
          setCheck("anonymous");
          return;
        }

        // The API could not be reached. Keep the previous behaviour of
        // trusting the stored session rather than signing the user out.
        setCheck("valid");
      });

    return () => {
      active = false;
    };
  }, []);

  return check;
}
