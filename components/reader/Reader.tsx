'use client';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { BackCover, CoverFront, PageView } from '@/components/pages/Pages';
import { Icon } from '@/components/ui/Icon';
import { ScaledPage } from '@/components/ui/ScaledPage';
import { durationText, fixtureTitle, shortDateTime } from '@/lib/format';
import type { PageDef } from '@/lib/paginator';
import { collectLinks, renderTextures, type LinkRegion, type TextureSet } from '@/lib/textures';
import type { Issue } from '@/lib/types';
import { TextureSheet } from './TextureSheet';

interface BookState {
  turned: number;
  closed: boolean;
  label: { text: string; aria: string };
  zoomed: boolean;
  sound: boolean;
  pages: number[];
  portrait: boolean;
}
interface BookApi {
  next(): void; prev(): void; goTo(p: number): void; open(): void; toStart(): void; zoomOut(): void;
  setSound(on: boolean): void; focus(): void; destroy(): void;
}

export interface ReaderProps {
  issue: Issue;
  pages: PageDef[];
  toc: { title: string; page: number }[];
  /** Play the cover-opening once (first unlock on this device). */
  intro?: boolean;
  /** Admin preview: no analytics, no hash updates. */
  preview?: boolean;
  /** Textures generated elsewhere (admin preview). */
  textures?: TextureSet | null;
  /** Render inside a box instead of the full window. */
  embedded?: boolean;
}

function hasWebGL() {
  try {
    const c = document.createElement('canvas');
    return !!(c.getContext('webgl2') || c.getContext('webgl'));
  } catch {
    return false;
  }
}

function sessionId() {
  try {
    let id = sessionStorage.getItem('kfc_sid');
    if (!id) { id = Math.random().toString(36).slice(2) + Date.now().toString(36); sessionStorage.setItem('kfc_sid', id); }
    return id;
  } catch {
    return 'anon';
  }
}

