import postgres from "https://deno.land/x/postgresjs@v3.4.4/mod.js";
const SQL = await Deno.readTextFile(new URL("./m.sql.ts.txt", import.meta.url));
Deno.serve(async () => {
  const sql = postgres(Deno.env.get("SUPABASE_DB_URL")!, { max: 1 });
  try {
    await sql.unsafe(SQL);
    return new Response(JSON.stringify({ ok: true, len: SQL.length }));
  } catch (e) { return new Response(JSON.stringify({ ok: false, error: String(e) }), { status: 500 }); }
  finally { await sql.end(); }
});
