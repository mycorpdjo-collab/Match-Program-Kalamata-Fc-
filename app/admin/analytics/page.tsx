'use client';
import { useEffect, useMemo, useState } from 'react';
import { useAdmin } from '@/components/admin/AdminShell';
import { fixtureTitle } from '@/lib/format';
import type { Issue } from '@/lib/types';

interface View { page_index: number; session_id: string }

export default function Analytics() {
  const { db } = useAdmin();
  const [issues, setIssues] = useState<Issue[]>([]);
  const [issueId, setIssueId] = useState('');
  const [views, setViews] = useState<View[] | null>(null);
  const [signups, setSignups] = useState(0);

  useEffect(() => {
    db.from('issues').select('id,number,opponent,is_home').order('number', { ascending: false }).then(({ data }) => {
      const list = (data ?? []) as Issue[];
      setIssues(list);
      if (list[0]) setIssueId(list[0].id);
    });
  }, [db]);

  useEffect(() => {
    if (!issueId) return;
    setViews(null);
    (async () => {
      const all: View[] = [];
      for (let from = 0; ; from += 1000) {
        const { data } = await db.from('page_views').select('page_index,session_id').eq('issue_id', issueId).range(from, from + 999);
        all.push(...((data ?? []) as View[]));
        if (!data || data.length < 1000 || all.length > 200000) break;
      }
      const { count } = await db.from('subscribers').select('id', { count: 'exact', head: true }).eq('issue_id', issueId);
      setSignups(count ?? 0);
      setViews(all);
    })();
  }, [db, issueId]);

  const stats = useMemo(() => {
    if (!views) return null;
    const sessions = new Map<string, Set<number>>();
    const perPage = new Map<number, number>();
    const visitors = new Set<string>();
    for (const v of views) {
      visitors.add(v.session_id);
      if (v.page_index === 0) continue;
      if (!sessions.has(v.session_id)) sessions.set(v.session_id, new Set());
      sessions.get(v.session_id)!.add(v.page_index);
      perPage.set(v.page_index, (perPage.get(v.page_index) ?? 0) + 1);
    }
    const readers = sessions.size;
    const avg = readers ? [...sessions.values()].reduce((a, s) => a + s.size, 0) / readers : 0;
    const visits = visitors.size;
    const top = [...perPage.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8);
    return { visits, readers, avg, top, max: top[0]?.[1] ?? 1 };
  }, [views]);

  return (
    <main className="mx-auto max-w-5xl px-4 py-8 sm:px-8">
      <h1 className="mb-6 font-brand text-[32px] font-extrabold tracking-[-0.02em]">Στατιστικά επισκέψεων</h1>
      <label className="mb-8 flex max-w-sm flex-col gap-1.5 text-[13px] font-semibold">Τεύχος
        <select value={issueId} onChange={(e) => setIssueId(e.target.value)} className="h-11 rounded-none border border-ink bg-white px-3 font-normal">
          {issues.map((i) => <option key={i.id} value={i.id}>{String(i.number).padStart(2, '0')} · {i.opponent ? fixtureTitle(i) : 'χωρίς αντίπαλο'}</option>)}
        </select>
      </label>
      {!stats && <p>Φόρτωση…</p>}
      {stats && (
        <>
          <dl className="mb-10 grid grid-cols-2 border-t-2 border-ink sm:grid-cols-4">
            {[
              ['Επισκέψεις', stats.visits.toLocaleString('el-GR')],
              ['Εγγραφές', signups.toLocaleString('el-GR')],
              ['Μετατροπή', stats.visits ? `${Math.min(100, Math.round((signups / stats.visits) * 100))}%` : '—'],
              ['Μέσος όρος σελίδων', stats.avg.toLocaleString('el-GR', { maximumFractionDigits: 1 })],
            ].map(([l, v], i) => (
              <div key={l} className={`py-4 ${i ? 'sm:border-l sm:border-[#ecebeb] sm:pl-5' : ''}`}>
                <dt className="text-[13px] text-ink-80">{l}</dt>
                <dd className="m-0 mt-1 font-brand text-[34px] font-extrabold tracking-[-0.02em]">{v}</dd>
              </div>
            ))}
          </dl>
          <h2 className="mb-3 font-brand text-xl font-extrabold">Σελίδες με τις περισσότερες προβολές</h2>
          {!stats.top.length && <p className="text-ink-80">Δεν υπάρχουν ακόμη προβολές για αυτό το τεύχος.</p>}
          <ol className="m-0 flex list-none flex-col gap-2 p-0">
            {stats.top.map(([page, n]) => (
              <li key={page} className="grid grid-cols-[80px_1fr_70px] items-center gap-3 text-[14px]">
                <span>Σελ. {page}</span>
                <span className="h-3 bg-stage"><span className="block h-3 bg-ink" style={{ width: `${(n / stats.max) * 100}%` }} /></span>
                <span className="text-right tabular-nums">{n.toLocaleString('el-GR')}</span>
              </li>
            ))}
          </ol>
          <p className="mt-6 text-[12px] text-ink-80">Επισκέψεις = μοναδικές συνεδρίες στη σελίδα του τεύχους. Μετατροπή = εγγραφές ως ποσοστό των επισκέψεων. Μέσος όρος σελίδων = ανά αναγνώστη που άνοιξε το πρόγραμμα. Οι προβολές μετρώνται ανά σελίδα που έμεινε ανοιχτή πάνω από ένα δευτερόλεπτο.</p>
        </>
      )}
    </main>
  );
}
