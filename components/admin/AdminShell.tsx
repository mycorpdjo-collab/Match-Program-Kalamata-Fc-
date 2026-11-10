'use client';
import type { Session, SupabaseClient } from '@supabase/supabase-js';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { browserClient } from '@/lib/supabase/browser';

interface Ctx { db: SupabaseClient; session: Session }
const AdminCtx = createContext<Ctx | null>(null);
export const AdminProvider = AdminCtx.Provider;
export function useAdmin() {
  const c = useContext(AdminCtx);
  if (!c) throw new Error('useAdmin outside AdminShell');
  return c;
}

const NAV = [
  { href: '/admin', label: 'Τεύχη' },
  { href: '/admin/signups', label: 'Εγγραφές' },
  { href: '/admin/analytics', label: 'Στατιστικά επισκέψεων' },
];

export default function AdminShell({ children }: { children: ReactNode }) {
  const db = browserClient();
  const path = usePathname();
  const [session, setSession] = useState<Session | null>(null);
  const [state, setState] = useState<'loading' | 'out' | 'denied' | 'ok'>('loading');

  useEffect(() => {
    if (!db) return;
    const check = async (s: Session | null) => {
      setSession(s);
      if (!s) return setState('out');
      const { data } = await db.from('admins').select('user_id').eq('user_id', s.user.id).maybeSingle();
      setState(data ? 'ok' : 'denied');
    };
    db.auth.getSession().then(({ data }) => check(data.session));
    const { data: sub } = db.auth.onAuthStateChange((_e, s) => check(s));
    return () => sub.subscription.unsubscribe();
  }, [db]);

  if (!db) {
    return (
      <Centered title="Η διαχείριση χρειάζεται σύνδεση με Supabase">
        <p>Η ιστοσελίδα τρέχει σε λειτουργία επίδειξης. Συμπληρώστε τα κλειδιά Supabase στο αρχείο <code>.env.local</code> (δείτε το README) και επανεκκινήστε.</p>
      </Centered>
    );
  }
  if (state === 'loading') return <Centered title="Φόρτωση…" />;
  if (state === 'out') return <Login db={db} />;
  if (state === 'denied') {
    return (
      <Centered title="Ο λογαριασμός δεν έχει πρόσβαση">
        <p>Συνδεθήκατε ως {session?.user.email}. Ζητήστε από τον διαχειριστή να εκτελέσει <code>node scripts/make-admin.mjs {session?.user.email}</code>.</p>
        <button type="button" className="mt-4 h-11 border border-ink px-4" onClick={() => db.auth.signOut()}>Αποσύνδεση</button>
      </Centered>
    );
  }
  return (
    <AdminCtx.Provider value={{ db, session: session! }}>
      <div className="min-h-[100dvh] bg-white text-ink">
        <header className="flex flex-wrap items-center gap-4 bg-ink px-4 py-2 text-white sm:px-6">
          <img src="/brand/symbol-white.png" alt="FC Kalamata" className="h-7 w-auto" />
          <span className="font-semibold">Match Programme · Διαχείριση</span>
          <nav aria-label="Διαχείριση" className="flex flex-wrap gap-1 sm:ml-6">
            {NAV.map((n) => {
              const on = n.href === '/admin' ? path === '/admin' || path.startsWith('/admin/issues') : path.startsWith(n.href);
              return (
                <Link key={n.href} href={n.href} aria-current={on ? 'page' : undefined} className={`px-3 py-2.5 no-underline ${on ? 'border-b-2 border-gold text-white' : 'text-white/70 hover:text-white'}`}>{n.label}</Link>
              );
            })}
          </nav>
          <span className="ml-auto text-[13px] text-white/70">{session?.user.email}</span>
          <button type="button" onClick={() => db.auth.signOut()} className="h-9 px-3 text-[13px] text-white/80 hover:text-white">Αποσύνδεση</button>
        </header>
        {children}
      </div>
    </AdminCtx.Provider>
  );
}

function Centered({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="grid min-h-[100dvh] place-items-center bg-stage px-4">
      <div className="w-full max-w-md bg-white p-8 text-[15px] leading-relaxed text-ink">
        <img src="/brand/symbol-ink.png" alt="" className="mb-6 h-12 w-auto" />
        <h1 className="mb-3 font-brand text-2xl font-extrabold">{title}</h1>
        {children}
      </div>
    </div>
  );
}

function Login({ db }: { db: SupabaseClient }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    const { error: err } = await db.auth.signInWithPassword({ email: email.trim(), password });
    if (err) setError('Λάθος email ή κωδικός. Ελέγξτε τα στοιχεία και δοκιμάστε ξανά.');
    setBusy(false);
  };
  return (
    <Centered title="Σύνδεση προσωπικού">
      <form onSubmit={submit} className="flex flex-col gap-4">
        <label className="flex flex-col gap-1.5 text-sm font-semibold">Email
          <input type="email" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)} className="h-11 rounded-none border border-ink px-3 font-normal" />
        </label>
        <label className="flex flex-col gap-1.5 text-sm font-semibold">Κωδικός
          <input type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} className="h-11 rounded-none border border-ink px-3 font-normal" />
        </label>
        {error && <p role="alert" className="m-0 text-sm">{error}</p>}
        <button type="submit" disabled={busy} className="h-12 bg-ink font-semibold text-white">{busy ? 'Σύνδεση…' : 'Σύνδεση'}</button>
      </form>
    </Centered>
  );
}
