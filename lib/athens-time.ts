import { TZ } from './format';

function offsetMinutes(utcMs: number) {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: TZ, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' })
    .formatToParts(new Date(utcMs))
    .reduce<Record<string, string>>((a, p) => ((a[p.type] = p.value), a), {});
  const asUtc = Date.UTC(+parts.year, +parts.month - 1, +parts.day, +parts.hour, +parts.minute, +parts.second);
  return (asUtc - utcMs) / 60000;
}

/** ISO (UTC) → "YYYY-MM-DDTHH:mm" in Athens time, for <input type="datetime-local">. */
export function toAthensInput(iso: string) {
  if (!iso) return '';
  const ms = Date.parse(iso);
  const local = new Date(ms + offsetMinutes(ms) * 60000);
  return local.toISOString().slice(0, 16);
}

/** "YYYY-MM-DDTHH:mm" entered as Athens time → ISO (UTC). */
export function fromAthensInput(v: string) {
  if (!v) return '';
  const guess = Date.parse(`${v}:00Z`);
  const off = offsetMinutes(guess - offsetMinutes(guess) * 60000);
  return new Date(guess - off * 60000).toISOString();
}
