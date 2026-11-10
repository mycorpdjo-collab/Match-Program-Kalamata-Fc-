import type { Issue, IssuePhase } from './types';

export const TZ = 'Europe/Athens';
export const FIXTURE_SEP = ' – ';

const plural = new Intl.PluralRules('el');
const UNITS = {
  day: ['ημέρα', 'ημέρες'],
  hour: ['ώρα', 'ώρες'],
  minute: ['λεπτό', 'λεπτά'],
  second: ['δευτερόλεπτο', 'δευτερόλεπτα'],
} as const;

function unit(n: number, u: keyof typeof UNITS) {
  return `${n} ${plural.select(n) === 'one' ? UNITS[u][0] : UNITS[u][1]}`;
}

/** "2 ημέρες 4 ώρες 18 λεπτά" — zero units hidden, seconds only in the last hour. */
export function durationText(ms: number): string {
  if (ms <= 0) return unit(0, 'second');
  const s = Math.floor(ms / 1000);
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const parts: string[] = [];
  if (d) parts.push(unit(d, 'day'));
  if (h) parts.push(unit(h, 'hour'));
  if (m) parts.push(unit(m, 'minute'));
  if (!d && !h) parts.push(unit(sec, 'second'));
  return parts.join(' ');
}

const shortDay = new Intl.DateTimeFormat('el-GR', { weekday: 'short', timeZone: TZ });
const dayMonth = new Intl.DateTimeFormat('el-GR', { day: '2-digit', month: '2-digit', timeZone: TZ });
const time = new Intl.DateTimeFormat('el-GR', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: TZ });

/** "Κυρ. 22/11, 19:30" */
export function shortDateTime(iso: string) {
  const d = new Date(iso);
  const wd = shortDay.format(d).replace('.', '');
  return `${wd}. ${dayMonth.format(d)}, ${time.format(d)}`;
}
/** "Κυρ. 22/11" */
export function shortDate(iso: string) {
  const d = new Date(iso);
  return `${shortDay.format(d).replace('.', '')}. ${dayMonth.format(d)}`;
}

export function fixtureTitle(issue: Pick<Issue, 'opponent' | 'is_home'>) {
  return issue.is_home ? `Καλαμάτα${FIXTURE_SEP}${issue.opponent}` : `${issue.opponent}${FIXTURE_SEP}Καλαμάτα`;
}

export function issueLabel(issue: Pick<Issue, 'number' | 'season'>) {
  return `Τεύχος ${String(issue.number).padStart(2, '0')} · ${issue.season}`;
}

export function phaseOf(issue: Pick<Issue, 'status' | 'publish_at' | 'expires_at'>, now = Date.now()): IssuePhase {
  if (issue.status !== 'published') return 'draft';
  if (now < Date.parse(issue.publish_at)) return 'scheduled';
  if (now < Date.parse(issue.expires_at)) return 'live';
  return 'archived';
}

export const PLACEHOLDER = '[ΣΥΜΠΛΗΡΩΣΤΕ]';
export function isPlaceholder(v: string | undefined | null) {
  return !v || v.includes(PLACEHOLDER);
}
/** Text shown on the page: placeholders keep their bracket so staff see them in preview. */
export function show(v: string | undefined | null, fallback = PLACEHOLDER) {
  return v && v.trim() ? v : fallback;
}
