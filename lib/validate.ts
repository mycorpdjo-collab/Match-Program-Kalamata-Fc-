import { PLACEHOLDER } from './format';
import type { Issue, SectionType } from './types';

export interface Missing {
  section: SectionType | 'settings';
  path: string;
}

const REQUIRED_IMAGES: Partial<Record<SectionType, string[]>> = {
  contents: ['photoUrl'],
  transfers: ['leadPhotoUrl'],
  owner_staff: ['ownerPhotoUrl'],
  head_to_head: ['photoUrl'],
  sponsors: ['adImageUrl'],
};

function walk(value: unknown, path: string, out: string[]) {
  if (typeof value === 'string') {
    if (value.includes(PLACEHOLDER)) out.push(path);
  } else if (Array.isArray(value)) {
    value.forEach((v, i) => walk(v, `${path}[${i}]`, out));
  } else if (value && typeof value === 'object') {
    for (const [k, v] of Object.entries(value)) walk(v, path ? `${path}.${k}` : k, out);
  }
}

/** Everything that must be filled in before an issue can be published. */
export function missingFields(issue: Issue): Missing[] {
  const out: Missing[] = [];
  const settings: string[] = [];
  walk({ opponent: issue.opponent, stadium: issue.stadium, season: issue.season, competition: issue.competition, cover_lines: issue.cover_lines }, '', settings);
  if (!issue.opponent) settings.push('opponent');
  if (!issue.publish_at || !issue.expires_at || !issue.kickoff_at) settings.push('dates');
  if (issue.publish_at && issue.expires_at && Date.parse(issue.expires_at) <= Date.parse(issue.publish_at)) settings.push('expires_at');
  settings.forEach((p) => out.push({ section: 'settings', path: p }));

  for (const s of issue.sections) {
    if (!s.visible) continue;
    const found: string[] = [];
    walk(s.data, '', found);
    for (const key of REQUIRED_IMAGES[s.type] ?? []) {
      if (!(s.data as unknown as Record<string, string>)[key]) found.push(key);
    }
    if (s.type === 'standings') {
      s.data.rows.forEach((r, i) => {
        (['played', 'won', 'drawn', 'lost', 'goalsFor', 'goalsAgainst', 'points'] as const).forEach((k) => {
          if (r[k] === '') found.push(`rows[${i}].${k}`);
        });
      });
    }
    found.forEach((p) => out.push({ section: s.type, path: p }));
  }
  return out;
}

export function countBySection(missing: Missing[]) {
  const m = new Map<string, number>();
  for (const x of missing) m.set(x.section, (m.get(x.section) ?? 0) + 1);
  return m;
}
