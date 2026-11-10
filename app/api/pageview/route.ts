import { NextResponse, type NextRequest } from 'next/server';
import { clientIp, rateLimit } from '@/lib/rate-limit';
import { serviceClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const ip = clientIp(req.headers);
  if (!rateLimit(`pv:${ip}`, 240, 10 * 60 * 1000)) return new NextResponse(null, { status: 429 });
  let body: { issueId?: string; page?: number; sessionId?: string };
  try {
    body = await req.json();
  } catch {
    return new NextResponse(null, { status: 400 });
  }
  const page = Number(body.page);
  if (!body.issueId || !Number.isInteger(page) || page < 0 || page > 200) return new NextResponse(null, { status: 400 });
  const db = serviceClient();
  if (db) {
    await db.from('page_views').insert({ issue_id: body.issueId, page_index: page, session_id: String(body.sessionId ?? 'anon').slice(0, 64) });
  }
  return new NextResponse(null, { status: 204 });
}
