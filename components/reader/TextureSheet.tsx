'use client';
import { forwardRef } from 'react';
import { BackCover, CoverFront, PageView } from '@/components/pages/Pages';
import type { PageDef } from '@/lib/paginator';
import type { Issue } from '@/lib/types';

interface Props {
  issue: Issue;
  pages: PageDef[];
  toc: { title: string; page: number }[];
}

/** Off-screen copy of every page at print size: source for textures and link regions. */
export const TextureSheet = forwardRef<HTMLDivElement, Props>(function TextureSheet({ issue, pages, toc }, ref) {
  const box = { width: 495, height: 700, overflow: 'hidden' as const };
  return (
    <div ref={ref} aria-hidden="true" style={{ position: 'fixed', left: -12000, top: 0, width: 495, pointerEvents: 'none', zIndex: -1 }}>
      <div data-tex="cover" style={box}><CoverFront issue={issue} /></div>
      <div data-tex="cover-mask" style={box}><CoverFront issue={issue} mask /></div>
      <div data-tex="back" style={box}><BackCover /></div>
      {pages.map((p) => (
        <div key={p.number} data-tex="page" data-number={p.number} style={box}>
          <PageView issue={issue} page={p} toc={toc} />
        </div>
      ))}
    </div>
  );
});
