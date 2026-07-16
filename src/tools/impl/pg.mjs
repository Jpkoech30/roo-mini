import pg from "pg";

const { Pool } = pg;

function getPool() {
  const PG_URL = process.env.PG_URL;
  if (!PG_URL) {
    throw new Error("Set PG_URL environment variable (postgresql://user:pass@host:5432/db)");
  }
  return new Pool({ connectionString: PG_URL });
}

export async function pgTables(args) {
  const pool = getPool();
  try {
    const schema = args?.schema || "public";
    const res = await pool.query(
      `SELECT table_name, table_type FROM information_schema.tables WHERE table_schema = $1`,
      [schema]
    );
    if (!res.rows.length) return "📭 No tables found.";
    return res.rows.map(r => `  • ${r.table_name} (${r.table_type})`).join("\n");
  } finally {
    await pool.end();
  }
}

export async function pgDescribe(args) {
  const pool = getPool();
  try {
    const table = args?.table;
    const schema = args?.schema || "public";
    if (!table) throw new Error("Parameter 'table' is required.");
    const res = await pool.query(
      `SELECT column_name, data_type, is_nullable, column_default FROM information_schema.columns WHERE table_schema = $1 AND table_name = $2`,
      [schema, table]
    );
    if (!res.rows.length) return `📭 Table "${table}" not found.`;
    return res.rows.map(r =>
      `  • ${r.column_name} (${r.data_type}) nullable=${r.is_nullable} default=${r.column_default || "null"}`
    ).join("\n");
  } finally {
    await pool.end();
  }
}

export async function pgQuery(args) {
  const pool = getPool();
  try {
    const sql = args?.sql;
    if (!sql) throw new Error("Parameter 'sql' is required.");
    const res = await pool.query(sql);
    return JSON.stringify({ rows: res.rows, rowCount: res.rowCount }, null, 2);
  } finally {
    await pool.end();
  }
}
