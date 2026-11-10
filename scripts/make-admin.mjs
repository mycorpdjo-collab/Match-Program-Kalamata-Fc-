// Gives an existing Supabase Auth user access to /admin.
// 1) Create the user in Supabase → Authentication → Users (email + password).
// 2) node scripts/make-admin.mjs staff@kalamatafc.gr
import { readFileSync, existsSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

for (const f of ['.env.local', '.env']) {
  if (!existsSync(f)) continue;
  for (const line of readFileSync(f, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
}
const email = (process.argv[2] || '').trim().toLowerCase();
if (!email) { console.error('Usage: node scripts/make-admin.mjs <email>'); process.exit(1); }
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
let page = 1, user = null;
while (!user) {
  const { data, error } = await db.auth.admin.listUsers({ page, perPage: 200 });
  if (error) { console.error(error.message); process.exit(1); }
  user = data.users.find((u) => (u.email || '').toLowerCase() === email) || null;
  if (data.users.length < 200) break;
  page++;
}
if (!user) { console.error(`No Supabase user with email ${email}. Create it in Authentication → Users first.`); process.exit(1); }
const { error } = await db.from('admins').upsert({ user_id: user.id });
if (error) { console.error(error.message); process.exit(1); }
console.log(`${email} can now sign in at /admin.`);
