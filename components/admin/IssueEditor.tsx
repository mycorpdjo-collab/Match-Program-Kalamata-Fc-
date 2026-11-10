'use client';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { CoverFront, PageView } from '@/components/pages/Pages';
import { TextureSheet } from '@/components/reader/TextureSheet';
import { Icon } from '@/components/ui/Icon';
import { fromAthensInput, toAthensInput } from '@/lib/athens-time';
import { fixtureTitle, issueLabel, phaseOf, PLACEHOLDER } from '@/lib/format';
import { paginate, tableOfContents } from '@/lib/paginator';
import { SECTION_SCHEMA, SECTION_TITLES } from '@/lib/schema';
import { dataUrlToBlob, renderTextures } from '@/lib/textures';
import type { Issue, PageManifest, Section, SectionType } from '@/lib/types';
import { uploadBlob } from '@/lib/upload';
import { countBySection, missingFields } from '@/lib/validate';
import { useAdmin } from './AdminShell';
import { FieldEditor, ImageField, inputCls } from './FieldEditor';

const Reader = dynamic(() => import('@/components/reader/Reader'), { ssr: false });

export const PHASE_LABEL = { draft: 'Πρόχειρο', scheduled: 'Προγραμματισμένο', live: 'Ενεργό', archived: 'Αρχείο' } as const;

type Tab = 'settings' | 'cover' | SectionType;

function Label({ htmlFor, children }: { htmlFor: string; children: React.ReactNode }) {
  return <label htmlFor={htmlFor} className="text-[13px] font-semibold">{children}</label>;
}

