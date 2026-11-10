'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function CookieNotice() {
  const [show, setShow] = useState(false);
  const path = usePathname();
  useEffect(() => {
    try { setShow(!localStorage.getItem('kfc_cookie_ok')); } catch { setShow(false); }
  }, []);
  if (!show || path.startsWith('/admin')) return null;
  return (
    <div role="region" aria-label="Cookies" className="fixed inset-x-3 top-3 z-[60] flex flex-col gap-3 bg-ink p-4 text-[13px] leading-snug text-white sm:bottom-4 sm:left-4 sm:right-auto sm:top-auto sm:max-w-sm">
      <p className="m-0">Χρησιμοποιούμε ένα απαραίτητο cookie για την πρόσβαση στο πρόγραμμα και ανώνυμη μέτρηση σελίδων. <Link href="/privacy" className="text-white underline">Πολιτική Απορρήτου</Link></p>
      <button type="button" className="h-10 self-start bg-white px-4 font-semibold text-ink" onClick={() => { try { localStorage.setItem('kfc_cookie_ok', '1'); } catch {} setShow(false); }}>Εντάξει</button>
    </div>
  );
}
