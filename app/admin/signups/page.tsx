'use client';
import { useEffect, useMemo, useState } from 'react';
import { useAdmin } from '@/components/admin/AdminShell';
import { fixtureTitle, shortDateTime } from '@/lib/format';
import type { Issue } from '@/lib/types';

interface Sub { id: string; email: string; marketing_consent: boolean; consented_at: string | null; created_at: string; utm_source: string | null; utm_medium: string | null; utm_campaign: string | null; unsubscribed_at: string | null }

function csv(rows: Sub[]) {
  const head = ['email', 'marketing_consent', 'consented_at', 'created_at', 'utm_source', 'utm_medium', 'utm_campaign', 'unsubscribed_at'];
  const esc = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  return [head.join(','), ...rows.map((r) => head.map((h) => esc(r[h as keyof Sub])).join(','))].join('\n');
}

export default function Signups() {
  const { db } = useAdmin();
  const [issues, setIssues] = useState<Issue[]>([]);
  const [issueId, setIssueId] = useState('');
  const [rows, setRows] = useState<Sub[] | null>(null);
  const [q, setQ] = useState('');
  const [onlyConsent, setOnlyConsent] = useState(false);

  useEffect(() => {
    db.from('issues').select('id,number,opponent,is_home').order('number', { ascending: false }).then(({ data }) => {
      const list = (data ?? []) as Issue[];
      setIssues(list);
      if (list[0]) setIssueId(list[0].id);
    });
  }, [db]);

  useEffect(() => {
    if (!issueId) return;
    setRows(null);
    db.from('subscribers').select('*').eq('issue_id', issueId).order('created_at', { ascending: false }).limit(10000).then(({ data }) => setRows((data ?? []) as Sub[]));
  }, [db, issueId]);

  const filtered = useMemo(() => (rows ?? []).filter((r) => (!onlyConsent || (r.marketing_consent && !r.unsubscribed_at)) && r.email.includes(q.trim().toLowerCase())), [rows, q, onlyConsent]);
  const issue = issues.find((i) => i.id === issueId);

  const download = () => {
    const blob = new Blob(['﻿' + csv(filtered)], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `eggrafes-teuxos-${issue?.number ?? ''}${onlyConsent ? '-sygkatathesi' : ''}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };
  const unsubscribe = async (r: Sub) => {
    if (!confirm(`Κατάργηση συγκατάθεσης για ${r.email};`)) return;
    await db.from('subscribers').update({ marketing_consent: false, unsubscribed_at: new Date().toISOString() }).eq('id', r.id);
    setRows((rs) => rs?.map((x) => (x.id === r.id ? { ...x, marketing_consent: false, unsubscribed_at: new Date().toISOString() } : x)) ?? null);
  };
  const remove = async (r: Sub) => {
    if (!confirm(`Οριστική διαγραφή του ${r.email} από το τεύχος;`)) return;
    await db.from('subscribers').delete().eq('id', r.id);
    setRows((rs) => rs?.filter((x) => x.id !== r.id) ?? null);
  };

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-8">
      <h1 className="mb-6 font-brand text-[32px] font-extrabold tracking-[-0.02em]">Εγγραφές</h1>
      <div className="mb-6 flex flex-wrap items-end gap-4">
        <label className="flex flex-col gap-1.5 text-[13px] font-semibold">Τεύχος
          <select value={issueId} onChange={(e) => setIssueId(e.target.value)} className="h-11 min-w-[260px] rounded-none border border-ink bg-white px-3 font-normal">
            {issues.map((i) => <option key={i.id} value={i.id}>{String(i.number).padStart(2, '0')} · {i.opponent ? fixtureTitle(i) : 'χωρίς αντίπαλο'}</option>)}
          </select>
        </label>
        <label className="flex flex-col gap-1.5 text-[13px] font-semibold">Αναζήτηση
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="email" className="h-11 rounded-none border border-ink px-3 font-normal" />
        </label>
        <label className="flex h-11 items-center gap-2 text-[14px]"><input type="checkbox" checked={onlyConsent} onChange={(e) => setOnlyConsent(e.target.checked)} className="h-5 w-5 accent-ink" />Μόνο με συγκατάθεση για ενημερώσεις</label>
        <button type="button" onClick={download} disabled={!filtered.length} className="ml-auto h-11 bg-ink px-4 font-semibold text-white disabled:opacity-50">Εξαγωγή CSV ({filtered.length})</button>
      </div>
      {!rows && <p>Φόρτωση…</p>}
      {rows && !filtered.length && <p className="text-ink-80">Δεν υπάρχουν εγγραφές για αυτά τα φίλτρα.</p>}
      {!!filtered.length && (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] border-collapse text-[14px]">
            <thead><tr className="border-b-2 border-ink text-left text-[12px] text-ink-80"><th className="py-2 pr-3">Email</th><th className="py-2 pr-3">Ενημερώσεις</th><th className="py-2 pr-3">Ημερομηνία</th><th className="py-2 pr-3">Πηγή</th><th className="py-2" /></tr></thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.id} className="border-b border-[#ecebeb]">
                  <td className="py-2.5 pr-3">{r.email}</td>
                  <td className="py-2.5 pr-3">{r.unsubscribed_at ? 'Διαγράφηκε' : r.marketing_consent ? 'Ναι' : 'Όχι'}</td>
                  <td className="py-2.5 pr-3 text-ink-80">{shortDateTime(r.created_at)}</td>
                  <td className="py-2.5 pr-3 text-ink-80">{[r.utm_source, r.utm_medium, r.utm_campaign].filter(Boolean).join(' / ') || '—'}</td>
                  <td className="whitespace-nowrap py-2.5 text-right">
                    {r.marketing_consent && !r.unsubscribed_at && <button type="button" onClick={() => unsubscribe(r)} className="mr-3 underline underline-offset-4">Κατάργηση συγκατάθεσης</button>}
                    <button type="button" onClick={() => remove(r)} className="underline underline-offset-4">Διαγραφή</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
