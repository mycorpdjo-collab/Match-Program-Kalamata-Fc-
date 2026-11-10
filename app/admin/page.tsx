'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useAdmin } from '@/components/admin/AdminShell';
import { PHASE_LABEL } from '@/components/admin/IssueEditor';
import { fixtureTitle, phaseOf, shortDateTime } from '@/lib/format';
import { duplicateIssue, newIssue } from '@/lib/templates';
import type { Issue } from '@/lib/types';

export default function IssuesList() {
  const { db } = useAdmin();
  const router = useRouter();
  const [issues, setIssues] = useState<Issue[] | null>(null);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      const { data, error: err } = await db.from('issues').select('*').order('number', { ascending: false });
      if (err) return setError(err.message);
      setIssues(data as Issue[]);
      const c: Record<string, number> = {};
      await Promise.all((data as Issue[]).map(async (i) => {
        const { count } = await db.from('subscribers').select('id', { count: 'exact', head: true }).eq('issue_id', i.id);
        c[i.id] = count ?? 0;
      }));
      setCounts(c);
    })();
  }, [db]);

  const create = async (from?: Issue) => {
    setBusy(true);
    const payload = from ? duplicateIssue(from) : newIssue();
    const { data, error: err } = await db.from('issues').insert(payload).select('id').single();
    setBusy(false);
    if (err) return setError(err.message);
    router.push(`/admin/issues/${data.id}`);
  };

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-8">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <h1 className="m-0 font-brand text-[32px] font-extrabold tracking-[-0.02em]">Τεύχη</h1>
        <div className="flex gap-2">
          <button type="button" disabled={busy} onClick={() => create()} className="h-11 border border-ink px-4">Νέο τεύχος</button>
          <button type="button" disabled={busy || !issues?.length} onClick={() => issues && create(issues[0])} className="h-11 bg-ink px-4 font-semibold text-white disabled:opacity-50">
            Αντιγραφή τελευταίου τεύχους{issues?.[0] ? ` (${String(issues[0].number).padStart(2, '0')})` : ''}
          </button>
        </div>
      </div>
      <p className="mb-6 max-w-[70ch] text-[14px] text-ink-80">Η αντιγραφή κρατά αποστολή, επιτελείο, ιδιοκτήτη, μεταγραφές, στατιστικά και χορηγούς, και καθαρίζει τα στοιχεία του αγώνα.</p>
      {error && <p role="alert" className="mb-4">{error}</p>}
      {!issues && !error && <p>Φόρτωση…</p>}
      {issues?.length === 0 && <p>Δεν υπάρχουν τεύχη ακόμη. Δημιουργήστε το πρώτο με «Νέο τεύχος» ή τρέξτε <code>npm run seed</code>.</p>}
      {!!issues?.length && (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] border-collapse text-[14px]">
            <thead>
              <tr className="border-b-2 border-ink text-left text-[12px] text-ink-80">
                <th className="py-2 pr-3">Τεύχος</th><th className="py-2 pr-3">Αγώνας</th><th className="py-2 pr-3">Αγωνιστική</th><th className="py-2 pr-3">Κατάσταση</th><th className="py-2 pr-3">Ανοίγει</th><th className="py-2 pr-3 text-right">Εγγραφές</th><th className="py-2" />
              </tr>
            </thead>
            <tbody>
              {issues.map((i) => {
                const ph = phaseOf(i);
                return (
                  <tr key={i.id} className="border-b border-[#ecebeb]">
                    <td className="py-3 pr-3 font-brand font-extrabold">{String(i.number).padStart(2, '0')}</td>
                    <td className="py-3 pr-3 font-semibold">{i.opponent ? fixtureTitle(i) : '—'}</td>
                    <td className="py-3 pr-3">{i.matchday}η</td>
                    <td className="py-3 pr-3"><span className={`px-2 py-1 text-[12px] ${ph === 'live' ? 'bg-ink text-white' : 'border border-ink'}`}>{PHASE_LABEL[ph]}</span></td>
                    <td className="py-3 pr-3 text-ink-80">{shortDateTime(i.publish_at)}</td>
                    <td className="py-3 pr-3 text-right tabular-nums">{counts[i.id] ?? '…'}</td>
                    <td className="py-3 text-right">
                      <Link href={`/admin/issues/${i.id}`} className="mr-3 underline underline-offset-4">Επεξεργασία</Link>
                      {i.status === 'published' && <a href={`/issue/${i.number}`} target="_blank" rel="noreferrer" className="underline underline-offset-4">Προβολή</a>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