export default function IssueEditor({ initial }: { initial: Issue }) {
  const { db } = useAdmin();
  const router = useRouter();
  const [issue, setIssue] = useState<Issue>(initial);
  const [saved, setSaved] = useState<string>(JSON.stringify(initial));
  const [tab, setTab] = useState<Tab>('settings');
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const [preview3d, setPreview3d] = useState(false);
  const [publish, setPublish] = useState<null | { step: string; done: number; total: number; error?: string }>(null);
  const [bgBusy, setBgBusy] = useState(false);
  const sheetRef = useRef<HTMLDivElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const [overflow, setOverflow] = useState<number[]>([]);

  const dirty = JSON.stringify(issue) !== saved;
  const pages = useMemo(() => paginate(issue), [issue]);
  const toc = useMemo(() => tableOfContents(issue, pages), [issue, pages]);
  const missing = useMemo(() => missingFields(issue), [issue]);
  const counts = countBySection(missing);
  const phase = phaseOf(issue);

  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => { if (dirty) { e.preventDefault(); e.returnValue = ''; } };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  const set = <K extends keyof Issue>(k: K, v: Issue[K]) => setIssue((i) => ({ ...i, [k]: v }));
  const setSection = (type: SectionType, patch: Partial<Section>) =>
    setIssue((i) => ({ ...i, sections: i.sections.map((s) => (s.type === type ? ({ ...s, ...patch } as Section) : s)) }));

  const save = async (extra: Partial<Issue> = {}) => {
    setSaving(true);
    setMsg('');
    const next = { ...issue, ...extra };
    const { id, created_at: _c, ...rest } = next;
    void _c;
    const { error } = await db.from('issues').update(rest).eq('id', id);
    setSaving(false);
    if (error) { setMsg(`Η αποθήκευση απέτυχε: ${error.message}`); return false; }
    setIssue(next);
    setSaved(JSON.stringify(next));
    setMsg('Αποθηκεύτηκε');
    setTimeout(() => setMsg(''), 2000);
    return true;
  };

  const runPublish = async () => {
    if (missing.length) { setPublish({ step: 'blocked', done: 0, total: 0 }); return; }
    const sheet = sheetRef.current;
    if (!sheet) return;
    try {
      setPublish({ step: 'Δημιουργία σελίδων', done: 0, total: pages.length + 3 });
      const tex = await renderTextures(sheet, { width: 1024, onProgress: (d, t) => setPublish({ step: 'Δημιουργία σελίδων', done: d, total: t }) });
      const version = Date.now().toString(36);
      const base = `issues/${issue.id}/pages/${version}`;
      const files: [string, string][] = [['cover.jpg', tex.cover], ['cover-mask.png', tex.coverMask], ['back.jpg', tex.back], ...tex.pages.map((u, i) => [`p${i + 1}.jpg`, u] as [string, string])];
      const urls: Record<string, string> = {};
      let done = 0;
      for (const [name, data] of files) {
        setPublish({ step: 'Ανέβασμα σελίδων', done, total: files.length });
        urls[name] = await uploadBlob(db, `${base}/${name}`, dataUrlToBlob(data));
        done++;
      }
      const manifest: PageManifest = { version, cover: urls['cover.jpg'], coverMask: urls['cover-mask.png'], back: urls['back.jpg'], pages: tex.pages.map((_, i) => urls[`p${i + 1}.jpg`]) };
      setPublish({ step: 'Αποθήκευση', done: files.length, total: files.length });
      const ok = await save({ status: 'published', page_manifest: manifest });
      if (!ok) throw new Error('Η αποθήκευση απέτυχε.');
      setPublish({ step: 'Δημοσιεύτηκε', done: files.length, total: files.length });
    } catch (e) {
      setPublish((p) => ({ step: p?.step ?? '', done: p?.done ?? 0, total: p?.total ?? 0, error: e instanceof Error ? e.message : 'Άγνωστο σφάλμα' }));
    }
  };

  const unpublish = async () => {
    if (!confirm(`Απόσυρση του «${issueLabel(issue)} · ${fixtureTitle(issue)}»; Θα επιστρέψει σε πρόχειρο και δεν θα εμφανίζεται στο κοινό.`)) return;
    await save({ status: 'draft' });
  };
  const remove = async () => {
    const name = `${issueLabel(issue)} · ${fixtureTitle(issue)}`;
    if (prompt(`Για διαγραφή, γράψτε τον αριθμό του τεύχους (${issue.number}).\n«${name}» και οι εγγραφές του θα διαγραφούν οριστικά.`) !== String(issue.number)) return;
    const { error } = await db.from('issues').delete().eq('id', issue.id);
    if (error) return setMsg(`Η διαγραφή απέτυχε: ${error.message}`);
    router.push('/admin');
  };

  const removeBg = async () => {
    if (!issue.cover_photo_url) return;
    setBgBusy(true);
    setMsg('');
    try {
      const { data } = await db.auth.getSession();
      const res = await fetch('/api/admin/remove-bg', { method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${data.session?.access_token}` }, body: JSON.stringify({ imageUrl: issue.cover_photo_url, issueId: issue.id }) });
      const out = await res.json();
      if (!res.ok) throw new Error(out.error);
      set('cover_cutout_url', out.url);
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Η αφαίρεση φόντου απέτυχε.');
    } finally {
      setBgBusy(false);
    }
  };

  // pages shown in the preview column for the current tab
  const previewPages = tab === 'settings' || tab === 'cover' ? [] : pages.filter((p) => p.kind === 'section' && p.section === tab);

  useLayoutEffect(() => {
    const root = previewRef.current;
    if (!root) return;
    const over: number[] = [];
    root.querySelectorAll<HTMLElement>('[data-preview-page]').forEach((el) => {
      const page = el.querySelector<HTMLElement>('.kp-page');
      if (page && page.scrollHeight > 702) over.push(Number(el.dataset.previewPage));
    });
    setOverflow(over);
  }, [issue, tab]);

  const tabs: { id: Tab; label: string; count?: number; hidden?: boolean }[] = [
    { id: 'settings', label: 'Ρυθμίσεις', count: counts.get('settings') },
    { id: 'cover', label: 'Εξώφυλλο' },
    ...issue.sections.map((s) => ({ id: s.type as Tab, label: SECTION_TITLES[s.type], count: counts.get(s.type), hidden: !s.visible })),
  ];

  const section = issue.sections.find((s) => s.type === tab);

  return (
    <main className="px-4 pb-16 pt-6 sm:px-8">
      <TextureSheet ref={sheetRef} issue={issue} pages={pages} toc={toc} />

      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Link href="/admin" className="text-[13px] text-ink-80 underline underline-offset-4">Όλα τα τεύχη</Link>
          <p className="mb-1 mt-3 text-[13px] text-ink-80">{issueLabel(issue)} · {issue.matchday}η αγωνιστική</p>
          <h1 className="m-0 font-brand text-[30px] font-extrabold tracking-[-0.02em]">{issue.opponent ? fixtureTitle(issue) : 'Νέο τεύχος'}</h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="border border-ink px-2.5 py-1.5 text-[13px]">{PHASE_LABEL[phase]}</span>
          {msg && <span role="status" className="text-[13px]">{msg}</span>}
          <button type="button" disabled={!dirty || saving} onClick={() => save()} className="h-11 border border-ink px-4 disabled:border-ink-60 disabled:text-ink-60">{saving ? 'Αποθήκευση…' : dirty ? 'Αποθήκευση' : 'Αποθηκευμένο'}</button>
          <button type="button" onClick={() => setPreview3d(true)} className="h-11 border border-ink px-4">Προεπισκόπηση 3D</button>
          {issue.status === 'published' && <button type="button" onClick={unpublish} className="h-11 border border-ink px-4">Απόσυρση</button>}
          <button type="button" onClick={runPublish} aria-describedby="pub-why" className={`h-11 px-4 font-semibold ${missing.length ? 'border border-ink-60 bg-stage text-ink-80' : 'bg-ink text-white'}`}>
            {issue.status === 'published' ? 'Ενημέρωση δημοσίευσης' : 'Δημοσίευση'}
          </button>
        </div>
      </div>
      <p id="pub-why" className="mt-2 text-[13px] text-ink-80">
        {missing.length
          ? `Η δημοσίευση ανοίγει όταν συμπληρωθούν ${missing.length} πεδία: ${tabs.filter((t) => t.count).map((t) => `${t.label} ${t.count}`).join(', ')}.`
          : 'Όλα τα πεδία είναι συμπληρωμένα.'}
      </p>

      <nav aria-label="Ενότητες τεύχους" className="mt-5 flex overflow-x-auto border-b border-ink">
        {tabs.map((t) => (
          <button key={t.id} type="button" onClick={() => setTab(t.id)} aria-current={tab === t.id ? 'page' : undefined}
            className={`flex-none whitespace-nowrap border-b-[3px] px-3 pb-2.5 pt-3 text-[14px] ${tab === t.id ? 'border-ink font-bold' : 'border-transparent text-ink-80'} ${t.hidden ? 'line-through' : ''}`}>
            {t.label}{t.count ? <span className="ml-1.5 text-[11px] text-gold-text">{t.count}</span> : null}
          </button>
        ))}
      </nav>

      <div className="mt-6 flex flex-wrap items-start gap-8">
        <div className="min-w-0 flex-[1_1_480px]">
          {tab === 'settings' && (
            <div className="grid grid-cols-1 gap-x-4 gap-y-5 sm:grid-cols-6">
              <div className="flex flex-col gap-1.5 sm:col-span-1"><Label htmlFor="s-n">Τεύχος</Label><input id="s-n" inputMode="numeric" className={`${inputCls} border-ink`} value={issue.number} onChange={(e) => set('number', Number(e.target.value.replace(/\D/g, '')) || 0)} /></div>
              <div className="flex flex-col gap-1.5 sm:col-span-2"><Label htmlFor="s-season">Σεζόν</Label><input id="s-season" className={`${inputCls} border-ink`} value={issue.season} onChange={(e) => set('season', e.target.value)} /></div>
              <div className="flex flex-col gap-1.5 sm:col-span-1"><Label htmlFor="s-md">Αγωνιστική</Label><input id="s-md" inputMode="numeric" className={`${inputCls} border-ink`} value={issue.matchday} onChange={(e) => set('matchday', Number(e.target.value.replace(/\D/g, '')) || 0)} /></div>
              <div className="flex flex-col gap-1.5 sm:col-span-2"><Label htmlFor="s-comp">Διοργάνωση</Label><input id="s-comp" className={`${inputCls} border-ink`} value={issue.competition} onChange={(e) => set('competition', e.target.value)} /></div>
              <div className="flex flex-col gap-1.5 sm:col-span-3"><Label htmlFor="s-opp">Αντίπαλος</Label><input id="s-opp" className={`${inputCls} ${issue.opponent ? 'border-ink' : 'border-gold-text'}`} value={issue.opponent} onChange={(e) => set('opponent', e.target.value)} /></div>
              <div className="flex flex-col gap-1.5 sm:col-span-3"><Label htmlFor="s-std">Γήπεδο</Label><input id="s-std" className={`${inputCls} ${issue.stadium.includes(PLACEHOLDER) || !issue.stadium ? 'border-gold-text' : 'border-ink'}`} value={issue.stadium.includes(PLACEHOLDER) ? '' : issue.stadium} placeholder="Υποχρεωτικό" onChange={(e) => set('stadium', e.target.value || PLACEHOLDER)} /></div>
              <label className="flex h-11 items-center gap-2 text-[14px] sm:col-span-6"><input type="checkbox" className="h-5 w-5 accent-ink" checked={issue.is_home} onChange={(e) => set('is_home', e.target.checked)} />Η Καλαμάτα αγωνίζεται εντός έδρας</label>
              <div className="flex flex-col gap-1.5 sm:col-span-2"><Label htmlFor="s-ko">Σέντρα (ώρα Ελλάδας)</Label><input id="s-ko" type="datetime-local" className={`${inputCls} border-ink`} value={toAthensInput(issue.kickoff_at)} onChange={(e) => set('kickoff_at', fromAthensInput(e.target.value))} /></div>
              <div className="flex flex-col gap-1.5 sm:col-span-2"><Label htmlFor="s-pub">Ανοίγει</Label><input id="s-pub" type="datetime-local" className={`${inputCls} border-ink`} value={toAthensInput(issue.publish_at)} onChange={(e) => set('publish_at', fromAthensInput(e.target.value))} /></div>
              <div className="flex flex-col gap-1.5 sm:col-span-2"><Label htmlFor="s-exp">Λήγει</Label><input id="s-exp" type="datetime-local" className={`${inputCls} ${counts.get('settings') && Date.parse(issue.expires_at) <= Date.parse(issue.publish_at) ? 'border-gold-text' : 'border-ink'}`} value={toAthensInput(issue.expires_at)} onChange={(e) => set('expires_at', fromAthensInput(e.target.value))} /></div>
              <div className="flex flex-col gap-1.5 sm:col-span-3">
                <Label htmlFor="s-arch">Μετά τη λήξη, στο αρχείο</Label>
                <select id="s-arch" className={`${inputCls} border-ink`} value={issue.archive_access} onChange={(e) => set('archive_access', e.target.value as Issue['archive_access'])}>
                  <option value="gated">Με email (προεπιλογή)</option><option value="open">Ελεύθερα</option><option value="hidden">Κρυφό</option>
                </select>
              </div>
              <div className="flex flex-col gap-1.5 sm:col-span-3"><span className="text-[13px] font-semibold">Σήμα αντιπάλου (PNG με διάφανο φόντο)</span><ImageField label="Σήμα αντιπάλου" optional value={issue.opponent_crest_url} issueId={issue.id} keepAlpha onChange={(v) => set('opponent_crest_url', v)} /></div>
              <div className="flex flex-col gap-1.5 sm:col-span-6"><span className="text-[13px] font-semibold">Λογότυπο χορηγού αντίστροφης μέτρησης (προαιρετικό)</span><ImageField label="Λογότυπο χορηγού" optional value={issue.countdown_sponsor_url} issueId={issue.id} keepAlpha onChange={(v) => set('countdown_sponsor_url', v)} /></div>
            </div>
          )}

          {tab === 'cover' && (
            <div className="grid grid-cols-1 gap-x-4 gap-y-5 sm:grid-cols-6">
              <div className="flex flex-col gap-1.5 sm:col-span-3">
                <Label htmlFor="c-tone">Τόνος εξωφύλλου</Label>
                <select id="c-tone" className={`${inputCls} border-ink`} value={issue.cover_tone} onChange={(e) => set('cover_tone', e.target.value as Issue['cover_tone'])}>
                  <option value="ink">Μαύρο</option><option value="white">Λευκό</option><option value="photo">Φωτογραφία</option>
                </select>
              </div>
              <div className="flex flex-col gap-1.5 sm:col-span-6"><span className="text-[13px] font-semibold">Φωτογραφία εξωφύλλου (χρησιμοποιείται και ως γέμισμα σελίδων)</span><ImageField label="Φωτογραφία εξωφύλλου" value={issue.cover_photo_url} ratio={495 / 700} issueId={issue.id} onChange={(v) => set('cover_photo_url', v)} /></div>
              <div className="flex flex-col gap-1.5 sm:col-span-6">
                <span className="text-[13px] font-semibold">Αποκομμένο θέμα (PNG, πάνω από τον τίτλο)</span>
                <div className="flex flex-wrap items-start gap-3">
                  <ImageField label="Αποκομμένο θέμα" optional value={issue.cover_cutout_url} issueId={issue.id} keepAlpha onChange={(v) => set('cover_cutout_url', v)} />
                  <button type="button" disabled={!issue.cover_photo_url || bgBusy} onClick={removeBg} className="h-11 border border-ink px-4 disabled:border-ink-60 disabled:text-ink-60">{bgBusy ? 'Αφαίρεση φόντου…' : 'Αφαίρεση φόντου από τη φωτογραφία'}</button>
                </div>
              </div>
              <fieldset className="m-0 border-0 p-0 sm:col-span-6">
                <legend className="mb-2 font-brand text-[17px] font-extrabold">Γραμμές εξωφύλλου (2–4)</legend>
                {issue.cover_lines.map((l, i) => (
                  <div key={i} className="flex items-center gap-3 border-b border-[#ecebeb] py-1.5">
                    <input aria-label={`Γραμμή ${i + 1}`} maxLength={18} className={`${inputCls} ${l.text.includes(PLACEHOLDER) ? 'border-gold-text' : 'border-ink'}`} value={l.text.includes(PLACEHOLDER) ? '' : l.text} placeholder="Υποχρεωτικό" onChange={(e) => set('cover_lines', issue.cover_lines.map((x, j) => (j === i ? { ...x, text: e.target.value || PLACEHOLDER } : x)))} />
                    <label className="flex flex-none items-center gap-2 text-[13px]"><input type="checkbox" className="h-5 w-5 accent-ink" checked={l.gold} onChange={(e) => set('cover_lines', issue.cover_lines.map((x, j) => (j === i ? { ...x, gold: e.target.checked } : { ...x, gold: e.target.checked ? false : x.gold })))} />Χρυσό</label>
                    <button type="button" aria-label={`Διαγραφή γραμμής ${i + 1}`} disabled={issue.cover_lines.length <= 2} onClick={() => set('cover_lines', issue.cover_lines.filter((_, j) => j !== i))} className="grid h-11 w-11 flex-none place-items-center disabled:opacity-30"><Icon name="close" size={18} /></button>
                  </div>
                ))}
                {issue.cover_lines.length < 4 && <button type="button" className="mt-3 h-10 border border-ink px-4" onClick={() => set('cover_lines', [...issue.cover_lines, { text: PLACEHOLDER, gold: false }])}>Προσθήκη γραμμής</button>}
              </fieldset>
            </div>
          )}

          {section && (
            <>
              <label className="mb-6 flex items-center justify-between gap-4 border border-[#e2e1e1] px-4 py-3">
                <span><b>Εμφάνιση ενότητας</b><br /><span className="text-[13px] text-ink-80">Κρυφές ενότητες παραλείπονται· οι σελίδες ξανααριθμούνται αυτόματα.</span></span>
                <input type="checkbox" className="h-6 w-6 accent-ink" checked={section.visible} onChange={(e) => setSection(section.type, { visible: e.target.checked })} />
              </label>
              <FieldEditor fields={SECTION_SCHEMA[section.type]} issueId={issue.id} value={section.data as unknown as Record<string, unknown>} onChange={(v) => setSection(section.type, { data: v as never })} />
            </>
          )}

          <div className="mt-12 border-t border-[#e2e1e1] pt-6">
            <button type="button" onClick={remove} className="h-11 border border-[#b3261e] px-4 text-[#b3261e]">Διαγραφή τεύχους</button>
          </div>
        </div>

        <aside aria-label="Προεπισκόπηση" className="min-w-0 flex-[1_1_360px] lg:sticky lg:top-4">
          <div className="mb-2 flex justify-between text-[13px]"><b>Προεπισκόπηση</b><span className="text-ink-80">{pages.length} σελίδες</span></div>
          <div ref={previewRef} className="flex flex-wrap justify-center gap-0 bg-stage p-5">
            {(tab === 'settings' || tab === 'cover') && (
              <div className="w-[260px] shadow-[0_10px_20px_-12px_rgba(35,31,32,0.4)]"><Mini><CoverFront issue={issue} /></Mini></div>
            )}
            {previewPages.map((p) => (
              <div key={p.number} className="w-[50%] max-w-[240px]">
                <Mini number={p.number}><PageView issue={issue} page={p} toc={toc} /></Mini>
              </div>
            ))}
            {section && !section.visible && <p className="text-[13px] text-ink-80">Η ενότητα είναι κρυφή.</p>}
          </div>
          {overflow.length > 0 && (
            <p role="status" className="mt-3 flex gap-2 border border-gold-text px-3 py-2.5 text-[13px]">
              <span className="text-gold-text"><Icon name="alert" size={18} /></span>
              <span><b>Το κείμενο ξεχειλίζει στη σελίδα {overflow.join(', ')}.</b> Συντομεύστε το κείμενο ή αφαιρέστε γραμμές.</span>
            </p>
          )}
          <p className="mt-3 text-[12px] text-ink-80">Οι φωτογραφίες κόβονται αυτόματα στις αναλογίες της θέσης τους.</p>
        </aside>
      </div>

      {preview3d && (
        <div role="dialog" aria-modal="true" aria-label="Προεπισκόπηση 3D" className="fixed inset-0 z-50 flex flex-col bg-stage">
          <div className="flex items-center justify-between bg-ink px-4 py-2 text-white">
            <span className="text-sm">Προεπισκόπηση 3D · μη αποθηκευμένες αλλαγές εμφανίζονται κανονικά</span>
            <button type="button" onClick={() => setPreview3d(false)} aria-label="Κλείσιμο" className="grid h-11 w-11 place-items-center"><Icon name="close" /></button>
          </div>
          <div className="relative flex-1"><Reader issue={issue} pages={pages} toc={toc} preview embedded /></div>
        </div>
      )}

      {publish && (
        <div role="dialog" aria-modal="true" aria-label="Δημοσίευση" className="fixed inset-0 z-50 grid place-items-center bg-ink/40 px-4">
          <div className="w-full max-w-lg bg-white p-6">
            {publish.step === 'blocked' ? (
              <>
                <h2 className="mb-3 font-brand text-xl font-extrabold">Συμπληρώστε {missing.length} πεδία πριν τη δημοσίευση</h2>
                <ul className="max-h-[50vh] overflow-y-auto pl-5 text-[14px]">
                  {tabs.filter((t) => t.count).map((t) => (
                    <li key={t.id}><button type="button" className="underline underline-offset-4" onClick={() => { setTab(t.id); setPublish(null); }}>{t.label}</button>: {t.count}</li>
                  ))}
                </ul>
                <button type="button" onClick={() => setPublish(null)} className="mt-5 h-11 bg-ink px-5 text-white">Εντάξει</button>
              </>
            ) : (
              <>
                <h2 className="mb-3 font-brand text-xl font-extrabold">{publish.step === 'Δημοσιεύτηκε' ? 'Δημοσιεύτηκε' : 'Δημοσίευση'}</h2>
                <p className="text-[15px]">{publish.step}{publish.total ? ` ${publish.done} / ${publish.total}` : ''}</p>
                <div className="mt-3 h-[3px] bg-stage" role="progressbar" aria-valuemin={0} aria-valuemax={publish.total} aria-valuenow={publish.done}>
                  <div className="h-[3px] bg-ink" style={{ width: `${publish.total ? (publish.done / publish.total) * 100 : 0}%` }} />
                </div>
                {publish.error && <p role="alert" className="mt-4 text-[14px]">Κάτι απέτυχε: {publish.error}</p>}
                <div className="mt-5 flex gap-2">
                  {publish.error && <button type="button" onClick={runPublish} className="h-11 bg-ink px-5 text-white">Δοκιμή ξανά</button>}
                  {(publish.error || publish.step === 'Δημοσιεύτηκε') && <button type="button" onClick={() => setPublish(null)} className="h-11 border border-ink px-5">Κλείσιμο</button>}
                  {publish.step === 'Δημοσιεύτηκε' && <a href={`/issue/${issue.number}`} target="_blank" rel="noreferrer" className="flex h-11 items-center border border-ink px-5">Άνοιγμα</a>}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </main>
  );
}

function Mini({ children, number }: { children: React.ReactNode; number?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [s, setS] = useState(0.4);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const fit = () => setS(el.clientWidth / 495);
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return (
    <div ref={ref} className="relative aspect-[495/700] overflow-hidden bg-white" data-preview-page={number}>
      <div className="absolute left-0 top-0 origin-top-left" style={{ transform: `scale(${s})` }}>{children}</div>
    </div>
  );
}
