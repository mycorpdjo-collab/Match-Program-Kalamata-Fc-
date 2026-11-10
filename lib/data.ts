import 'server-only';
import demo from '@/data/demo-issue.json';
import { phaseOf } from './format';
import { serviceClient } from './supabase/server';
import type { Issue } from './types';

export const IS_DEMO = !serviceClient();

/**
 * Demo mode: the seed issue is live from "an hour ago" until its real expiry,
 * so the book can be tried immediately. Append ?preview=countdown to see the countdown.
 */
function demoIssue(preview?: string): Issue {
  const issue = structuredClone(demo) as Issue;
  const now = Date.now();
  if (preview === 'countdown') {
    issue.publish_at = new Date(now + (2 * 86400 + 4 * 3600 + 18 * 60) * 1000).toISOString();
  } else {
    issue.publish_at = new Date(now - 3600 * 1000).toISOString();
  }
  if (Date.parse(issue.expires_at) < now) issue.expires_at = new Date(now + 3 * 86400 * 1000).toISOString();
  return issue;
}

/** The issue that owns "/": the earliest published issue that has not expired yet. */
export async function getCurrentIssue(preview?: string): Promise<Issue | null> {
  const db = serviceClient();
  if (!db) return demoIssue(preview);
  const { data, error } = await db
    .from('issues')
    .select('*')
    .eq('status', 'published')
    .gt('expires_at', new Date().toISOString())
    .order('publish_at', { ascending: true })
    .limit(1);
  if (error) throw error;
  return (data?.[0] as Issue) ?? null;
}

/** The next issue after the current one has expired (for the "closed" state). */
export async function getNextScheduled(afterIso: string): Promise<Issue | null> {
  const db = serviceClient();
  if (!db) return null;
  const { data } = await db
    .from('issues')
    .select('*')
    .eq('status', 'published')
    .gt('publish_at', afterIso)
    .order('publish_at', { ascending: true })
    .limit(1);
  return (data?.[0] as Issue) ?? null;
}

export async function getIssueByNumber(n: number): Promise<Issue | null> {
  const db = serviceClient();
  if (!db) {
    const d = demoIssue();
    return d.number === n ? d : null;
  }
  const { data } = await db.from('issues').select('*').eq('number', n).eq('status', 'published').order('created_at', { ascending: false }).limit(1);
  return (data?.[0] as Issue) ?? null;
}

export async function getIssueById(id: string): Promise<Issue | null> {
  const db = serviceClient();
  if (!db) {
    const d = demoIssue();
    return d.id === id ? d : null;
  }
  const { data } = await db.from('issues').select('*').eq('id', id).maybeSingle();
  return (data as Issue) ?? null;
}

/** Published issues for /archive (expired ones plus the live one), hidden ones excluded. */
export async function listArchive(): Promise<Issue[]> {
  const db = serviceClient();
  if (!db) return [demoIssue()];
  const { data } = await db
    .from('issues')
    .select('*')
    .eq('status', 'published')
    .neq('archive_access', 'hidden')
    .lte('publish_at', new Date().toISOString())
    .order('publish_at', { ascending: false });
  return ((data ?? []) as Issue[]).filter((i) => phaseOf(i) !== 'draft');
}
