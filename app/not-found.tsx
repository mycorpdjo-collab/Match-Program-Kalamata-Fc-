import Link from 'next/link';
import StatusScreen from '@/components/public/StatusScreen';

export default function NotFound() {
  return (
    <StatusScreen title="Αυτό το τεύχος δεν είναι διαθέσιμο">
      <Link href="/" className="bg-ink px-6 py-4 font-semibold text-white">Στο τρέχον πρόγραμμα</Link>
    </StatusScreen>
  );
}
