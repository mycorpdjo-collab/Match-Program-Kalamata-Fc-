import Link from 'next/link';
import Experience from '@/components/public/Experience';
import StatusScreen from '@/components/public/StatusScreen';
import { getCurrentIssue, listArchive } from '@/lib/data';
import { fixtureTitle, phaseOf } from '@/lib/format';
import { isUnlocked, prepare } from '@/lib/view';

export const dynamic = 'force-dynamic';

export async function generateMetadata() {
  const issue = await getCurrentIssue().catch(() => null);
  if (!issue) return { title: 'Match Programme · Καλαμάτα' };
  const title = `Match Programme · ${fixtureTitle(issue)}`;
  const image = issue.page_manifest?.cover;
  return { title, openGraph: { title, images: image ? [image] : ['/brand/crest.png'] } };
}

export default async function Home({ searchParams }: { searchParams: { preview?: string } }) {
  const issue = await getCurrentIssue(searchParams.preview);
  if (!issue) {
    const latest = (await listArchive())[0];
    if (latest) {
      return (
        <StatusScreen title="Το πρόγραμμα αυτού του αγώνα έκλεισε.">
          {latest.archive_access !== 'hidden' && (
            <Link href={`/issue/${latest.number}`} className="bg-ink px-6 py-4 font-semibold text-white">Διαβάστε το στο αρχείο</Link>
          )}
        </StatusScreen>
      );
    }
    return <StatusScreen title="Το επόμενο πρόγραμμα ανακοινώνεται σύντομα" />;
  }
  const { pages, toc } = prepare(issue);
  return <Experience issue={issue} pages={pages} toc={toc} phase={phaseOf(issue)} unlocked={isUnlocked(issue)} />;
}
