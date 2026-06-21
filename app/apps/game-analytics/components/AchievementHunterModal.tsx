'use client';

import { useEffect, useMemo, useState } from 'react';
import { X, Loader2, Trophy, RefreshCw, ChevronDown, ChevronUp, AlertTriangle, Award } from 'lucide-react';
import clsx from 'clsx';
import { Game } from '../lib/types';
import { loadSteamSyncSettings } from '../lib/steam-settings';
import { fetchAllAchievements, GameAchievementSummary } from '../lib/steam-achievement-service';
import { ProgressRing } from './ProgressRing';

interface AchievementHunterModalProps {
  userId: string;
  games: Game[];
  onClose: () => void;
  onOpenSteamSync: () => void;
}

export function AchievementHunterModal({ userId, games, onClose, onOpenSteamSync }: AchievementHunterModalProps) {
  const settings = useMemo(() => loadSteamSyncSettings(userId), [userId]);
  const hasCreds = !!(settings.steamId && settings.apiKey);

  // Match every library game against the persisted Steam name -> appid map.
  const targets = useMemo(() => {
    const seen = new Set<number>();
    const list: { appId: number; gameName: string }[] = [];
    for (const g of games) {
      const appId = settings.appIdMap[g.name.toLowerCase()];
      if (appId && !seen.has(appId)) {
        seen.add(appId);
        list.push({ appId, gameName: g.name });
      }
    }
    return list;
  }, [games, settings.appIdMap]);

  const [summaries, setSummaries] = useState<GameAchievementSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [expanded, setExpanded] = useState<number | null>(null);
  const [sortBy, setSortBy] = useState<'completion' | 'unlocked' | 'name'>('completion');
  const [hasLoaded, setHasLoaded] = useState(false);

  const load = async (skipCacheCount = 0) => {
    if (!hasCreds || targets.length === 0) return;
    setLoading(true);
    setProgress(0);
    const results = await fetchAllAchievements(settings.steamId, settings.apiKey, targets, done => setProgress(done));
    setSummaries(results);
    setLoading(false);
    setHasLoaded(true);
    void skipCacheCount;
  };

  useEffect(() => {
    if (hasCreds && targets.length > 0 && !hasLoaded) {
      load();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasCreds, targets.length]);

  const tracked = summaries.filter(s => s.hasStats && s.total > 0);
  const totalUnlocked = tracked.reduce((sum, s) => sum + s.unlocked, 0);
  const totalAchievements = tracked.reduce((sum, s) => sum + s.total, 0);
  const overallPercent = totalAchievements > 0 ? Math.round((totalUnlocked / totalAchievements) * 100) : 0;
  const perfectGames = tracked.filter(s => s.total > 0 && s.unlocked === s.total).length;

  const rarest = useMemo(() => {
    let best: { gameName: string; achievement: GameAchievementSummary['achievements'][number] } | null = null;
    for (const s of tracked) {
      for (const a of s.achievements) {
        if (a.achieved && a.globalPercent !== null) {
          if (!best || a.globalPercent < best.achievement.globalPercent!) {
            best = { gameName: s.gameName, achievement: a };
          }
        }
      }
    }
    return best;
  }, [tracked]);

  const sorted = useMemo(() => {
    const copy = [...tracked];
    if (sortBy === 'completion') {
      copy.sort((a, b) => (b.total > 0 ? b.unlocked / b.total : 0) - (a.total > 0 ? a.unlocked / a.total : 0));
    } else if (sortBy === 'unlocked') {
      copy.sort((a, b) => b.unlocked - a.unlocked);
    } else {
      copy.sort((a, b) => a.gameName.localeCompare(b.gameName));
    }
    return copy;
  }, [tracked, sortBy]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={onClose}>
      <div
        className="w-full max-w-lg max-h-[85vh] flex flex-col bg-[#0f0f1a] border border-white/10 rounded-2xl shadow-xl overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-5 border-b border-white/5 shrink-0">
          <div className="flex items-center gap-2">
            <Trophy size={18} className="text-amber-400" />
            <h3 className="text-lg font-bold text-white/90">Achievement Hunter</h3>
          </div>
          <button onClick={onClose} className="p-1 text-white/30 hover:text-white/60 transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5">
          {!hasCreds && (
            <div className="space-y-3 text-center py-8">
              <Trophy size={32} className="text-white/20 mx-auto" />
              <p className="text-sm text-white/50">
                Sync your Steam library first — Achievement Hunter reuses the same connection to pull real achievement progress.
              </p>
              <button
                onClick={onOpenSteamSync}
                className="px-5 py-2 rounded-lg bg-purple-600/80 hover:bg-purple-600 text-white text-sm font-medium transition-colors"
              >
                Sync Steam Library
              </button>
            </div>
          )}

          {hasCreds && targets.length === 0 && (
            <div className="space-y-2 text-center py-8">
              <AlertTriangle size={28} className="text-white/20 mx-auto" />
              <p className="text-sm text-white/50">
                No games in your library are linked to a Steam appid yet. Re-sync your Steam library to refresh the link, even for games you already own.
              </p>
              <button
                onClick={onOpenSteamSync}
                className="px-5 py-2 rounded-lg bg-white/10 hover:bg-white/15 text-white/80 text-sm font-medium transition-colors"
              >
                Sync Steam Library
              </button>
            </div>
          )}

          {hasCreds && targets.length > 0 && loading && (
            <div className="flex flex-col items-center justify-center py-10 gap-3">
              <Loader2 size={28} className="text-amber-400 animate-spin" />
              <div className="text-sm text-white/60">Checking achievements… {progress} / {targets.length}</div>
            </div>
          )}

          {hasCreds && targets.length > 0 && !loading && hasLoaded && (
            <div className="space-y-4">
              {/* Hero stats */}
              <div className="rounded-xl bg-gradient-to-br from-amber-500/10 to-transparent border border-amber-500/20 p-4">
                <div className="flex items-center gap-4">
                  <ProgressRing progress={overallPercent} color="#fbbf24" size={56} strokeWidth={3}>
                    <span className="text-[13px] font-bold text-amber-300">{overallPercent}%</span>
                  </ProgressRing>
                  <div className="flex-1">
                    <div className="text-[15px] font-bold text-white/90">
                      {totalUnlocked.toLocaleString()} / {totalAchievements.toLocaleString()} achievements
                    </div>
                    <div className="text-[11px] text-white/40">
                      across {tracked.length} tracked game{tracked.length === 1 ? '' : 's'}
                      {perfectGames > 0 && <span className="text-emerald-400"> · {perfectGames} perfect</span>}
                    </div>
                  </div>
                  <button
                    onClick={() => load(1)}
                    title="Refresh"
                    className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-white/50 transition-colors"
                  >
                    <RefreshCw size={14} />
                  </button>
                </div>
              </div>

              {rarest && (
                <div className="flex items-start gap-2 p-3 rounded-lg bg-purple-500/10 border border-purple-500/20">
                  <Award size={16} className="text-purple-300 shrink-0 mt-0.5" />
                  <div className="text-[12px] text-purple-200">
                    <span className="font-semibold">Rarest unlock:</span> {rarest.achievement.displayName} in {rarest.gameName}
                    {rarest.achievement.globalPercent !== null && (
                      <span className="text-purple-300/70"> — only {rarest.achievement.globalPercent.toFixed(1)}% of players have this</span>
                    )}
                  </div>
                </div>
              )}

              {/* Sort */}
              <div className="flex items-center gap-1.5 text-[11px]">
                <span className="text-white/30">Sort:</span>
                {([['completion', 'Completion'], ['unlocked', 'Most unlocked'], ['name', 'Name']] as const).map(([id, label]) => (
                  <button
                    key={id}
                    onClick={() => setSortBy(id)}
                    className={clsx('px-2 py-1 rounded-md transition-colors', sortBy === id ? 'bg-amber-500/20 text-amber-300' : 'bg-white/[0.03] text-white/40 hover:text-white/60')}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {/* Per-game list */}
              <div className="space-y-1.5">
                {sorted.map(s => {
                  const pct = s.total > 0 ? Math.round((s.unlocked / s.total) * 100) : 0;
                  const isOpen = expanded === s.appId;
                  return (
                    <div key={s.appId} className="rounded-lg bg-white/[0.02] border border-white/5 overflow-hidden">
                      <button
                        onClick={() => setExpanded(isOpen ? null : s.appId)}
                        className="w-full flex items-center gap-3 px-3 py-2.5 text-left"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-[13px] text-white/80 font-medium truncate">{s.gameName}</span>
                            <span className={clsx('text-[12px] font-semibold shrink-0', pct === 100 ? 'text-emerald-400' : 'text-white/50')}>
                              {s.unlocked}/{s.total}
                            </span>
                          </div>
                          <div className="mt-1.5 h-1.5 rounded-full bg-white/5 overflow-hidden">
                            <div
                              className={clsx('h-full rounded-full', pct === 100 ? 'bg-emerald-400' : 'bg-amber-400/70')}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                        {isOpen ? <ChevronUp size={14} className="text-white/30 shrink-0" /> : <ChevronDown size={14} className="text-white/30 shrink-0" />}
                      </button>

                      {isOpen && (
                        <div className="px-3 pb-3 grid grid-cols-2 gap-2">
                          {s.achievements
                            .slice()
                            .sort((a, b) => Number(b.achieved) - Number(a.achieved))
                            .map(a => (
                              <div
                                key={a.apiName}
                                className={clsx(
                                  'flex items-center gap-2 p-1.5 rounded-lg',
                                  a.achieved ? 'bg-amber-500/[0.06]' : 'bg-white/[0.01] opacity-50'
                                )}
                                title={a.description}
                              >
                                {(a.achieved ? a.icon : a.iconGray) ? (
                                  // eslint-disable-next-line @next/next/no-img-element
                                  <img src={a.achieved ? a.icon : a.iconGray} alt="" className="w-7 h-7 rounded shrink-0" />
                                ) : (
                                  <div className="w-7 h-7 rounded bg-white/5 shrink-0" />
                                )}
                                <div className="min-w-0">
                                  <div className="text-[10px] text-white/70 truncate leading-tight">{a.displayName}</div>
                                  {a.globalPercent !== null && (
                                    <div className="text-[9px] text-white/30 leading-tight">{a.globalPercent.toFixed(1)}% of players</div>
                                  )}
                                </div>
                              </div>
                            ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {tracked.length < summaries.length && (
                <div className="text-[11px] text-white/25 text-center">
                  {summaries.length - tracked.length} synced game{summaries.length - tracked.length === 1 ? '' : 's'} don&apos;t track Steam achievements.
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
