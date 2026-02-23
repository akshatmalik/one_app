'use client';

import { useState, useEffect, useCallback } from 'react';
import { AlertTriangle, X, Trash2, ChevronDown, ChevronUp, Copy, Check } from 'lucide-react';
import { getErrorLog, clearErrorLog, getErrorCount } from '../lib/error-log';
import { ErrorLogEntry } from '../lib/types';
import clsx from 'clsx';

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const secs = Math.floor(diff / 1000);
  if (secs < 60) return `${secs}s ago`;
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function ErrorEntry({ entry }: { entry: ErrorLogEntry }) {
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);

  const copyText = `[${entry.timestamp}] ${entry.context ? `[${entry.context}] ` : ''}${entry.message}${entry.stack ? '\n' + entry.stack : ''}`;

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(copyText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API not available
    }
  }

  return (
    <div className="border border-red-500/20 bg-red-500/5 rounded-lg overflow-hidden">
      <button
        onClick={() => setExpanded(e => !e)}
        className="w-full flex items-start gap-2.5 p-3 text-left hover:bg-red-500/5 transition-colors"
      >
        <AlertTriangle size={13} className="text-red-400 flex-shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <p className="text-[11px] font-medium text-red-200 leading-snug truncate">
            {entry.message}
          </p>
          <div className="flex items-center gap-2 mt-0.5">
            {entry.context && (
              <span className="text-[9px] text-white/30 bg-white/5 px-1.5 py-0.5 rounded">{entry.context}</span>
            )}
            <span className="text-[9px] text-white/30">{relativeTime(entry.timestamp)}</span>
          </div>
        </div>
        <div className="flex-shrink-0 text-white/20">
          {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
        </div>
      </button>

      {expanded && (
        <div className="px-3 pb-3 border-t border-red-500/10">
          <div className="flex items-center justify-between mt-2 mb-1.5">
            <span className="text-[9px] text-white/30 font-mono">{new Date(entry.timestamp).toLocaleString()}</span>
            <button onClick={handleCopy} className="flex items-center gap-1 text-[9px] text-white/30 hover:text-white/60 transition-colors">
              {copied ? <><Check size={10} className="text-emerald-400" /> Copied</> : <><Copy size={10} /> Copy</>}
            </button>
          </div>
          {entry.stack && (
            <pre className="text-[9px] text-white/40 font-mono overflow-x-auto whitespace-pre-wrap break-all leading-relaxed bg-black/20 p-2 rounded">
              {entry.stack.split('\n').slice(0, 6).join('\n')}
            </pre>
          )}
        </div>
      )}
    </div>
  );
}

interface ErrorLogPanelProps {
  /** Called when panel is closed */
  onClose: () => void;
}

export function ErrorLogPanel({ onClose }: ErrorLogPanelProps) {
  const [entries, setEntries] = useState<ErrorLogEntry[]>([]);

  const reload = useCallback(() => setEntries(getErrorLog()), []);

  useEffect(() => { reload(); }, [reload]);

  function handleClear() {
    clearErrorLog();
    setEntries([]);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-md bg-[#1a1a2e] border border-red-500/20 rounded-2xl shadow-2xl max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-white/5">
          <AlertTriangle size={16} className="text-red-400 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-white">Error Log</p>
            <p className="text-[11px] text-white/40">
              {entries.length === 0 ? 'No errors recorded' : `${entries.length} error${entries.length !== 1 ? 's' : ''} recorded`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {entries.length > 0 && (
              <button
                onClick={handleClear}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] text-red-400 hover:bg-red-500/10 transition-colors"
              >
                <Trash2 size={12} />
                Clear
              </button>
            )}
            <button onClick={onClose} className="p-1.5 rounded-lg text-white/40 hover:text-white/70 hover:bg-white/5 transition-colors">
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {entries.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-3xl mb-2">✅</div>
              <p className="text-sm text-white/40">No errors logged</p>
              <p className="text-xs text-white/20 mt-1">Any errors will appear here</p>
            </div>
          ) : (
            entries.map(e => <ErrorEntry key={e.id} entry={e} />)
          )}
        </div>
      </div>
    </div>
  );
}

// ── Error Log Button (shown in header) ──────────────────────────────

interface ErrorLogButtonProps {
  onClick: () => void;
}

export function ErrorLogButton({ onClick }: ErrorLogButtonProps) {
  const [count, setCount] = useState(0);

  // Poll for new errors every 5 seconds
  useEffect(() => {
    setCount(getErrorCount());
    const interval = setInterval(() => setCount(getErrorCount()), 5000);
    return () => clearInterval(interval);
  }, []);

  if (count === 0) return null;

  return (
    <button
      onClick={onClick}
      className={clsx(
        'relative flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border transition-all',
        'bg-red-500/10 border-red-500/20 text-red-400 hover:bg-red-500/15 hover:border-red-500/30',
        'text-[11px] font-medium'
      )}
      title="View error log"
    >
      <AlertTriangle size={12} />
      <span>{count} error{count !== 1 ? 's' : ''}</span>
    </button>
  );
}
