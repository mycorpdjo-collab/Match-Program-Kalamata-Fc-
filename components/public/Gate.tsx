'use client';
import Link from 'next/link';
import { useRef, useState } from 'react';
import { CoverFront } from '@/components/pages/Pages';
import { Icon } from '@/components/ui/Icon';
import { ScaledPage } from '@/components/ui/ScaledPage';
import { fixtureTitle, issueLabel, shortDateTime } from '@/lib/format';
import type { Issue } from '@/lib/types';

function utm() {
  if (typeof location === 'undefined') return {};
  const q = new URLSearchParams(location.search);
  return { source: q.get('utm_source') ?? undefined, medium: q.get('utm_medium') ?? undefined, campaign: q.get('utm_campaign') ?? undefined };
}

export default function Gate({ issue, onUnlocked }: { issue: Issue; onUnlocked(): void }) {
  const [email, setEmail] = useState('');
  const [consent, setConsent] = useState(false);
  const [status, setStatus] = useState<'idle' | 'loading'>('idle');
  const [error, setError] = useState('');
  const warmed = useRef(false);

  // start loading the 3D engine while the visitor types
  const warm = () => {
    if (warmed.current) return;
    warmed.current = true;
    import('@/lib/book-engine').catch(() => undefined);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const v = email.trim().toLowerCase();
    if (!v) return setError('Γράψτε το email σας για να συνεχίσετε.');
    if (!v.includes('@')) return setError('Ελέγξτε το email — λείπει το @.');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)) return setError('Ελέγξτε το email — λείπει η κατάληξη, π.χ. .gr');
    setError('');
    setStatus('loading');
    try {
      const res = await fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ issueId: issue.id, email: v, consent, utm: utm() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Δεν ήταν δυνατή η αποθήκευση. Δοκιμάστε ξανά.');
      onUnlocked();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Δεν ήταν δυνατή η αποθήκευση. Δοκιμάστε ξανά.');
      setStatus('idle');
    }
  };

  return (
    <div className="flex min-h-[100dvh] flex-col bg-stage text-ink fade-in">
      <header className="grid grid-cols-[1fr_auto] items-center gap-3 px-4 py-3 text-[13px] sm:grid-cols-[1fr_auto_1fr] sm:px-8 sm:py-4 sm:text-sm">
        <span className="font-semibold">{fixtureTitle(issue)}</span>
        <span className="hidden text-ink-80 sm:inline">Διαθέσιμο έως {shortDateTime(issue.expires_at)}</span>
        <span className="justify-self-end text-ink-80">{issue.matchday}η αγωνιστική</span>
      </header>

      <main className="flex flex-1 items-center justify-center px-4 pb-10 sm:px-6">
        <div className="relative flex w-full max-w-[1004px] flex-col sm:flex-row">
          <div aria-hidden="true" className="absolute -bottom-4 left-[4%] right-[4%] hidden h-6 rounded-[50%] bg-ink opacity-[0.16] blur-[14px] sm:block" />

          {/* closed book: the same cover the 3D book opens */}
          <section aria-label="Εξώφυλλο" className="relative flex justify-center sm:block">
            <div className="relative w-[min(100%,200px)] sm:w-[min(46vw,495px)]">
              <ScaledPage><CoverFront issue={issue} /></ScaledPage>
              <span className="absolute bottom-[4%] left-[6%] z-10 grid h-9 w-9 place-items-center border border-gold bg-ink text-gold" title="Κλειδωμένο" aria-label="Κλειδωμένο">
                <Icon name="lock" size={18} />
              </span>
            </div>
          </section>

          <div aria-hidden="true" className="hidden w-3 sm:block" style={{ background: 'repeating-linear-gradient(90deg, #231f20 0 3px, #fff 3px 6px)' }} />

          <section aria-labelledby="gate-h" className="mt-4 flex flex-1 flex-col bg-white px-6 py-8 sm:mt-0 sm:px-14 sm:py-16">
            <p className="mb-3 text-sm font-semibold text-gold-text">Δωρεάν πρόσβαση</p>
            <h1 id="gate-h" className="m-0 mb-4 font-brand text-[28px] font-extrabold leading-[1.05] tracking-[-0.025em] sm:text-[40px]">Ξεκλειδώστε το Match Programme</h1>
            <p className="mb-8 max-w-[34ch] text-[15px] leading-normal text-ink-80 sm:text-base">Η αποστολή, τα στατιστικά, η βαθμολογία και η ιστορία της αναμέτρησης.</p>

            <form onSubmit={submit} noValidate className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <label htmlFor="gate-email" className="text-sm font-semibold">Email</label>
                <input
                  id="gate-email"
                  type="email"
                  autoComplete="email"
                  inputMode="email"
                  placeholder="onoma@email.gr"
                  value={email}
                  onFocus={warm}
                  onChange={(e) => { setEmail(e.target.value); if (error) setError(''); }}
                  aria-invalid={!!error}
                  aria-describedby={error ? 'gate-err' : undefined}
                  className={`h-[52px] rounded-none border bg-white px-4 text-[17px] text-ink outline-none focus:outline-2 focus:outline-offset-0 focus:outline-ink ${error ? 'border-[#d6332a]' : 'border-ink'}`}
                />
                {error && (
                  <p id="gate-err" role="alert" className="m-0 flex items-center gap-2 text-sm">
                    <span className="text-[#d6332a]"><Icon name="alert" size={16} /></span>{error}
                  </p>
                )}
              </div>
              <label className="flex cursor-pointer items-start gap-3 py-1 text-sm leading-snug text-ink-80">
                <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-0.5 h-5 w-5 flex-none accent-ink" />
                <span>Θέλω να λαμβάνω νέα και προσφορές της Καλαμάτας Π.Α.Ε.</span>
              </label>
              <button type="submit" disabled={status === 'loading'} aria-busy={status === 'loading'} className="flex h-[54px] items-center justify-center gap-3 bg-ink text-base font-semibold text-white disabled:opacity-90">
                {status === 'loading' && (
                  <span aria-hidden="true" className="relative h-[2px] w-14 overflow-hidden bg-white/30">
                    <span className="absolute inset-y-0 left-0 w-2/5 animate-[slide_1s_ease-in-out_infinite] bg-white" />
                  </span>
                )}
                {status === 'loading' ? 'Άνοιγμα…' : 'Άνοιγμα προγράμματος'}
              </button>
            </form>
            <p className="mt-8 text-[13px] leading-normal text-ink-60 sm:mt-auto sm:pt-8">
              Με τη συνέχεια αποδέχεστε την <Link href="/privacy" className="text-ink-80 underline">Πολιτική Απορρήτου</Link>.
            </p>
            <p className="sr-only">{issueLabel(issue)}</p>
          </section>
        </div>
      </main>
      <style>{`@keyframes slide{0%{transform:translateX(-100%)}100%{transform:translateX(250%)}}`}</style>
    </div>
  );
}
