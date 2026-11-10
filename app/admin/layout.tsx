import AdminShell from '@/components/admin/AdminShell';

export const metadata = { title: 'Διαχείριση · Match Programme', robots: { index: false } };

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <AdminShell>{children}</AdminShell>;
}
