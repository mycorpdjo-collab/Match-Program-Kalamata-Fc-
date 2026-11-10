'use client';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import { CoverFront } from '@/components/pages/Pages';
import { ScaledPage } from '@/components/ui/ScaledPage';
import { fixtureTitle } from '@/lib/format';
import type { Issue } from '@/lib/types';

export default function ArchiveGrid({ issues }: { issues: (Issue & { pageCount: number })[] }) {
  const [q, setQ] = useState('');
  const list = useMemo(() => {
    const s = q.trim().toLocaleLowerCase('el').normalize('NFD').replace(/\p{Diacritic}/gu, '');
    if (!s) return issues;
    return issues.filter((i) => `${i.opponent} ${i.season} ${i.number}`.toLocaleLowerCase('el').normalize('NFD').replace(/\p{Diacritic}/gu, '').includes(s));
  }, [q, issues]);

  return (
    <>
      <div className="mb-8 flex flex-col gap-2 sm:max-w-sm">
        <label htmlFor="arch-q" className="text-sm font-semibold">Αναζήτηση</label>
        <input id="arch-q" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Αντίπαλος ή σεζόν" className="h-12 rounded-none border border-ink bg-white px-4 text-base" />
      </div>
      {list.length === 0 && <p className="text-ink-80">Δεν βρέθηκαν τεύχη. Δοκιμάστε άλλο όνομα ομάδας ή σεζόν.</p>}
      <ul className="grid list-none grid-cols-2 gap-x-5 gap-y-10 p-0 sm:grid-cols-3 lg:grid-cols-5">
        {list.map((i) => (
          <li key={i.id}>
            <Link href={`/issue/${i.number}`} className="group flex flex-col gap-3 no-underline">
              <span className="block shadow-[0_14px_24px_-16px_rgba(35,31,32,0.55)] transition-transform duration-300 group-hover:-translate-y-1 motion-reduce:transition-none">
                {i.page_manifest?.cover ? (
                  <img src={i.page_manifest.cover} alt="" className="block aspect-[495/700] w-full object-cover" />
                ) : (
                  <ScaledPage><CoverFront issue={i} /></ScaledPage>
                )}
              </span>
              <span className="text-sm">
                <b className="block">Τεύχος {String(i.number).padStart(2, '0')} · {fixtureTitle(i)}</b>
                <span className="text-ink-80">{i.season} · {i.pageCount} σελίδες</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}
