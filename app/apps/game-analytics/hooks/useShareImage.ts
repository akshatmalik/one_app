'use client';

import { useCallback, useState } from 'react';
import { toPng } from 'html-to-image';

/**
 * Single source of truth for turning any DOM node into a shareable image.
 *
 * Used by recaps (week/month/quarter/year story modes), review cards, stat
 * cards, and the gamer identity card — so "share" behaves identically
 * everywhere instead of each surface rolling its own export.
 */

export type ShareStatus = 'idle' | 'working' | 'shared' | 'downloaded' | 'copied' | 'error';

async function nodeToBlob(node: HTMLElement): Promise<Blob> {
  const dataUrl = await toPng(node, {
    cacheBust: true,
    pixelRatio: 2,
    // Recap screens use dark gradients; keep a solid backdrop for transparency gaps.
    backgroundColor: '#0a0a0f',
    filter: (el) => !(el instanceof HTMLElement && el.dataset?.shareHide === 'true'),
  });
  const res = await fetch(dataUrl);
  return res.blob();
}

export function useShareImage() {
  const [status, setStatus] = useState<ShareStatus>('idle');

  const reset = useCallback(() => setStatus('idle'), []);

  /** Native share sheet when available (mobile), else download fallback. */
  const share = useCallback(async (node: HTMLElement | null, filename: string, shareText?: string) => {
    if (!node) return;
    setStatus('working');
    try {
      const blob = await nodeToBlob(node);
      const file = new File([blob], `${filename}.png`, { type: 'image/png' });
      const nav = navigator as Navigator & { canShare?: (data: ShareData) => boolean };
      if (nav.share && nav.canShare && nav.canShare({ files: [file] })) {
        await nav.share({ files: [file], title: filename, text: shareText });
        setStatus('shared');
      } else {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${filename}.png`;
        a.click();
        URL.revokeObjectURL(url);
        setStatus('downloaded');
      }
    } catch (e) {
      // AbortError = user dismissed the native share sheet; not a real error.
      if (e instanceof Error && e.name === 'AbortError') { setStatus('idle'); return; }
      console.error('[useShareImage] share failed', e);
      setStatus('error');
    }
    setTimeout(() => setStatus('idle'), 2200);
  }, []);

  /** Explicit download (no native sheet). */
  const download = useCallback(async (node: HTMLElement | null, filename: string) => {
    if (!node) return;
    setStatus('working');
    try {
      const blob = await nodeToBlob(node);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${filename}.png`;
      a.click();
      URL.revokeObjectURL(url);
      setStatus('downloaded');
    } catch (e) {
      console.error('[useShareImage] download failed', e);
      setStatus('error');
    }
    setTimeout(() => setStatus('idle'), 2200);
  }, []);

  /** Copy image to clipboard where supported. */
  const copy = useCallback(async (node: HTMLElement | null) => {
    if (!node) return;
    setStatus('working');
    try {
      const blob = await nodeToBlob(node);
      const ClipboardItemCtor = (window as unknown as { ClipboardItem?: typeof ClipboardItem }).ClipboardItem;
      if (ClipboardItemCtor && navigator.clipboard && 'write' in navigator.clipboard) {
        await navigator.clipboard.write([new ClipboardItemCtor({ 'image/png': blob })]);
        setStatus('copied');
      } else {
        setStatus('error');
      }
    } catch (e) {
      console.error('[useShareImage] copy failed', e);
      setStatus('error');
    }
    setTimeout(() => setStatus('idle'), 2200);
  }, []);

  return { status, share, download, copy, reset };
}
