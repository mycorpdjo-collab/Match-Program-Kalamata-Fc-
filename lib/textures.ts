'use client';
import { getFontEmbedCSS, toJpeg, toPng } from 'html-to-image';

export const PAGE_W = 495;
export const PAGE_H = 700;

export interface LinkRegion {
  x: number; y: number; w: number; h: number;
  page?: number;
  href?: string;
}

export interface TextureSet {
  pages: string[];
  cover: string;
  coverMask: string;
  back: string;
}

async function waitForImages(root: HTMLElement) {
  const imgs = Array.from(root.querySelectorAll('img'));
  await Promise.all(imgs.map((img) => (img.complete ? Promise.resolve() : new Promise<void>((res) => { img.onload = img.onerror = () => res(); }))));
  if (document.fonts?.ready) await document.fonts.ready;
}

/**
 * Rasterises the hidden sheet (one node per page, rendered by <TextureSheet/>) into textures.
 * mobile: 1024 × 1448, desktop: 2048 × 2896.
 */
export async function renderTextures(sheet: HTMLElement, opts: { width?: number; onProgress?: (done: number, total: number) => void; format?: 'jpeg' | 'png' } = {}): Promise<TextureSet> {
  await waitForImages(sheet);
  const width = opts.width ?? 1024;
  const pixelRatio = width / PAGE_W;
  const fontEmbedCSS = await getFontEmbedCSS(sheet).catch(() => '');
  const nodes = {
    pages: Array.from(sheet.querySelectorAll<HTMLElement>('[data-tex="page"]')),
    cover: sheet.querySelector<HTMLElement>('[data-tex="cover"]')!,
    coverMask: sheet.querySelector<HTMLElement>('[data-tex="cover-mask"]')!,
    back: sheet.querySelector<HTMLElement>('[data-tex="back"]')!,
  };
  const total = nodes.pages.length + 3;
  let done = 0;
  const base = { pixelRatio, width: PAGE_W, height: PAGE_H, fontEmbedCSS, cacheBust: false, skipAutoScale: true, backgroundColor: '#ffffff' };
  const shot = async (n: HTMLElement, png = false) => {
    const url = png ? await toPng(n, base) : await toJpeg(n, { ...base, quality: 0.88 });
    done++;
    opts.onProgress?.(done, total);
    return url;
  };
  const cover = await shot(nodes.cover);
  const coverMask = await shot(nodes.coverMask, true);
  const back = await shot(nodes.back);
  const pages: string[] = [];
  for (const n of nodes.pages) pages.push(await shot(n));
  return { pages, cover, coverMask, back };
}

/** Clickable areas on each page (contents entries, ticket link) in normalised page coordinates. */
export function collectLinks(sheet: HTMLElement): Record<number, LinkRegion[]> {
  const out: Record<number, LinkRegion[]> = {};
  sheet.querySelectorAll<HTMLElement>('[data-tex="page"]').forEach((pageEl) => {
    const n = Number(pageEl.dataset.number);
    const box = pageEl.getBoundingClientRect();
    const list: LinkRegion[] = [];
    pageEl.querySelectorAll<HTMLAnchorElement>('a[href]').forEach((a) => {
      const r = a.getBoundingClientRect();
      if (!r.width || !r.height) return;
      const region: LinkRegion = { x: (r.left - box.left) / box.width, y: (r.top - box.top) / box.height, w: r.width / box.width, h: r.height / box.height };
      if (a.dataset.page) region.page = Number(a.dataset.page);
      else region.href = a.href;
      list.push(region);
    });
    out[n] = list;
  });
  return out;
}

export function dataUrlToBlob(url: string): Blob {
  const [head, body] = url.split(',');
  const mime = head.match(/data:(.*?);/)?.[1] ?? 'image/jpeg';
  const bin = atob(body);
  const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  return new Blob([arr], { type: mime });
}
