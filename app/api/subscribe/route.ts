import { NextResponse, type NextRequest } from 'next/server';
import { getIssueById } from '@/lib/data';
import { notifyEmailProvider } from '@/lib/email';
import { clientIp, rateLimit } from '@/lib/rate-limit';
import { serviceClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const clip = (v: unknown, n = 120) => (typeof v === 'string' ? v.slice(0, n) : null);

export async function POST(req: NextRequest) {
  const ip = clientIp(req.headers);
  if (!rateLimit(`sub:${ip}`, 12, 10 * 60 * 1000)) {
    return NextResponse.json({ error: 'Πολλές προσπάθειες. Δοκιμάστε ξανά σε λίγα λεπτά.' }, { status: 429 });
  }
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Μη έγκυρο αίτημα.' }, { status: 400 });
  }
  const email = String(body.email ?? '').trim().toLowerCase();
  const issueId = String(body.issueId ?? '');
  const consent = body.consent === true;
  if (!email.includes('@')) return NextResponse.json({ error: 'Ελέγξτε το email — λείπει το @.' }, { status: 422 });
  if (!EMAIL_RE.test(email) || email.length > 254) return NextResponse.json({ error: 'Ελέγξτε το email — λείπει η κατάληξη, π.χ. .gr' }, { status: 422 });

  const issue = await getIssueById(issueId);
  if (!issue) return NextResponse.json({ error: 'Το τεύχος δεν βρέθηκε.' }, { status: 404 });

  const now = new Date().toISOString();
  const utm = (body.utm ?? {}) as Record<string, unknown>;
  const db = serviceClient();
  if (db) {
    const { error } = await db.from('subscribers').upsert(
      {
        issue_id: issue.id,
        email,
        marketing_consent: consent,
        consented_at: consent ? now : null,
        privacy_ack_at: now,
        user_agent: clip(req.headers.get('user-agent'), 400),
        utm_source: clip(utm.source),
        utm_medium: clip(utm.medium),
        utm_campaign: clip(utm.campaign),
        unsubscribed_at: null,
      },
      { onConflict: 'issue_id,email' },
    );
    if (error) {
      console.error('subscribe failed', error);
      return NextResponse.json({ error: 'Δεν ήταν δυνατή η αποθήκευση. Δοκιμάστε ξανά.' }, { status: 500 });
    }
    await notifyEmailProvider({
      email, issueId: issue.id, issueNumber: issue.number, marketingConsent: consent, createdAt: now,
      utm: { source: clip(utm.source) ?? undefined, medium: clip(utm.medium) ?? undefined, campaign: clip(utm.campaign) ?? undefined },
    });
  }

  const res = NextResponse.json({ ok: true, demo: !db });
  res.cookies.set(`kfc_issue_${issue.id}`, '1', {
    maxAge: 60 * 60 * 24 * 365,
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
  });
  return res;
}
