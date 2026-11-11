'use client';
import type { TextureSet } from '@/lib/textures';
import type { Issue } from '@/lib/types';

export async function exportIssueToPdf(
  issue: Issue,
  tex: TextureSet | null,
  onProgress?: (msg: string) => void
): Promise<boolean> {
  try {
    if (!tex || !tex.pages || !tex.pages.length) {
      if (typeof window !== 'undefined') window.print();
      return true;
    }

    onProgress?.('Προετοιμασία αρχείου PDF...');
    const { jsPDF } = await import('jspdf');

    // Standard aspect ratio matching programme pages (495 x 700 points)
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'pt',
      format: [495, 700],
      compress: true,
    });

    // 1. Cover
    onProgress?.('Προσθήκη εξωφύλλου...');
    if (tex.cover) {
      doc.addImage(tex.cover, 'JPEG', 0, 0, 495, 700, undefined, 'FAST');
    }

    // 2. All inside pages
    for (let i = 0; i < tex.pages.length; i++) {
      onProgress?.(`Προσθήκη σελίδας ${i + 1} / ${tex.pages.length}...`);
      doc.addPage([495, 700], 'portrait');
      doc.addImage(tex.pages[i], 'JPEG', 0, 0, 495, 700, undefined, 'FAST');
    }

    // 3. Back cover
    if (tex.back) {
      onProgress?.('Προσθήκη οπισθόφυλλου...');
      doc.addPage([495, 700], 'portrait');
      doc.addImage(tex.back, 'JPEG', 0, 0, 495, 700, undefined, 'FAST');
    }

    onProgress?.('Λήψη αρχείου...');
    const filename = `Kalamata-FC-Match-Programme-${String(issue.number).padStart(2, '0')}.pdf`;
    doc.save(filename);
    return true;
  } catch (err) {
    console.error('PDF export failed, falling back to window.print():', err);
    if (typeof window !== 'undefined') {
      window.print();
    }
    return false;
  }
}
