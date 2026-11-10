'use client';
import { useEffect, useState } from 'react';
import { useAdmin } from '@/components/admin/AdminShell';
import IssueEditor from '@/components/admin/IssueEditor';
import type { Issue } from '@/lib/types';

export default function EditIssue({ params }: { params: { id: string } }) {
  const { db } = useAdmin();
  const [issue, setIssue] = useState<Issue | null>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    db.from('issues').select('*').eq('id', params.id).maybeSingle().then(({ data, error: err }) => {
      if (err) setError(err.message);
      else if (!data) setError('Το τεύχος δεν βρέθηκε.');
      else setIssue(data as Issue);
    });
  }, [db, params.id]);
  if (error) return <p role="alert" className="p-8">{error}</p>;
  if (!issue) return <p className="p-8">Φόρτωση…</p>;
  return <IssueEditor initial={issue} />;
}
