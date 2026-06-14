'use client';

import { RefObject } from 'react';
import { Share2, Download, Copy, Check, Loader2 } from 'lucide-react';
import clsx from 'clsx';
import { useShareImage } from '../hooks/useShareImage';

interface ShareButtonProps {
  /** Ref to the DOM node to capture as an image. */
  targetRef: RefObject<HTMLElement>;
  /** Base filename (no extension) for the exported PNG. */
  filename: string;
  /** Optional text included in the native share sheet. */
  shareText?: string;
  /** Compact icon-only variant for tight spots (recap footers, cards). */
  variant?: 'full' | 'compact';
  className?: string;
}

/**
 * Drop-in share control. Renders Share / Download / Copy backed by the shared
 * useShareImage hook so every recap, review, and card shares identically.
 * Mark elements with data-share-hide="true" to exclude them from the capture.
 */
export function ShareButton({ targetRef, filename, shareText, variant = 'full', className }: ShareButtonProps) {
  const { status, share, download, copy } = useShareImage();
  const busy = status === 'working';

  const label =
    status === 'shared' ? 'Shared' :
    status === 'downloaded' ? 'Saved' :
    status === 'copied' ? 'Copied' :
    status === 'error' ? 'Try again' :
    busy ? 'Rendering' : 'Share';

  const done = status === 'shared' || status === 'downloaded' || status === 'copied';

  if (variant === 'compact') {
    return (
      <button
        data-share-hide="true"
        onClick={() => share(targetRef.current, filename, shareText)}
        disabled={busy}
        title="Share as image"
        className={clsx(
          'inline-flex items-center justify-center w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors disabled:opacity-50',
          className
        )}
      >
        {busy ? <Loader2 size={16} className="animate-spin" /> : done ? <Check size={16} /> : <Share2 size={16} />}
      </button>
    );
  }

  return (
    <div data-share-hide="true" className={clsx('inline-flex items-center gap-1.5', className)}>
      <button
        onClick={() => share(targetRef.current, filename, shareText)}
        disabled={busy}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/15 hover:bg-white/25 text-white text-sm font-medium transition-colors disabled:opacity-50"
      >
        {busy ? <Loader2 size={15} className="animate-spin" /> : done ? <Check size={15} /> : <Share2 size={15} />}
        {label}
      </button>
      <button
        onClick={() => download(targetRef.current, filename)}
        disabled={busy}
        title="Download PNG"
        className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white/80 transition-colors disabled:opacity-50"
      >
        <Download size={15} />
      </button>
      <button
        onClick={() => copy(targetRef.current)}
        disabled={busy}
        title="Copy image"
        className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white/80 transition-colors disabled:opacity-50"
      >
        <Copy size={15} />
      </button>
    </div>
  );
}
