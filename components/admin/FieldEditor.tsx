'use client';
import { useRef, useState } from 'react';
import { Icon } from '@/components/ui/Icon';
import { PLACEHOLDER } from '@/lib/format';
import type { AnyField, Field, ListField } from '@/lib/schema';
import { cropToRatio, rid, uploadBlob } from '@/lib/upload';
import { useAdmin } from './AdminShell';

type Obj = Record<string, unknown>;

const widthClass: Record<NonNullable<Field['width']>, string> = {
  full: 'sm:col-span-6',
  half: 'sm:col-span-3',
  third: 'sm:col-span-2',
  small: 'sm:col-span-1',
};

export const inputCls = 'h-11 w-full min-w-0 rounded-none border bg-white px-3 text-[15px] text-ink';

export function ImageField({ value, onChange, ratio, label, issueId, keepAlpha, compact, optional }: { value: string; onChange(v: string): void; ratio?: number; label: string; issueId: string; keepAlpha?: boolean; compact?: boolean; optional?: boolean }) {
  const { db } = useAdmin();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [over, setOver] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  const handle = async (file?: File | null) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) return setErr('Επιλέξτε αρχείο εικόνας (JPG, PNG, WebP).');
    setBusy(true);
    setErr('');
    try {
      const blob = await cropToRatio(file, ratio, keepAlpha);
      const url = await uploadBlob(db, `issues/${issueId}/img/${rid()}.${keepAlpha ? 'png' : 'jpg'}`, blob);
      onChange(url);
    } catch (e) {
      setErr(e instanceof Error ? `Η μεταφόρτωση απέτυχε: ${e.message}` : 'Η μεταφόρτωση απέτυχε.');
    } finally {
      setBusy(false);
    }
  };

  const size = compact ? 'h-11 w-11' : 'h-[120px] w-[160px]';
  return (
    <div className="flex items-start gap-3">
      <button
        type="button"
        aria-label={`${label}: ${value ? 'αλλαγή εικόνας' : 'μεταφόρτωση εικόνας'}`}
        onClick={() => input.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setOver(true); }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => { e.preventDefault(); setOver(false); handle(e.dataTransfer.files[0]); }}
        className={`${size} relative flex flex-none flex-col items-center justify-center gap-1 overflow-hidden border text-center text-[11px] leading-tight text-ink-80 ${over ? 'border-2 border-ink bg-stage' : value ? 'border-ink-60' : 'border-gold-text'}`}
      >
        {value ? <img src={value} alt="" className="absolute inset-0 h-full w-full object-cover" /> : !compact && (<><Icon name="next" size={18} /><span>Σύρετε ή επιλέξτε<br />{ratio ? 'κοπή αυτόματα' : 'PNG'}</span></>)}
        {busy && <span className="absolute inset-0 grid place-items-center bg-white/80 text-[11px]">Ανέβασμα…</span>}
      </button>
      <input ref={input} type="file" accept="image/*" className="hidden" onChange={(e) => handle(e.target.files?.[0])} />
      {!compact && (
        <div className="flex flex-col gap-1 text-[13px]">
          {value && <button type="button" className="h-9 self-start border border-ink px-3" onClick={() => onChange('')}>Αφαίρεση</button>}
          {!value && !optional && <span className="text-gold-text">Υποχρεωτικό για δημοσίευση</span>}
          {err && <span role="alert">{err}</span>}
        </div>
      )}
    </div>
  );
}

