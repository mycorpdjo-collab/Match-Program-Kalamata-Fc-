'use client';
import { useEffect, useRef, useState, type ReactNode } from 'react';

/** Shows a 495 × 700 print page scaled to the width of its box. */
export function ScaledPage({ children, className = '' }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [s, setS] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const fit = () => setS(el.clientWidth / 495);
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return (
    <div ref={ref} className={`relative aspect-[495/700] overflow-hidden ${className}`}>
      <div className="absolute left-0 top-0 origin-top-left" style={{ transform: `scale(${s})`, visibility: s ? 'visible' : 'hidden' }}>
        {children}
      </div>
    </div>
  );
}
