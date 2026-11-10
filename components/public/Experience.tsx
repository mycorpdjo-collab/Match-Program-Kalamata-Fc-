'use client';
import dynamic from 'next/dynamic';
import { useCallback, useEffect, useState } from 'react';
import type { PageDef } from '@/lib/paginator';
import type { Issue, IssuePhase } from '@/lib/types';
import Countdown from './Countdown';
import Gate from './Gate';

const Reader = dynamic(() => import('@/components/reader/Reader'), { ssr: false });

interface Props {
  issue: Issue;
  pages: PageDef[];
  toc: { title: string; page: number }[];
  phase: IssuePhase;
  unlocked: boolean;
}

/** "/" and "/issue/[n]": countdown → gate → book, in place. */
export default function Experience({ issue, pages, toc, phase, unlocked }: Props) {
  const [stage, setStage] = useState<'countdown' | 'gate' | 'book'>(phase === 'scheduled' ? 'countdown' : unlocked ? 'book' : 'gate');
  const [intro, setIntro] = useState(false);

  // one "visit" per tab session (page 0) so staff can see conversion from visit to sign-up
  useEffect(() => {
    try {
      const key = `kfc_visit_${issue.id}`;
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, '1');
      let sid = sessionStorage.getItem('kfc_sid');
      if (!sid) { sid = Math.random().toString(36).slice(2) + Date.now().toString(36); sessionStorage.setItem('kfc_sid', sid); }
      fetch('/api/pageview', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ issueId: issue.id, page: 0, sessionId: sid }), keepalive: true }).catch(() => undefined);
    } catch { /* storage blocked */ }
  }, [issue.id]);

  const onZero = useCallback(() => setStage(unlocked ? 'book' : 'gate'), [unlocked]);
  const onUnlocked = useCallback(() => {
    setIntro(true);
    setStage('book');
  }, []);

  if (stage === 'countdown') return <Countdown issue={issue} onZero={onZero} />;
  if (stage === 'gate') return <Gate issue={issue} onUnlocked={onUnlocked} />;
  return <Reader issue={issue} pages={pages} toc={toc} intro={intro} />;
}
