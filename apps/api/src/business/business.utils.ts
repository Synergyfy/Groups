export interface PageResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface PageParams {
  page: number;
  limit: number;
  skip: number;
}

/** Normalise and bound pagination input coming from a validated DTO. */
export function pageParams(
  page?: number,
  limit?: number,
  defaultLimit = 25,
  maxLimit = 100,
): PageParams {
  const safePage = Number.isFinite(page) ? Math.max(1, Math.floor(page as number)) : 1;
  const safeLimit = Number.isFinite(limit)
    ? Math.min(maxLimit, Math.max(1, Math.floor(limit as number)))
    : defaultLimit;
  return { page: safePage, limit: safeLimit, skip: (safePage - 1) * safeLimit };
}

export function pageResult<T>(
  items: T[],
  total: number,
  params: Pick<PageParams, "page" | "limit">,
): PageResult<T> {
  return {
    items,
    total,
    page: params.page,
    pageSize: params.limit,
  };
}

/** Slice an in-memory list using the same bounded pagination semantics. */
export function slicePage<T>(items: T[], params: PageParams): T[] {
  return items.slice(params.skip, params.skip + params.limit);
}

export function normaliseEmail(value: string | null | undefined): string {
  return (value ?? "").trim().toLowerCase();
}

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** Postgres uuid columns reject arbitrary strings, so guard before querying. */
export function isUuid(value: string | null | undefined): value is string {
  return Boolean(value && UUID_PATTERN.test(value));
}

export function numericOrNull(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}
