export type RemoteRole =
  | "BUSINESS"
  | "CUSTOMER"
  | "AGENT"
  | "CONSULTANT"
  | "ACCOUNT_MANAGER"
  | "PARTNER"
  | "ADMIN";

export interface AuthUser {
  id: string;
  email: string;
  role: RemoteRole;
  name: string;
  firstName?: string | null;
  lastName?: string | null;
  profileType?: string | null;
  businessName?: string | null;
  avatarUrl?: string | null;
}

export interface AuthResponse {
  user: AuthUser;
  redirectTo: string;
  entitlement?: unknown;
}

const viteEnv = import.meta.env as
  | { VITE_API_BASE_URL?: string }
  | undefined;
const API_BASE_URL = (viteEnv?.VITE_API_BASE_URL ?? "/api").replace(
  /\/+$/,
  "",
);

export class ApiError extends Error {
  readonly status: number;
  readonly body: unknown;

  constructor(status: number, body: unknown) {
    super(extractMessage(body) ?? `Request failed with status ${status}`);
    this.name = "ApiError";
    this.status = status;
    this.body = body;
  }
}

export function errorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    return error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Something went wrong. Please try again.";
}

export async function apiRequest<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    credentials: "include",
    headers: {
      Accept: "application/json",
      ...(init.body ? { "Content-Type": "application/json" } : {}),
      ...init.headers,
    },
  });
  const text = await response.text();
  const body: unknown = text ? JSON.parse(text) : null;

  if (!response.ok) {
    throw new ApiError(response.status, body);
  }

  return body as T;
}

export const authApi = {
  mcomLoginUrl(next?: string): string {
    const query = next ? `?next=${encodeURIComponent(next)}` : "";
    return `${API_BASE_URL}/auth/mcom/login${query}`;
  },

  mcomCallback(code: string, state: string): Promise<AuthResponse> {
    return apiRequest<AuthResponse>("/auth/mcom/callback", {
      method: "POST",
      body: JSON.stringify({ code, state }),
    });
  },

  adminLogin(email: string, password: string): Promise<AuthResponse> {
    return apiRequest<AuthResponse>("/auth/admin/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
  },

  me(): Promise<{ user: AuthUser }> {
    return apiRequest<{ user: AuthUser }>("/auth/me");
  },

  logout(): Promise<{ ok: boolean }> {
    return apiRequest<{ ok: boolean }>("/auth/logout", {
      method: "POST",
    });
  },
};

function extractMessage(body: unknown): string | null {
  if (!body || typeof body !== "object" || !("message" in body)) {
    return null;
  }

  const message = (body as { message?: unknown }).message;

  if (typeof message === "string") {
    return message;
  }

  if (Array.isArray(message)) {
    return message.map(String).join(", ");
  }

  return null;
}
