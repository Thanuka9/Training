export type PaginationQuery = {
  page?: unknown;
  pageSize?: unknown;
  sortBy?: unknown;
  sortDirection?: unknown;
  search?: unknown;
};

export function parsePagination(query: PaginationQuery) {
  const page = Math.max(1, Number(query.page) || 1);
  const pageSize = Math.min(500, Math.max(1, Number(query.pageSize) || 20));
  const sortDirection = String(query.sortDirection ?? "desc").toLowerCase() === "asc" ? "asc" : "desc";
  const sortBy = typeof query.sortBy === "string" && query.sortBy.trim() ? query.sortBy.trim() : undefined;
  const search = typeof query.search === "string" ? query.search.trim() : "";

  return {
    page,
    pageSize,
    skip: (page - 1) * pageSize,
    take: pageSize,
    sortBy,
    sortDirection: sortDirection as "asc" | "desc",
    search,
  };
}

export function paginatedResult<T>(items: T[], total: number, page: number, pageSize: number) {
  return {
    items,
    page,
    pageSize,
    total,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}
