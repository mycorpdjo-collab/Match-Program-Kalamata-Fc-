import demo from '@/data/demo-issue.json';
import { PLACEHOLDER as F } from './format';
import type { Issue, Section } from './types';

const blankSquad = { goalkeepers: [], defenders: [], midfielders: [], forwards: [], coach: F };

/** Match-specific sections are reset; club-level ones (squad, staff, owner, sponsors, transfers) carry over. */
export function freshMatchSections(): Partial<Record<Section['type'], Section['data']>> {
  return {
    welcome: { title: 'Καλώς ήρθατε', message: F, signatureName: F, signatureRole: 'Πρόεδρος, Καλαμάτα Π.Α.Ε.', portraitUrl: '' },
    contents: { photoUrl: '' },
    last_match: { label: F, homeTeam: F, awayTeam: F, homeScore: '', awayScore: '', goals: [], subs: [] },
    fixtures: { title: 'Νη αγωνιστική', fixtures: Array.from({ length: 7 }, () => ({ when: F, home: F, away: F })) },
    standings: { afterLabel: F, rows: Array.from({ length: 14 }, () => ({ team: F, played: '', won: '', drawn: '', lost: '', goalsFor: '', goalsAgainst: '', points: '' })) },
    head_to_head: { rangeLabel: 'Όλες οι αναμετρήσεις στο πρωτάθλημα', photoUrl: '', games: [] },
    back_page: { nextOpponent: F, nextDate: F, nextTime: F, nextStadium: F },
  };
}

function baseIssue(): Omit<Issue, 'id'> {
  const d = structuredClone(demo) as Issue;
  const now = Date.now();
  const kickoff = new Date(now + 10 * 86400000).toISOString();
  return {
    ...d,
    number: d.number + 1,
    opponent: '',
    opponent_crest_url: '',
    stadium: F,
    kickoff_at: kickoff,
    publish_at: new Date(Date.parse(kickoff) - 2 * 86400000).toISOString(),
    expires_at: new Date(Date.parse(kickoff) + 26.5 * 3600000).toISOString(),
    status: 'draft',
    countdown_sponsor_url: '',
    cover_photo_url: '',
    cover_cutout_url: '',
    cover_lines: [{ text: 'Καλαμάτα', gold: false }, { text: F, gold: false }],
    page_manifest: null,
  };
}

export function newIssue(): Omit<Issue, 'id'> {
  const b = baseIssue();
  const fresh = freshMatchSections();
  b.sections = b.sections.map((s) => {
    if (s.type === 'squad') return { ...s, data: blankSquad } as Section;
    if (s.type in fresh) return { ...s, data: fresh[s.type] } as Section;
    return s;
  });
  return b;
}

export function duplicateIssue(prev: Issue): Omit<Issue, 'id'> {
  const fresh = freshMatchSections();
  const copy = structuredClone(prev);
  const b = baseIssue();
  return {
    ...b,
    number: prev.number + 1,
    season: prev.season,
    competition: prev.competition,
    matchday: prev.matchday + 1,
    archive_access: prev.archive_access,
    cover_tone: prev.cover_tone,
    sections: copy.sections.map((s) => (s.type in fresh ? ({ ...s, data: fresh[s.type] } as Section) : s)),
  };
}
