import { notFound } from 'next/navigation';
import Experience from '@/components/public/Experience';
import { getIssueByNumber } from '@/lib/data';
import { fixtureTitle, phaseOf } from '@/lib/format';
import { isUnlocked, prepare } from '@/lib/view';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: { number: string } }) {
  const issue = await getIssueByNumber(Number(params.number)).catch(() => null);
  if (!issue) return { title: 'Match Programme · Καλαμάτα' };
  const title = `Match Programme · ${fixtureTitle(issue)}`;
  const image = issue.page_manifest?.cover;
  return { title, openGraph: { title, images: image ? [image] : ['/brand/crest.png'] } };
}

export default async function IssuePage({ params }: { params: { number: string } }) {
  const n = Number(params.number);
  if (!Number.isInteger(n)) notFound();
  const issue = await getIssueByNumber(n);
  if (!issue) notFound();
  const phase = phaseOf(issue);
  if (phase === 'draft') notFound();
  if (phase === 'archived' && issue.archive_access === 'hidden') notFound();
  const unlocked = isUnlocked(issue) || (phase === 'archived' && issue.archive_access === 'open');
  const { pages, toc } = prepare(issue);
  return <Experience issue={issue} pages={pages} toc={toc} phase={phase} unlocked={unlocked} />;
}
