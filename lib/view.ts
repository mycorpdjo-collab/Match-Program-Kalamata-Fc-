import 'server-only';
import { cookies } from 'next/headers';
import { paginate, tableOfContents } from './paginator';
import type { Issue } from './types';

export function prepare(issue: Issue) {
  const pages = paginate(issue);
  const toc = tableOfContents(issue, pages);
  return { pages, toc };
}

export function isUnlocked(issue: Issue) {
  return cookies().get(`kfc_issue_${issue.id}`)?.value === '1';
}