function Scalar({ f, value, onChange, issueId, compact }: { f: Field; value: unknown; onChange(v: unknown): void; issueId: string; compact?: boolean }) {
  const id = useRef(`f-${rid()}`).current;
  const str = typeof value === 'string' ? value : '';
  const setText = (v: string) => onChange(v.trim() === '' && !f.optional ? PLACEHOLDER : v);
  const missing = typeof value === 'string' && (value.includes(PLACEHOLDER));
  const border = missing ? 'border-gold-text' : 'border-ink';
  const count = f.max ? <span className={`font-normal ${str.length > f.max ? 'font-semibold text-[#b3261e]' : 'text-ink-60'}`}>{str.length} / {f.max}</span> : null;
  const labelEl = (
    <label htmlFor={id} className={`flex justify-between gap-2 text-[13px] font-semibold ${compact ? 'sr-only' : ''}`}>
      <span>{f.label}</span>{count}
    </label>
  );
  if (f.kind === 'image') {
    return (
      <div className="flex flex-col gap-1.5">
        {!compact && <span className="text-[13px] font-semibold">{f.label}</span>}
        <ImageField value={str} onChange={onChange} ratio={f.ratio} label={f.label} issueId={issueId} compact={compact} />
      </div>
    );
  }
  if (f.kind === 'boolean') {
    return (
      <label className="flex h-11 items-center gap-2 text-[13px]">
        <input type="checkbox" checked={!!value} onChange={(e) => onChange(e.target.checked)} className="h-5 w-5 accent-ink" />
        {f.label}
      </label>
    );
  }
  if (f.kind === 'select') {
    return (
      <div className="flex flex-col gap-1.5">
        {labelEl}
        <select id={id} value={str} onChange={(e) => onChange(e.target.value)} className={`${inputCls} ${border}`}>
          {f.options?.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </div>
    );
  }
  if (f.kind === 'textarea') {
    return (
      <div className="flex flex-col gap-1.5">
        {labelEl}
        <textarea id={id} rows={4} value={missing ? '' : str} placeholder={missing ? 'Υποχρεωτικό για δημοσίευση' : undefined} onChange={(e) => setText(e.target.value)} className={`w-full rounded-none border bg-white px-3 py-2 text-[15px] ${border}`} />
        {f.hint && <span className="text-[12px] text-ink-80">{f.hint}</span>}
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-1.5">
      {labelEl}
      <input
        id={id}
        inputMode={f.kind === 'number' ? 'numeric' : undefined}
        value={missing ? '' : str}
        placeholder={missing ? 'Υποχρεωτικό' : f.hint}
        aria-label={compact ? f.label : undefined}
        onChange={(e) => (f.kind === 'number' ? onChange(e.target.value.replace(/[^\d-]/g, '')) : setText(e.target.value))}
        className={`${inputCls} ${missing || (f.kind === 'number' && str === '') ? 'border-gold-text' : 'border-ink'}`}
      />
      {f.hint && !compact && <span className="text-[12px] text-ink-80">{f.hint}</span>}
    </div>
  );
}

function List({ f, value, onChange, issueId }: { f: ListField; value: Obj[]; onChange(v: Obj[]): void; issueId: string }) {
  const [drag, setDrag] = useState<number | null>(null);
  const move = (from: number, to: number) => {
    if (to < 0 || to >= value.length || from === to) return;
    const next = value.slice();
    const [x] = next.splice(from, 1);
    next.splice(to, 0, x);
    onChange(next);
  };
  const cols = f.item.map((i) => (i.width === 'small' ? '72px' : i.kind === 'boolean' ? '120px' : i.kind === 'image' ? '44px' : 'minmax(0,1fr)')).join(' ');
  return (
    <fieldset className="m-0 border-0 p-0 sm:col-span-6">
      <legend className="mb-2 flex w-full justify-between font-brand text-[17px] font-extrabold">
        <span>{f.label}</span>
        {f.max && <span className="font-sans text-[12px] font-normal text-ink-60">{value.length} / {f.max}</span>}
      </legend>
      <div className="hidden gap-2 pb-1 pl-[72px] pr-[44px] text-[11px] text-ink-80 sm:grid" style={{ gridTemplateColumns: cols }} aria-hidden="true">
        {f.item.map((i) => <span key={i.key}>{i.label}</span>)}
      </div>
      <ol className="m-0 list-none p-0">
        {value.map((row, idx) => (
          <li
            key={idx}
            draggable
            onDragStart={() => setDrag(idx)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => { if (drag !== null) move(drag, idx); setDrag(null); }}
            className={`flex items-center gap-2 border-b border-[#ecebeb] py-1.5 ${drag === idx ? 'opacity-50' : ''}`}
          >
            <span className="flex flex-none flex-col">
              <button type="button" aria-label={`Μετακίνηση πάνω, γραμμή ${idx + 1}`} onClick={() => move(idx, idx - 1)} className="h-[22px] w-8 text-[12px] text-ink-80">▲</button>
              <button type="button" aria-label={`Μετακίνηση κάτω, γραμμή ${idx + 1}`} onClick={() => move(idx, idx + 1)} className="h-[22px] w-8 text-[12px] text-ink-80">▼</button>
            </span>
            <span className="w-6 flex-none cursor-grab text-[12px] text-ink-60" title="Σύρετε για αλλαγή σειράς">{idx + 1}</span>
            <div className="grid min-w-0 flex-1 grid-cols-2 gap-2 sm:[grid-template-columns:var(--cols)]" style={{ ['--cols' as string]: cols }}>
              {f.item.map((it) => (
                <Scalar key={it.key} f={it} compact issueId={issueId} value={row[it.key]} onChange={(v) => { const next = value.slice(); next[idx] = { ...row, [it.key]: v }; onChange(next); }} />
              ))}
            </div>
            <button type="button" aria-label={`Διαγραφή γραμμής ${idx + 1}`} onClick={() => onChange(value.filter((_, i) => i !== idx))} className="grid h-11 w-11 flex-none place-items-center text-ink-80"><Icon name="close" size={18} /></button>
          </li>
        ))}
      </ol>
      {(!f.max || value.length < f.max) && (
        <button type="button" onClick={() => onChange([...value, { ...f.blank }])} className="mt-3 h-10 border border-ink px-4 text-[14px]">{f.addLabel}</button>
      )}
    </fieldset>
  );
}

export function FieldEditor({ fields, value, onChange, issueId }: { fields: AnyField[]; value: Obj; onChange(v: Obj): void; issueId: string }) {
  return (
    <div className="grid grid-cols-1 gap-x-4 gap-y-5 sm:grid-cols-6">
      {fields.map((f) =>
        f.kind === 'list' ? (
          <List key={f.key} f={f} issueId={issueId} value={(value[f.key] as Obj[]) ?? []} onChange={(v) => onChange({ ...value, [f.key]: v })} />
        ) : (
          <div key={f.key} className={widthClass[f.width ?? 'full']}>
            <Scalar f={f} issueId={issueId} value={value[f.key]} onChange={(v) => onChange({ ...value, [f.key]: v })} />
          </div>
        ),
      )}
    </div>
  );
}
