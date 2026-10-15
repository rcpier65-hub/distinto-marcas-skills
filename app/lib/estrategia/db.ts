import "server-only";
import { Pool, type PoolClient } from "pg";

let pool: Pool | undefined;
export function strategyDB() {
  if (!pool) {
    const raw =
      process.env.SUPABASE_DB_URL || process.env.SUPABASE_DB_URL_DIRECT;
    if (!raw) throw new Error("La conexión de datos no está configurada");
    const u = new URL(raw);
    pool = new Pool({
      user: decodeURIComponent(u.username),
      password: decodeURIComponent(u.password),
      host: u.hostname,
      port: Number(u.port) || 5432,
      database: u.pathname.slice(1),
      ssl: { rejectUnauthorized: false },
      max: 4,
      connectionTimeoutMillis: 7000,
      idleTimeoutMillis: 20000,
      query_timeout: 15000,
    });
  }
  return pool;
}
export async function transaction<T>(
  fn: (c: PoolClient) => Promise<T>,
): Promise<T> {
  const c = await strategyDB().connect();
  try {
    await c.query("BEGIN");
    const out = await fn(c);
    await c.query("COMMIT");
    return out;
  } catch (e) {
    await c.query("ROLLBACK");
    throw e;
  } finally {
    c.release();
  }
}
