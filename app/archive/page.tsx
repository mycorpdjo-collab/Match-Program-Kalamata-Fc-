import Link from 'next/link';
import ArchiveGrid from '@/components/public/ArchiveGrid';
import { listArchive } from '@/lib/data';
import { paginate } from '@/lib/paginator';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Αρχείο · Match Programme · Καλαμάτα' };

export default async function Archive() {
  const issues = (await listArchive()).map((i) => ({ ...i, pageCount: paginate(i).length }));
  return (
    <div className="min-h-[100dvh] bg-stage text-ink">
      <header className="flex items-center gap-5 pt-6">
        <div className="h-[2px] flex-1 bg-ink" />
        <Link href="/" aria-label="Αρχική"><img src="/brand/symbol-ink.png" alt="FC Kalamata" className="h-10 w-auto" /></Link>
        <div className="h-[2px] flex-1 bg-ink" />
      </header>
      <main className="mx-auto max-w-6xl px-4 py-10 sm:px-8">
        <h1 className="mb-8 font-brand text-[40px] font-extrabold tracking-[-0.03em] sm:text-[56px]">Προηγούμενα τεύχη</h1>
        <ArchiveGrid issues={issues} />
      </main>
    </div>
  );
}
