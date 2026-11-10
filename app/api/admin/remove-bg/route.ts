import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-auth';
import { STORAGE_BUCKET } from '@/lib/supabase/env';
import { serviceClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

/** One-click cover cut-out via remove.bg (REMOVE_BG_API_KEY). */
export async function POST(req: Request) {
  if (!(await requireAdmin(req))) return NextResponse.json({ error: 'Δεν έχετε πρόσβαση.' }, { status: 401 });
  const key = process.env.REMOVE_BG_API_KEY;
  if (!key) return NextResponse.json({ error: 'Η αφαίρεση φόντου δεν έχει ρυθμιστεί (REMOVE_BG_API_KEY). Ανεβάστε έτοιμο PNG με διάφανο φόντο.' }, { status: 400 });
  const { imageUrl, issueId } = await req.json();
  if (typeof imageUrl !== 'string' || typeof issueId !== 'string') return NextResponse.json({ error: 'Μη έγκυρο αίτημα.' }, { status: 400 });

  const form = new FormData();
  form.append('image_url', imageUrl);
  form.append('size', 'auto');
  const res = await fetch('https://api.remove.bg/v1.0/removebg', { method: 'POST', headers: { 'X-Api-Key': key }, body: form });
  if (!res.ok) return NextResponse.json({ error: `Η αφαίρεση φόντου απέτυχε (${res.status}).` }, { status: 502 });
  const png = new Uint8Array(await res.arrayBuffer());

  const db = serviceClient();
  if (!db) return NextResponse.json({ error: 'Λείπει το SUPABASE_SERVICE_ROLE_KEY.' }, { status: 500 });
  const path = `issues/${issueId}/img/cutout-${Date.now()}.png`;
  const { error } = await db.storage.from(STORAGE_BUCKET).upload(path, png, { contentType: 'image/png', upsert: true });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ url: db.storage.from(STORAGE_BUCKET).getPublicUrl(path).data.publicUrl });
}
