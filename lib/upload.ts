'use client';
import type { SupabaseClient } from '@supabase/supabase-js';
import { STORAGE_BUCKET } from './supabase/env';

/** Centre-crops an image to the slot ratio and downsizes it (long edge ≤ 2200 px). */
export async function cropToRatio(file: Blob, ratio?: number, keepAlpha = false): Promise<Blob> {
  const bmp = await createImageBitmap(file);
  let sx = 0, sy = 0, sw = bmp.width, sh = bmp.height;
  if (ratio) {
    if (sw / sh > ratio) { sw = Math.round(sh * ratio); sx = Math.round((bmp.width - sw) / 2); }
    else { sh = Math.round(sw / ratio); sy = Math.round((bmp.height - sh) / 2); }
  }
  const scale = Math.min(1, 2200 / Math.max(sw, sh));
  const c = document.createElement('canvas');
  c.width = Math.round(sw * scale);
  c.height = Math.round(sh * scale);
  const x = c.getContext('2d')!;
  if (!keepAlpha) { x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height); }
  x.drawImage(bmp, sx, sy, sw, sh, 0, 0, c.width, c.height);
  return new Promise((res) => c.toBlob((b) => res(b!), keepAlpha ? 'image/png' : 'image/jpeg', 0.9));
}

export async function uploadBlob(db: SupabaseClient, path: string, blob: Blob): Promise<string> {
  const { error } = await db.storage.from(STORAGE_BUCKET).upload(path, blob, { upsert: true, contentType: blob.type, cacheControl: '31536000' });
  if (error) throw error;
  return db.storage.from(STORAGE_BUCKET).getPublicUrl(path).data.publicUrl;
}

export function rid() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}