function hashPage(): number | null {
  const m = typeof location !== 'undefined' ? location.hash.match(/^#page-(\d+)$/) : null;
  return m ? Number(m[1]) : null;
}

export default function Reader({ issue, pages, toc, intro = false, preview = false, textures: given = null, embedded = false }: ReaderProps) {
  const total = pages.length;
  const sheetRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const apiRef = useRef<BookApi | null>(null);
  const [mode, setMode] = useState<'pending' | '3d' | '2d'>('pending');
  const [progress, setProgress] = useState(0);
  const [book, setBook] = useState<BookState | null>(null);
  const [reading, setReading] = useState(false);
  const [viewMode, setViewMode] = useState<'3d' | 'scroll'>('3d');
  const [exportingPdf, setExportingPdf] = useState(false);
  const [thumbs, setThumbs] = useState(false);
  const [menu, setMenu] = useState(false);
  const [toast, setToast] = useState('');
  const [offline, setOffline] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const [tex, setTex] = useState<TextureSet | null>(given);
  const [canFullscreen, setCanFullscreen] = useState(false);

  // 2D viewer state mirrors the 3D "turned" model: 0 = cover, k = spread (2k-2 | 2k-1)
  const [turned2d, setTurned2d] = useState(0);

  useEffect(() => {
    setCanFullscreen(!!document.fullscreenEnabled);
    const t = setInterval(() => setNow(Date.now()), 30000);
    const on = () => setOffline(!navigator.onLine);
    on();
    window.addEventListener('online', on);
    window.addEventListener('offline', on);
    return () => { clearInterval(t); window.removeEventListener('online', on); window.removeEventListener('offline', on); };
  }, []);

  // ---------- choose renderer & build textures ----------
  useEffect(() => {
    let cancelled = false;
    const conn = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
    const reduce2d = conn?.saveData || !hasWebGL();
    const start = hashPage() ?? 0;

    if (reduce2d) {
      setMode('2d');
      setTurned2d(start <= 0 ? 0 : Math.floor(start / 2) + 1);
      return;
    }

    (async () => {
      const sheet = sheetRef.current;
      if (!sheet) return;
      await (document.fonts?.ready ?? Promise.resolve());
      const links: Record<number, LinkRegion[]> = collectLinks(sheet);
      let set = given;
      const m = issue.page_manifest;
      if (!set && m && !preview && m.pages.length === total) set = { pages: m.pages, cover: m.cover, coverMask: m.coverMask, back: m.back };
      if (!set) {
        set = await renderTextures(sheet, { width: 1024, onProgress: (d, t) => !cancelled && setProgress(d / t) });
      }
      if (cancelled) return;
      setTex(set);
      const { mountBook } = await import('@/lib/book-engine');
      if (cancelled || !stageRef.current) return;
      const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      const api = mountBook(stageRef.current, {
        textures: set,
        stage: '#e9e8e8',
        reducedMotion: reduce,
        toolbarSpace: 0.07,
        initialPage: start > 0 ? start : 0,
        links,
        onLink: (g: LinkRegion) => {
          if (g.page) apiRef.current?.goTo(g.page);
          else if (g.href) window.open(g.href, '_blank', 'noopener');
        },
        onChange: (s: BookState) => setBook(s),
        onContextLost: () => { apiRef.current?.destroy(); apiRef.current = null; setMode('2d'); },
      }) as BookApi;
      apiRef.current = api;
      setMode('3d');
    })().catch((err) => {
      console.error(err);
      if (!cancelled) setMode('2d');
    });

    return () => {
      cancelled = true;
      apiRef.current?.destroy();
      apiRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---------- unified state for toolbar ----------
  const portrait2d = typeof window !== 'undefined' && window.innerWidth < window.innerHeight * 0.78;
  const visible: number[] = useMemo(() => {
    if (mode === '3d') return book?.pages ?? [];
    if (turned2d === 0) return [];
    const l = 2 * (turned2d - 1), r = l + 1;
    return [l, r].filter((p) => p >= 1 && p <= total);
  }, [mode, book, turned2d, total]);

  const closed = mode === '3d' ? book?.closed ?? true : turned2d === 0;
  const label = mode === '3d'
    ? book?.label.text ?? 'Εξώφυλλο'
    : visible.length === 0 ? 'Εξώφυλλο' : `Σελ. ${visible.join('–')} / ${total}`;
  const aria = visible.length === 0 ? 'Εξώφυλλο' : visible.length === 1 ? `Σελίδα ${visible[0]} από ${total}` : `Σελίδες ${visible[0]} και ${visible[1]} από ${total}`;

  const next = useCallback(() => {
    if (mode === '3d') apiRef.current?.next();
    else setTurned2d((t) => Math.min(total / 2 + 1, t + 1));
  }, [mode, total]);
  const prev = useCallback(() => {
    if (mode === '3d') apiRef.current?.prev();
    else setTurned2d((t) => Math.max(0, t - 1));
  }, [mode]);
  const goTo = useCallback((p: number) => {
    setThumbs(false); setMenu(false);
    if (mode === '3d') apiRef.current?.goTo(p);
    else setTurned2d(p <= 0 ? 0 : Math.floor(p / 2) + 1);
  }, [mode]);

  // keyboard for 2D + reading mode
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { setReading(false); setThumbs(false); setMenu(false); apiRef.current?.zoomOut(); }
      if (mode !== '2d' && !reading) return;
      if ((e.target as HTMLElement)?.tagName === 'INPUT') return;
      if (e.key === 'ArrowRight') next();
      if (e.key === 'ArrowLeft') prev();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [mode, reading, next, prev]);

  // hash + analytics
  useEffect(() => {
    if (preview) return;
    const first = visible[0];
    const url = first ? `#page-${first}` : location.pathname + location.search;
    history.replaceState(null, '', url);
    if (!visible.length) return;
    const t = setTimeout(() => {
      visible.forEach((p) => {
        fetch('/api/pageview', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ issueId: issue.id, page: p, sessionId: sessionId() }),
          keepalive: true,
        }).catch(() => undefined);
      });
    }, 1200);
    return () => clearTimeout(t);
  }, [visible, preview, issue.id]);

  const scrollToSection = (id: string) => {
    const el = document.getElementById(`section-${id}`);
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  // in-page links inside the HTML pages (2D viewer, scroll view & reading mode)
  const onPageClick = (e: React.MouseEvent) => {
    const a = (e.target as HTMLElement).closest('a[data-page]') as HTMLAnchorElement | null;
    if (a) {
      e.preventDefault();
      const p = Number(a.dataset.page);
      if (viewMode === 'scroll') {
        scrollToSection(`page-${p}`);
      } else {
        goTo(p);
        setReading(false);
      }
    }
  };

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 2400); };

  const downloadPdf = async () => {
    setMenu(false);
    if (exportingPdf) return;
    setExportingPdf(true);
    showToast('Προετοιμασία PDF...');
    try {
      const { exportIssueToPdf } = await import('@/lib/pdf');
      const ok = await exportIssueToPdf(issue, tex, (msg) => showToast(msg));
      if (ok) showToast('Η λήψη του PDF ολοκληρώθηκε!');
    } catch (err) {
      console.error('PDF generation error:', err);
      showToast('Σφάλμα λήψης PDF — άνοιγμα εκτύπωσης...');
      if (typeof window !== 'undefined') window.print();
    } finally {
      setExportingPdf(false);
    }
  };

  const share = async () => {
    setMenu(false);
    const url = `${location.origin}/issue/${issue.number}${visible[0] ? `#page-${visible[0]}` : ''}`;
    try { await navigator.clipboard.writeText(url); showToast('Ο σύνδεσμος αντιγράφηκε'); } catch { showToast(url); }
  };
  const fullscreen = () => {
    setMenu(false);
    if (document.fullscreenElement) document.exitFullscreen();
    else document.documentElement.requestFullscreen().catch(() => undefined);
  };

  const expires = Date.parse(issue.expires_at);
  const availability = expires - now < 86400000 && expires > now ? `Λήγει σε ${durationText(expires - now)}` : now > expires ? 'Αρχείο' : `Διαθέσιμο έως ${shortDateTime(issue.expires_at)}`;

  const pageByNumber = (n: number) => pages.find((p) => p.number === n)!;

  return (
    <div className={`relative flex flex-col overflow-hidden bg-stage text-ink ${embedded ? 'h-full min-h-[520px]' : 'h-[100dvh] min-h-[560px]'}`}>
      <TextureSheet ref={sheetRef} issue={issue} pages={pages} toc={toc} />

      <header className="relative z-20 flex items-center justify-between px-4 py-2.5 text-[13px] sm:px-8 sm:py-3.5 sm:text-sm bg-stage/90 backdrop-blur-sm border-b border-ink/10">
        <div className="flex items-center gap-2">
          <span className="font-semibold">{fixtureTitle(issue)}</span>
          <span className="hidden text-ink-80 sm:inline">· {issue.matchday}η αγωνιστική</span>
          <span className="hidden text-ink-80 md:inline">· {availability}</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={downloadPdf}
            disabled={exportingPdf}
            className="flex items-center gap-1.5 bg-ink px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-black active:scale-95 transition"
            title="Λήψη του Match Programme σε PDF"
          >
            <Icon name="download" size={15} />
            <span>PDF</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode(viewMode === 'scroll' ? '3d' : 'scroll')}
            className="flex items-center gap-1.5 border border-ink/20 bg-white px-3 py-1.5 text-xs font-semibold text-ink shadow-sm hover:bg-neutral-50 active:scale-95 transition"
            title={viewMode === 'scroll' ? 'Προβολή 3D Βιβλίου' : 'Προβολή συνεχούς κύλισης (για κινητά)'}
          >
            <Icon name={viewMode === 'scroll' ? 'book' : 'scroll'} size={15} />
            <span className="hidden xs:inline">{viewMode === 'scroll' ? '3D Βιβλίο' : 'Κύλιση'}</span>
          </button>
        </div>
      </header>

      {offline && (
        <p role="status" className="relative z-20 mx-auto mb-2 bg-ink px-3 py-2 text-center text-[13px] text-white">Χωρίς σύνδεση — οι σελίδες που έχουν φορτώσει παραμένουν διαθέσιμες</p>
      )}

      {/* 3D stage */}
      <div ref={stageRef} className={`absolute inset-0 z-10 ${mode === '3d' ? '' : 'pointer-events-none'}`} />

      {mode === 'pending' && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-6">
          <div className="pointer-events-none w-[min(42vw,260px)] opacity-90">
            <ScaledPage><CoverFront issue={issue} /></ScaledPage>
          </div>
          <div role="progressbar" aria-label="Φόρτωση σελίδων" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress * 100)} className="h-[2px] w-[200px] bg-[#cfcdcd]">
            <div className="h-[2px] bg-ink transition-[width]" style={{ width: `${Math.max(4, progress * 100)}%` }} />
          </div>
        </div>
      )}

      {mode === '2d' && (
        <Flat2D issue={issue} pages={pages} toc={toc} turned={turned2d} total={total} onNext={next} onPrev={prev} onClick={onPageClick} portrait={portrait2d} />
      )}

      {/* screen-reader copy of the visible pages */}
      <div className="sr-only" aria-live="polite">
        <p>{aria}</p>
        {visible.map((n) => (
          <div key={n}><PageView issue={issue} page={pageByNumber(n)} toc={toc} fluid /></div>
        ))}
      </div>

      {/* bottom controls */}
      <div className="pointer-events-none relative z-20 mt-auto flex flex-col items-center gap-2 px-4 pb-5">
        {closed && mode !== 'pending' && (
          <div className="pointer-events-auto flex flex-col items-center gap-2">
            <div className="flex gap-2">
              <button type="button" onClick={() => (mode === '3d' ? apiRef.current?.open() : setTurned2d(1))} className="h-[52px] bg-ink px-7 text-base font-semibold text-white shadow-md hover:bg-black active:scale-95 transition">Άνοιγμα 3D προγράμματος</button>
              <button type="button" onClick={() => setViewMode('scroll')} className="flex items-center gap-2 h-[52px] border border-ink bg-white px-5 text-base font-semibold text-ink shadow-md hover:bg-neutral-50 active:scale-95 transition"><Icon name="scroll" size={18} />Κύλιση</button>
            </div>
            <p className="text-[13px] text-ink-80">ή σύρετε τη δεξιά άκρη του εξωφύλλου</p>
          </div>
        )}
        {!closed && mode === '3d' && <p className="text-[12px] text-ink-80 sm:text-[13px]">{book?.portrait ? 'Σύρετε για αλλαγή σελίδας · διπλό πάτημα για ζουμ' : 'Σύρετε τη γωνία, πατήστε ← → ή κάντε κύλιση · διπλό κλικ για ζουμ'}</p>}
        {!closed && (
          <nav aria-label="Πλοήγηση βιβλίου" className="pointer-events-auto relative flex items-center gap-0.5 bg-ink p-1 text-sm text-white">
            <button type="button" onClick={prev} aria-label="Προηγούμενη σελίδα" title="Προηγούμενη" className="grid h-11 w-11 place-items-center"><Icon name="prev" /></button>
            <button type="button" onClick={() => { setThumbs(true); setMenu(false); }} aria-label={`${aria} · άνοιγμα μικρογραφιών`} title="Μικρογραφίες" className="h-11 min-w-[104px] whitespace-nowrap px-3 tabular-nums">{label}</button>
            <button type="button" onClick={next} aria-label="Επόμενη σελίδα" title="Επόμενη" className="grid h-11 w-11 place-items-center"><Icon name="next" /></button>
            <span aria-hidden="true" className="mx-1 h-6 w-px bg-white/15" />
            {book?.zoomed && (
              <button type="button" onClick={() => apiRef.current?.zoomOut()} title="Σμίκρυνση" aria-label="Σμίκρυνση" className="grid h-11 w-11 place-items-center"><Icon name="zoomOut" /></button>
            )}
            <button type="button" onClick={() => setViewMode('scroll')} title="Προβολή συνεχούς κύλισης για κινητά" className="flex h-11 items-center gap-1.5 px-3 hover:bg-white/10 transition"><Icon name="scroll" size={17} />Κύλιση</button>
            <button type="button" onClick={downloadPdf} disabled={exportingPdf} title="Λήψη PDF" className="flex h-11 items-center gap-1.5 px-3 hover:bg-white/10 transition"><Icon name="download" size={17} />PDF</button>
            <button type="button" onClick={() => setMenu((m) => !m)} aria-label="Περισσότερα" aria-expanded={menu} title="Περισσότερα" className="grid h-11 w-11 place-items-center"><Icon name="more" /></button>
            {menu && (
              <div role="menu" className="absolute bottom-[calc(100%+6px)] right-0 flex min-w-[220px] flex-col bg-ink py-1 text-left text-white shadow-xl">
                <button role="menuitem" type="button" className="flex items-center gap-2 h-11 px-4 text-left hover:bg-white/10" onClick={downloadPdf}>
                  <Icon name="download" size={16} />Λήψη αρχείου PDF
                </button>
                <button role="menuitem" type="button" className="flex items-center gap-2 h-11 px-4 text-left hover:bg-white/10" onClick={() => { setMenu(false); setViewMode('scroll'); }}>
                  <Icon name="scroll" size={16} />Προβολή Κύλισης
                </button>
                <button role="menuitem" type="button" className="h-11 px-4 text-left hover:bg-white/10" onClick={() => goTo(pages.find((p) => p.kind === 'section' && p.section === 'contents' && p.part === 1)?.number ?? 1)}>Περιεχόμενα</button>
                {canFullscreen && <button role="menuitem" type="button" className="h-11 px-4 text-left hover:bg-white/10" onClick={fullscreen}>Πλήρης οθόνη</button>}
                <button role="menuitem" type="button" className="h-11 px-4 text-left hover:bg-white/10" onClick={share}>Κοινοποίηση σελίδας</button>
                {mode === '3d' && (
                  <button role="menuitemcheckbox" aria-checked={!!book?.sound} type="button" className="h-11 px-4 text-left hover:bg-white/10" onClick={() => apiRef.current?.setSound(!book?.sound)}>
                    Ήχος σελίδας: {book?.sound ? 'ναι' : 'όχι'}
                  </button>
                )}
              </div>
            )}
          </nav>
        )}
      </div>

      {toast && <p role="status" className="fixed bottom-24 left-1/2 z-50 -translate-x-1/2 bg-ink px-4 py-3 text-sm text-white">{toast}</p>}

      {thumbs && (
        <div role="dialog" aria-modal="true" aria-label="Σελίδες" className="fixed inset-0 z-40 flex flex-col bg-stage">
          <div className="flex items-center justify-between border-b border-ink px-4 py-2 sm:px-8">
            <span className="text-sm font-semibold">Σελίδες</span>
            <div className="flex items-center gap-1">
              <button type="button" onClick={() => goTo(1)} className="flex h-11 items-center gap-2 px-3 text-sm"><Icon name="first" />Πρώτη</button>
              <button type="button" onClick={() => goTo(total)} className="flex h-11 items-center gap-2 px-3 text-sm">Τελευταία<Icon name="last" /></button>
              <button type="button" onClick={() => setThumbs(false)} aria-label="Κλείσιμο" className="grid h-11 w-11 place-items-center"><Icon name="close" /></button>
            </div>
          </div>
          <div className="grid flex-1 grid-cols-3 content-start gap-4 overflow-y-auto p-4 sm:grid-cols-6 sm:p-8">
            {pages.map((p) => (
              <button type="button" key={p.number} onClick={() => goTo(p.number)} className={`flex flex-col gap-1 text-left text-[12px] ${visible.includes(p.number) ? 'outline outline-2 outline-offset-2 outline-ink' : ''}`}>
                <span className="block w-full overflow-hidden bg-white" style={{ aspectRatio: '495/700' }}>
                  {tex?.pages[p.number - 1] ? (
                    <img src={tex.pages[p.number - 1]} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <span className="block origin-top-left" style={{ transform: 'scale(0.25)', width: 495, height: 700 }}><PageView issue={issue} page={p} toc={toc} /></span>
                  )}
                </span>
                <span className="text-ink-80"><b className="text-ink">{p.number}</b> {p.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {viewMode === 'scroll' && (
        <div role="region" aria-label="Προβολή συνεχούς κύλισης" className="fixed inset-0 z-40 flex flex-col bg-stage text-ink">
          {/* Mobile top sticky header */}
          <header className="sticky top-0 z-30 flex items-center justify-between border-b border-ink/15 bg-white/95 px-4 py-2.5 backdrop-blur shadow-sm">
            <div className="flex items-center gap-2">
              <img src="/brand/symbol-ink.png" alt="" className="h-7 w-auto" />
              <div className="leading-tight">
                <span className="block font-bold text-[13px]">{fixtureTitle(issue)}</span>
                <span className="text-[11px] text-ink-60">{issue.matchday}η αγωνιστική</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={downloadPdf}
                disabled={exportingPdf}
                className="flex items-center gap-1.5 bg-ink px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-black active:scale-95 transition"
                title="Λήψη του Match Programme σε PDF"
              >
                <Icon name="download" size={15} />
                <span>PDF</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('3d')}
                className="flex items-center gap-1.5 border border-ink/20 bg-white px-3 py-1.5 text-xs font-semibold text-ink shadow-sm hover:bg-neutral-50 active:scale-95 transition"
                title="Μετάβαση σε 3D Βιβλίο"
              >
                <Icon name="book" size={15} />
                <span>3D Βιβλίο</span>
              </button>
            </div>
          </header>

          {/* Quick-jump horizontal section chips */}
          <nav aria-label="Ενότητες" className="sticky top-[49px] z-20 flex gap-1.5 overflow-x-auto border-b border-ink/10 bg-neutral-100/95 px-3 py-2 backdrop-blur no-scrollbar text-xs">
            <button type="button" onClick={() => scrollToSection('cover')} className="whitespace-nowrap px-2.5 py-1 font-medium text-ink-80 hover:text-ink hover:bg-white rounded transition">Εξώφυλλο</button>
            {pages.filter(p => p.kind === 'section').map(p => (
              <button
                key={p.number}
                type="button"
                onClick={() => scrollToSection(`page-${p.number}`)}
                className="whitespace-nowrap px-2.5 py-1 font-medium text-ink-80 hover:text-ink hover:bg-white rounded transition"
              >
                {p.label || `Σελ. ${p.number}`}
              </button>
            ))}
            <button type="button" onClick={() => scrollToSection('back-cover')} className="whitespace-nowrap px-2.5 py-1 font-medium text-ink-80 hover:text-ink hover:bg-white rounded transition">Οπισθόφυλλο</button>
          </nav>

          {/* Continuous vertical feed of all pages */}
          <div className="flex-1 overflow-y-auto px-3 py-4 sm:px-6 sm:py-8 overscroll-contain" onClick={onPageClick}>
            <div className="mx-auto max-w-[620px] flex flex-col gap-6">
              {/* Front Cover */}
              <div id="section-cover" className="overflow-hidden bg-ink shadow-lg">
                <CoverFront issue={issue} />
              </div>

              {/* Inside Pages */}
              {pages.map((p) => (
                <div key={p.number} id={`section-page-${p.number}`} className="overflow-hidden bg-white shadow-md">
                  <PageView issue={issue} page={p} toc={toc} fluid />
                </div>
              ))}

              {/* Back Cover */}
              <div id="section-back-cover" className="overflow-hidden bg-ink shadow-lg">
                <BackCover />
              </div>

              {/* Bottom footer in scroll feed */}
              <div className="flex flex-col items-center gap-3 py-8 text-center">
                <button
                  type="button"
                  onClick={downloadPdf}
                  disabled={exportingPdf}
                  className="flex items-center gap-2 bg-ink px-6 py-3 font-semibold text-white shadow-md hover:bg-black transition"
                >
                  <Icon name="download" size={18} />
                  <span>Λήψη πλήρους Match Programme (PDF)</span>
                </button>
                <div className="flex gap-4 text-sm text-ink-80">
                  <button type="button" onClick={() => scrollToSection('cover')} className="underline">Πίσω στην αρχή</button>
                  <span>·</span>
                  <button type="button" onClick={() => setViewMode('3d')} className="underline">Προβολή 3D Βιβλίου</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------------------------------------------------------------- 2D fallback */

function Flat2D({ issue, pages, toc, turned, total, onNext, onPrev, onClick, portrait }: {
  issue: Issue; pages: PageDef[]; toc: { title: string; page: number }[]; turned: number; total: number;
  onNext(): void; onPrev(): void; onClick(e: React.MouseEvent): void; portrait: boolean;
}) {
  const boxRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.8);
  const single = portrait || turned === 0 || turned > total / 2;
  useEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const fit = () => {
      const w = el.clientWidth - 24, h = el.clientHeight - 24;
      setScale(portrait && !(turned === 0 || turned > total / 2) ? w / 495 : Math.min(w / (single ? 495 : 990), h / 700));
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, [single, portrait, turned, total]);

  const l = 2 * (turned - 1), r = l + 1;
  const get = (n: number) => pages.find((p) => p.number === n);
  let content: React.ReactNode;
  if (turned === 0) content = <CoverFront issue={issue} />;
  else if (turned > total / 2) content = <BackCover />;
  else if (portrait) {
    return (
      <div ref={boxRef} className="absolute inset-x-0 bottom-28 top-16 z-10 overflow-y-auto px-3" onClick={onClick}>
        {[l, r].filter((n) => get(n)).map((n) => (
          <div key={n} className="mx-auto mb-3 overflow-hidden bg-white" style={{ width: 495 * scale, height: 700 * scale }}>
            <div style={{ transform: `scale(${scale})`, transformOrigin: 'top left' }}><PageView issue={issue} page={get(n)!} toc={toc} /></div>
          </div>
        ))}
      </div>
    );
  }
  else {
    content = (
      <div className="flex">
        {get(l) ? <PageView issue={issue} page={get(l)!} toc={toc} /> : <div className="kp-page kp-stripes" />}
        {get(r) && <PageView issue={issue} page={get(r)!} toc={toc} />}
      </div>
    );
  }
  return (
    <div ref={boxRef} className="absolute inset-x-0 bottom-28 top-16 z-10 flex items-center justify-center" onClick={onClick}>
      <div style={{ width: (single ? 495 : 990) * scale, height: 700 * scale }} className="relative shadow-[0_18px_30px_-18px_rgba(35,31,32,0.45)]">
        <div style={{ transform: `scale(${scale})`, transformOrigin: 'top left' }}>{content}</div>
        <button type="button" aria-label="Προηγούμενη σελίδα" onClick={onPrev} className="absolute inset-y-0 left-0 w-1/4" />
        <button type="button" aria-label="Επόμενη σελίδα" onClick={onNext} className="absolute inset-y-0 right-0 w-1/4" />
      </div>
    </div>
  );
}
