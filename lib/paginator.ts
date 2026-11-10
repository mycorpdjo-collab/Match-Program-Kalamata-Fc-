import type { Issue, SectionType } from './types';

/**
 * Pages are computed, never typed by hand.
 * Page 1 is the first right-hand page after the inside cover.
 * Even pages are left pages, odd pages are right pages.
 */
export type PageDef =
  | { kind: 'section'; section: SectionType; part: number; number: number; label: string }
  | { kind: 'filler'; number: number; label: string }
  | { kind: 'endpaper'; number: number; label: string };

interface Layout {
  pages: 1 | 2;
  label: string;
  /** Title shown in the contents list (null = not listed). */
  toc: string | null;
}

export const SECTION_LAYOUT: Record<SectionType, Layout> = {
  welcome: { pages: 1, label: 'Καλώς ήρθατε', toc: null },
  contents: { pages: 2, label: 'Περιεχόμενα', toc: null },
  squad: { pages: 2, label: 'Η αποστολή', toc: 'Η αποστολή' },
  transfers: { pages: 1, label: 'Μεταγραφές', toc: 'Μεταγραφές 2026/27' },
  owner_staff: { pages: 1, label: 'Ιδιοκτήτης και επιτελείο', toc: 'Ιδιοκτήτης και επιτελείο' },
  last_match: { pages: 1, label: 'Προηγούμενος αγώνας', toc: 'Προηγούμενος αγώνας' },
  season_stats: { pages: 1, label: 'Στατιστικά σεζόν', toc: 'Στατιστικά σεζόν' },
  fixtures: { pages: 1, label: 'Αγωνιστική', toc: 'Αγωνιστική' },
  standings: { pages: 1, label: 'Βαθμολογία', toc: 'Βαθμολογία' },
  head_to_head: { pages: 2, label: 'Αναμετρήσεις', toc: 'Οι αναμετρήσεις' },
  sponsors: { pages: 1, label: 'Χορηγοί', toc: 'Χορηγοί' },
  back_page: { pages: 1, label: 'Ραντεβού', toc: 'Ραντεβού στον επόμενο αγώνα' },
};

export function paginate(issue: Issue): PageDef[] {
  const out: PageDef[] = [];
  let n = 1;
  for (const s of issue.sections) {
    if (!s.visible) continue;
    const layout = SECTION_LAYOUT[s.type];
    if (layout.pages === 2 && n % 2 === 1) {
      out.push({ kind: 'filler', number: n, label: 'Καλαμάτα Π.Α.Ε.' });
      n++;
    }
    for (let part = 0; part < layout.pages; part++) {
      out.push({ kind: 'section', section: s.type, part, number: n, label: layout.label });
      n++;
    }
  }
  // the book needs an even number of inner pages: pad with the endpaper (club stripes)
  if ((n - 1) % 2 === 1) {
    out.push({ kind: 'endpaper', number: n, label: '' });
    n++;
  }
  return out;
}

export function tableOfContents(issue: Issue, pages: PageDef[]) {
  const seen = new Set<SectionType>();
  const toc: { title: string; page: number }[] = [];
  for (const p of pages) {
    if (p.kind !== 'section' || seen.has(p.section)) continue;
    seen.add(p.section);
    const title = SECTION_LAYOUT[p.section].toc;
    if (title) toc.push({ title, page: p.number });
  }
  return toc;
}
