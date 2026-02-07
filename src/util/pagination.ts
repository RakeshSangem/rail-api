import { count, type SQL } from "drizzle-orm";
import type { AnyPgTable, PgColumn } from "drizzle-orm/pg-core";
import type { InferSelectModel } from "drizzle-orm";
import { Pool } from "pg";
import { schema } from "../db";
import { NodePgDatabase } from "drizzle-orm/node-postgres";

type PaginationResult<T> = {
  data: T[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
};

type PaginationOptions<TTable extends AnyPgTable> = {
  db: NodePgDatabase<typeof schema> & {
    $client: Pool;
  };
  table: TTable;
  where?: SQL;
  orderBy: Array<PgColumn | SQL>;
  page?: number;
  limit?: number;
};

export async function withPagination<TTable extends AnyPgTable>({
  db,
  table,
  where,
  orderBy,
  page = 1,
  limit = 20,
}: PaginationOptions<TTable>): Promise<
  PaginationResult<InferSelectModel<TTable>>
> {
  const safePage = Math.max(1, Math.floor(page));
  const safeLimit = Math.min(50, Math.max(1, Math.floor(limit)));
  const offset = (safePage - 1) * safeLimit;

  const [rows, totalResult] = await Promise.all([
    db
      .select()
      .from(table)
      .where(where)
      .orderBy(...orderBy)
      .limit(safeLimit)
      .offset(offset),

    db.select({ count: count() }).from(table).where(where),
  ]);

  const total = Number(totalResult[0]?.count ?? 0);
  const totalPages = Math.ceil(total / safeLimit);

  return {
    data: rows,
    pagination: {
      total,
      page: safePage,
      limit: safeLimit,
      totalPages,
    },
  };
}
