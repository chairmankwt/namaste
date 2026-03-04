import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.NETLIFY_DATABASE_URL);

async function ensureTable() {
  await sql`
    CREATE TABLE IF NOT EXISTS app_storage (
      key TEXT PRIMARY KEY,
      value JSONB,
      updated_at TIMESTAMP DEFAULT NOW()
    )
  `;
}

let tableReady = false;

export default async (req) => {
  if (!tableReady) {
    await ensureTable();
    tableReady = true;
  }

  const url = new URL(req.url);
  const key = url.searchParams.get("key") || "spa_v4c";

  if (req.method === "GET") {
    const rows = await sql`SELECT value FROM app_storage WHERE key = ${key}`;
    if (rows.length > 0) {
      return new Response(JSON.stringify(rows[0].value), {
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
      });
    }
    return new Response("null", {
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
    });
  }

  if (req.method === "POST") {
    const body = await req.json();
    await sql`
      INSERT INTO app_storage (key, value, updated_at)
      VALUES (${key}, ${JSON.stringify(body)}, NOW())
      ON CONFLICT (key) DO UPDATE SET value = ${JSON.stringify(body)}, updated_at = NOW()
    `;
    return new Response(JSON.stringify({ ok: true }), {
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
    });
  }

  if (req.method === "OPTIONS") {
    return new Response("", {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type"
      }
    });
  }

  return new Response("Method not allowed", { status: 405 });
};
