const paths: Record<string, JSX.Element> = {
  prev: <path d="M12.5 4.5 7 10l5.5 5.5" />,
  next: <path d="M7.5 4.5 13 10l-5.5 5.5" />,
  read: <path d="M3 5h14M3 9h14M3 13h9" />,
  more: (
    <>
      <circle cx="4.5" cy="10" r="1.4" fill="currentColor" stroke="none" />
      <circle cx="10" cy="10" r="1.4" fill="currentColor" stroke="none" />
      <circle cx="15.5" cy="10" r="1.4" fill="currentColor" stroke="none" />
    </>
  ),
  close: <path d="M5 5l10 10M15 5 5 15" />,
  lock: (
    <>
      <rect x="4" y="9" width="12" height="9" rx="0.5" />
      <path d="M6.8 9V6.5a3.2 3.2 0 0 1 6.4 0V9" />
    </>
  ),
  alert: (
    <>
      <circle cx="10" cy="10" r="7.5" />
      <path d="M10 6v5M10 13.6v.3" />
    </>
  ),
  first: <path d="M14 4.5 8.5 10l5.5 5.5M5.5 4.5v11" />,
  last: <path d="M6 4.5 11.5 10 6 15.5M14.5 4.5v11" />,
  zoomOut: (
    <>
      <circle cx="9" cy="9" r="5.5" />
      <path d="M6.5 9h5M13 13l4 4" />
    </>
  ),
  download: (
    <>
      <path d="M10 3v9M6.5 8.5 10 12l3.5-3.5" />
      <path d="M4 15h12" />
    </>
  ),
  book: (
    <path d="M4 4.5A2.5 2.5 0 0 1 6.5 2H16v14H6.5A2.5 2.5 0 0 0 4 18.5V4.5zM4 16h12" />
  ),
  scroll: (
    <>
      <rect x="5" y="2.5" width="10" height="15" rx="2" />
      <path d="M10 5.5v3" />
    </>
  ),
};

export function Icon({ name, size = 20 }: { name: keyof typeof paths | string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      {paths[name]}
    </svg>
  );
}
