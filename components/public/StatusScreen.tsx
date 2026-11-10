import Link from 'next/link';
import type { ReactNode } from 'react';

export default function StatusScreen({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="flex min-h-[100dvh] flex-col bg-stage text-ink">
      <main className="flex flex-1 flex-col items-center justify-center gap-6 px-4 text-center">
        <img src="/brand/symbol-ink.png" alt="FC Kalamata" className="h-24 w-auto" />
        <h1 className="m-0 max-w-[22ch] font-brand text-[28px] font-extrabold leading-tight tracking-[-0.02em] sm:text-[36px]">{title}</h1>
        {children}
        <Link href="/archive" className="px-2 py-3 text-[15px] font-medium underline underline-offset-4">Προηγούμενα τεύχη</Link>
      </main>
      <div aria-hidden="true" className="stripes-band h-11 sm:h-16" />
      <div aria-hidden="true" className="h-[6px] bg-gold" />
    </div>
  );
}
