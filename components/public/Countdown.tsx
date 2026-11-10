'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { durationText, isPlaceholder } from '@/lib/format';
import type { Issue } from '@/lib/types';

export function OpponentCrest({ issue, height }: { issue: Issue; height: string }) {
  if (issue.opponent_crest_url) {
    return <img src={issue.opponent_crest_url} alt={issue.opponent} style={{ height, width: 'auto' }} />;
  }
  // No crest uploaded yet: neutral shield silhouette (never a redrawn club crest)
  return (
    <span
      role="img"
      aria-label={issue.opponent}
      style={{ height, aspectRatio: '0.9', background: '#dcdbdb', clipPath: 'polygon(50% 0, 100% 14%, 100% 58%, 50% 100%, 0 58%, 0 14%)' }}
      className="grid place-items-center px-3 text-center text-[11px] leading-tight text-ink-80"
    >
      {issue.opponent}
    </span>
  );
}

export default function Countdown({ issue, onZero }: { issue: Issue; onZero(): void }) {
  const target = Date.parse(issue.publish_at);
  const [left, setLeft] = useState<number | null>(null);

  useEffect(() => {
    let fired = false;
    const tick = () => {
      const ms = target - Date.now();
      setLeft(ms);
      if (ms <= 0 && !fired) { fired = true; onZero(); }
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [target, onZero]);

  const stadium = isPlaceholder(issue.stadium) ? '' : ` · ${issue.stadium}`;

  return (
    <div className="flex min-h-[100dvh] flex-col overflow-hidden bg-stage text-ink">
      <header className="flex items-center gap-5 pt-6 sm:gap-7 sm:pt-7">
        <div className="h-[2px] flex-1 bg-ink" />
        <img src="/brand/symbol-ink.png" alt="FC Kalamata" className="h-10 w-auto sm:h-[52px]" />
        <div className="h-[2px] flex-1 bg-ink" />
      </header>

      <main className="flex flex-1 flex-col justify-center gap-8 px-4 py-8 sm:gap-14 sm:px-[clamp(24px,6vw,112px)]">
        <div className="flex flex-col items-center justify-center gap-8 lg:flex-row lg:gap-[clamp(32px,6vw,96px)]">
          <div className="flex items-center gap-5 sm:gap-[clamp(20px,3vw,40px)]">
            <img src="/brand/crest.png" alt="Καλαμάτα" className="w-auto" style={{ height: 'clamp(104px, 15vw, 236px)' }} />
            <div className="h-14 w-px bg-ink-60 sm:h-[clamp(70px,8vw,120px)]" />
            <OpponentCrest issue={issue} height="clamp(104px, 15vw, 236px)" />
          </div>
          <h1 className="m-0 text-center font-brand text-[clamp(44px,14.5vw,66px)] font-extrabold leading-[0.86] tracking-[-0.035em] sm:text-[clamp(72px,11vw,120px)] lg:text-left lg:text-[clamp(72px,8.2vw,150px)]">MATCH<br />PROGRAMME</h1>
        </div>

        <div className="flex flex-col items-center gap-2 border-y-2 border-ink py-4 sm:flex-row sm:gap-8 sm:border-0 sm:py-0">
          <div className="hidden h-[2px] flex-1 bg-ink sm:block" />
          <p role="timer" aria-live="off" className="m-0 text-center font-brand text-[24px] font-bold tabular-nums tracking-[-0.01em] sm:whitespace-nowrap sm:text-[clamp(26px,3vw,44px)]">
            {left === null ? ' ' : `Διαθέσιμο σε ${durationText(left)}`}
          </p>
          <div className="hidden h-[2px] flex-1 bg-ink sm:block" />
        </div>

        <div className="flex flex-col items-center gap-4 text-center">
          {issue.countdown_sponsor_url && <img src={issue.countdown_sponsor_url} alt="Χορηγός" className="h-10 w-auto" />}
          <p className="m-0 text-[15px] text-ink-80 sm:text-base">{issue.matchday}η αγωνιστική · {issue.competition}{stadium}</p>
        </div>
      </main>

      <div className="flex justify-center px-4 pb-4 sm:justify-end sm:px-[clamp(24px,6vw,112px)]">
        <Link href="/archive" className="px-2 py-3 text-[15px] font-medium underline underline-offset-4">Προηγούμενα τεύχη</Link>
      </div>
      <div aria-hidden="true" className="stripes-band h-11 sm:h-16" />
      <div aria-hidden="true" className="h-[6px] bg-gold" />
    </div>
  );
}
