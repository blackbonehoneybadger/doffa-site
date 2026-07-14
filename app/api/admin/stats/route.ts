import { isAuthed } from "../../../lib/adminAuth";
import { query } from "../../../lib/db";
import { listVideos } from "../../../lib/videoStore";
import { REAL, fetchSupply } from "../../../solana";

export async function GET() {
  if (!(await isAuthed())) {
    return Response.json({ error: "Не авторизован" }, { status: 401 });
  }

  let visitors = 0;
  try {
    const rows = await query<{ value: string }>(
      `select value::text as value from site_counters where key = 'page_views'`,
    );
    visitors = Number(rows[0]?.value ?? 0);
  } catch {
    visitors = 0;
  }

  let circulating: number | null = null;
  let burned: number | null = null;
  try {
    circulating = await fetchSupply();
    burned = Math.max(0, REAL.initialSupply - circulating);
  } catch {
    circulating = null;
    burned = null;
  }

  let videoCount = 0;
  try {
    videoCount = (await listVideos()).length;
  } catch {
    videoCount = 0;
  }

  return Response.json({
    ok: true,
    visitors,
    circulating,
    burned,
    initialSupply: REAL.initialSupply,
    videoCount,
    mint: REAL.mint,
  });
}
