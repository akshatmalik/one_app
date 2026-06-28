'use client';

import { useMemo, useState } from 'react';
import { X, Users, Copy, Check, Trophy, ClipboardPaste, ArrowLeftRight, Crown, UserPlus, Swords, RefreshCw } from 'lucide-react';
import clsx from 'clsx';
import { Game } from '../lib/types';
import {
  VersusSnapshot,
  buildVersusSnapshot,
  encodeVersusCode,
  decodeVersusCode,
} from '../lib/versus-codes';
import {
  ChallengeMetric,
  CHALLENGE_METRICS,
  computeChallengeStandings,
  getChallengeMetric,
  getChallengeStatus,
} from '../lib/squad-challenges';
import { formatCurrency, formatCostPerHour, formatHours, formatPercent } from '../lib/format';
import { useSquad } from '../hooks/useSquad';
import { useSquadChallenge } from '../hooks/useSquadChallenge';

interface Props {
  games: Game[];
  userId: string | null;
  onClose: () => void;
}

type ViewMode = '1v1' | 'squad';

interface SquadStatDef {
  key: string;
  label: string;
  lowerBetter: boolean;
  value: (s: VersusSnapshot) => number;
  format: (s: VersusSnapshot) => string;
}

const SQUAD_STATS: SquadStatDef[] = [
  { key: 'totalHours', label: 'Hours', lowerBetter: false, value: s => s.totalHours, format: s => formatHours(s.totalHours) },
  { key: 'ownedCount', label: 'Library', lowerBetter: false, value: s => s.ownedCount, format: s => String(s.ownedCount) },
  { key: 'totalSpent', label: 'Spent', lowerBetter: false, value: s => s.totalSpent, format: s => formatCurrency(s.totalSpent) },
  { key: 'avgCostPerHour', label: '$/Hour', lowerBetter: true, value: s => s.avgCostPerHour, format: s => formatCostPerHour(s.avgCostPerHour) },
  { key: 'avgRating', label: 'Rating', lowerBetter: false, value: s => s.avgRating, format: s => (s.avgRating > 0 ? `${s.avgRating.toFixed(1)}/10` : '—') },
  { key: 'completionRate', label: 'Completion', lowerBetter: false, value: s => s.completionRate, format: s => formatPercent(s.completionRate * 100) },
  { key: 'creditScore', label: 'Credit', lowerBetter: false, value: s => s.creditScore, format: s => String(s.creditScore) },
];

interface LeaderboardEntry {
  name: string;
  snapshot: VersusSnapshot;
  isMe: boolean;
  memberId?: string;
  composite: number;
  bestStats: string[];
}

function computeRanks(values: number[], lowerBetter: boolean): number[] {
  const order = values.map((v, i) => ({ v, i })).sort((a, b) => (lowerBetter ? a.v - b.v : b.v - a.v));
  const ranks = new Array(values.length).fill(0);
  order.forEach((o, idx) => {
    ranks[o.i] = idx > 0 && o.v === order[idx - 1].v ? ranks[order[idx - 1].i] : idx + 1;
  });
  return ranks;
}

function rankToScore(rank: number, n: number): number {
  if (n <= 1) return 100;
  return Math.round(((n - rank) / (n - 1)) * 100);
}

function buildLeaderboard(me: VersusSnapshot, rivals: { id: string; snapshot: VersusSnapshot }[]): LeaderboardEntry[] {
  const entries = [
    { snapshot: me, isMe: true, memberId: undefined as string | undefined },
    ...rivals.map(r => ({ snapshot: r.snapshot, isMe: false, memberId: r.id as string | undefined })),
  ];
  const n = entries.length;
  const perStatRanks = SQUAD_STATS.map(stat => computeRanks(entries.map(e => stat.value(e.snapshot)), stat.lowerBetter));
  const composites = entries.map((_, i) => {
    const scores = perStatRanks.map(ranks => rankToScore(ranks[i], n));
    return Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
  });
  const bestStatsPerEntry = entries.map((_, i) =>
    SQUAD_STATS.filter((_, si) => perStatRanks[si][i] === 1).map(s => s.key)
  );

  return entries
    .map((e, i) => ({
      name: e.snapshot.name,
      snapshot: e.snapshot,
      isMe: e.isMe,
      memberId: e.memberId,
      composite: composites[i],
      bestStats: bestStatsPerEntry[i],
    }))
    .sort((a, b) => b.composite - a.composite);
}

interface StatRow {
  label: string;
  meDisplay: string;
  rivalDisplay: string;
  meNum: number;
  rivalNum: number;
  lowerBetter: boolean;
}

function buildStats(me: VersusSnapshot, rival: VersusSnapshot): StatRow[] {
  return [
    {
      label: 'Total Hours',
      meDisplay: formatHours(me.totalHours),
      rivalDisplay: formatHours(rival.totalHours),
      meNum: me.totalHours,
      rivalNum: rival.totalHours,
      lowerBetter: false,
    },
    {
      label: 'Library Size',
      meDisplay: String(me.ownedCount),
      rivalDisplay: String(rival.ownedCount),
      meNum: me.ownedCount,
      rivalNum: rival.ownedCount,
      lowerBetter: false,
    },
    {
      label: 'Total Spent',
      meDisplay: formatCurrency(me.totalSpent),
      rivalDisplay: formatCurrency(rival.totalSpent),
      meNum: me.totalSpent,
      rivalNum: rival.totalSpent,
      lowerBetter: false,
    },
    {
      label: 'Cost / Hour',
      meDisplay: formatCostPerHour(me.avgCostPerHour),
      rivalDisplay: formatCostPerHour(rival.avgCostPerHour),
      meNum: me.avgCostPerHour,
      rivalNum: rival.avgCostPerHour,
      lowerBetter: true,
    },
    {
      label: 'Avg Rating',
      meDisplay: me.avgRating > 0 ? `${me.avgRating.toFixed(1)}/10` : '—',
      rivalDisplay: rival.avgRating > 0 ? `${rival.avgRating.toFixed(1)}/10` : '—',
      meNum: me.avgRating,
      rivalNum: rival.avgRating,
      lowerBetter: false,
    },
    {
      label: 'Completion Rate',
      meDisplay: formatPercent(me.completionRate * 100),
      rivalDisplay: formatPercent(rival.completionRate * 100),
      meNum: me.completionRate,
      rivalNum: rival.completionRate,
      lowerBetter: false,
    },
    {
      label: 'Credit Score',
      meDisplay: String(me.creditScore),
      rivalDisplay: String(rival.creditScore),
      meNum: me.creditScore,
      rivalNum: rival.creditScore,
      lowerBetter: false,
    },
  ];
}

function rowWinner(row: StatRow): 'me' | 'rival' | 'tie' {
  if (row.meNum === row.rivalNum) return 'tie';
  if (row.lowerBetter) return row.meNum < row.rivalNum ? 'me' : 'rival';
  return row.meNum > row.rivalNum ? 'me' : 'rival';
}

export function VersusModal({ games, userId, onClose }: Props) {
  const [mode, setMode] = useState<ViewMode>('1v1');
  const [name, setName] = useState('Player');
  const [copied, setCopied] = useState(false);
  const [pasteValue, setPasteValue] = useState('');
  const [pasteError, setPasteError] = useState(false);
  const [rival, setRival] = useState<VersusSnapshot | null>(null);

  const [squadPasteValue, setSquadPasteValue] = useState('');
  const [squadPasteError, setSquadPasteError] = useState(false);
  const squad = useSquad(userId);
  const squadChallenge = useSquadChallenge(userId);

  const [showStartChallenge, setShowStartChallenge] = useState(false);
  const [challengeMetric, setChallengeMetric] = useState<ChallengeMetric>('hours');
  const [challengeDuration, setChallengeDuration] = useState(7);
  const [refreshingMemberId, setRefreshingMemberId] = useState<string | null>(null);
  const [refreshValue, setRefreshValue] = useState('');
  const [refreshError, setRefreshError] = useState(false);

  const mySnapshot = useMemo(() => buildVersusSnapshot(games, name), [games, name]);
  const myCode = useMemo(() => encodeVersusCode(mySnapshot), [mySnapshot]);

  const leaderboard = useMemo(
    () => buildLeaderboard(mySnapshot, squad.members.map(m => ({ id: m.id, snapshot: m.snapshot }))),
    [mySnapshot, squad.members]
  );

  const challengeStandings = useMemo(() => {
    if (!squadChallenge.challenge) return [];
    const current = [
      { id: 'me', snapshot: mySnapshot },
      ...squad.members.map(m => ({ id: m.id, snapshot: m.snapshot })),
    ];
    return computeChallengeStandings(squadChallenge.challenge, current);
  }, [squadChallenge.challenge, mySnapshot, squad.members]);

  const challengeStatus = squadChallenge.challenge ? getChallengeStatus(squadChallenge.challenge) : null;

  function handleAddSquadMember() {
    const ok = squad.addFromCode(squadPasteValue);
    if (!ok) {
      setSquadPasteError(true);
      return;
    }
    setSquadPasteError(false);
    setSquadPasteValue('');
  }

  function handleStartChallenge() {
    const participants = [
      { id: 'me', name: mySnapshot.name, baseline: mySnapshot },
      ...squad.members.map(m => ({ id: m.id, name: m.snapshot.name, baseline: m.snapshot })),
    ];
    squadChallenge.start(challengeMetric, challengeDuration, participants);
    setShowStartChallenge(false);
  }

  function handleRefreshMember(id: string) {
    const ok = squad.refreshCode(id, refreshValue);
    if (!ok) {
      setRefreshError(true);
      return;
    }
    setRefreshError(false);
    setRefreshValue('');
    setRefreshingMemberId(null);
  }

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(myCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API not available
    }
  }

  function handleCompare() {
    const decoded = decodeVersusCode(pasteValue);
    if (!decoded) {
      setPasteError(true);
      return;
    }
    setPasteError(false);
    setRival(decoded);
  }

  const stats = useMemo(() => rival ? buildStats(mySnapshot, rival) : [], [mySnapshot, rival]);

  const { winsMe, winsRival, contested } = useMemo(() => {
    let me = 0, riv = 0, total = 0;
    for (const row of stats) {
      const w = rowWinner(row);
      if (w !== 'tie') { total++; if (w === 'me') me++; else riv++; }
    }
    return { winsMe: me, winsRival: riv, contested: total };
  }, [stats]);

  const overall = winsMe > winsRival ? 'me' : winsRival > winsMe ? 'rival' : 'tie';

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

      <div
        className="relative w-full sm:max-w-lg max-h-[92dvh] bg-[#0e0e16] rounded-t-2xl sm:rounded-2xl overflow-hidden flex flex-col animate-bottom-sheet-up"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-white/5 shrink-0">
          <div className="flex items-center gap-2">
            <Users size={15} className="text-emerald-400" />
            <h2 className="text-sm font-bold text-white">Rival Check</h2>
          </div>
          <button onClick={onClose} className="p-1.5 text-white/40 hover:text-white/70 transition-colors rounded-lg">
            <X size={16} />
          </button>
        </div>

        {/* Mode toggle */}
        <div className="flex items-center gap-1 px-4 pt-3 pb-1 shrink-0">
          <button
            onClick={() => setMode('1v1')}
            className={clsx(
              'flex-1 py-1.5 rounded-lg text-xs font-semibold transition-colors',
              mode === '1v1' ? 'bg-white/10 text-white' : 'text-white/30 hover:text-white/50'
            )}
          >
            1v1
          </button>
          <button
            onClick={() => setMode('squad')}
            className={clsx(
              'flex-1 py-1.5 rounded-lg text-xs font-semibold transition-colors',
              mode === 'squad' ? 'bg-white/10 text-white' : 'text-white/30 hover:text-white/50'
            )}
          >
            Squad
          </button>
        </div>

        <div className="overflow-y-auto flex-1 min-h-0 overscroll-contain">
          {mode === 'squad' ? (
            /* ── Squad leaderboard ── */
            <div className="p-4 space-y-5 pb-8">
              <p className="text-xs text-white/40 leading-relaxed">
                Add multiple friends&apos; codes to build a leaderboard — composite score blends all 7 stats,
                ranked against everyone in the squad.
              </p>

              <div>
                <label className="block text-[10px] text-white/25 font-bold uppercase tracking-wider mb-1.5">
                  Add a rival&apos;s code
                </label>
                <textarea
                  value={squadPasteValue}
                  onChange={e => { setSquadPasteValue(e.target.value); setSquadPasteError(false); }}
                  placeholder="Paste their Rival Check code here…"
                  rows={3}
                  className={clsx(
                    'w-full px-3 py-2 bg-white/[0.04] border rounded-lg text-white text-xs placeholder:text-white/25 focus:outline-none transition-all resize-none font-mono',
                    squadPasteError ? 'border-red-500/50' : 'border-white/10 focus:border-emerald-500/50'
                  )}
                />
                {squadPasteError && (
                  <p className="text-[11px] text-red-400 mt-1.5">
                    That code didn&apos;t decode. Ask them to copy their Rival Check code again.
                  </p>
                )}
                <button
                  onClick={handleAddSquadMember}
                  disabled={!squadPasteValue.trim()}
                  className="mt-3 w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-emerald-500/15 text-emerald-300 text-sm font-semibold hover:bg-emerald-500/20 disabled:opacity-30 disabled:hover:bg-emerald-500/15 transition-colors"
                >
                  <UserPlus size={14} /> Add to Squad
                </button>
              </div>

              {squad.members.length === 0 ? (
                <div className="rounded-xl border border-white/5 bg-white/[0.025] p-5 text-center">
                  <p className="text-xs text-white/30">Add at least one rival&apos;s code above to start the leaderboard.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {leaderboard.map((entry, idx) => (
                    <div
                      key={entry.memberId ?? 'me'}
                      className={clsx(
                        'rounded-xl border p-3',
                        entry.isMe ? 'border-emerald-500/30 bg-emerald-500/[0.04]' : 'border-white/5 bg-white/[0.025]'
                      )}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className={clsx(
                            'flex items-center justify-center w-6 h-6 rounded-full text-[11px] font-bold shrink-0',
                            idx === 0 ? 'bg-yellow-500/20 text-yellow-300' : 'bg-white/10 text-white/50'
                          )}>
                            {idx === 0 ? <Crown size={12} /> : idx + 1}
                          </span>
                          <div className="min-w-0">
                            <p className="text-xs font-semibold text-white/90 truncate">
                              {entry.name}{entry.isMe && ' (You)'}
                            </p>
                            <p className="text-[9px] text-white/25">
                              {entry.bestStats.length > 0
                                ? `Best in squad: ${entry.bestStats.length} stat${entry.bestStats.length > 1 ? 's' : ''}`
                                : ' '}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-sm font-bold text-white tabular-nums">{entry.composite}</span>
                          {!entry.isMe && entry.memberId && (
                            <>
                              <button
                                onClick={() => {
                                  setRefreshingMemberId(refreshingMemberId === entry.memberId ? null : entry.memberId!);
                                  setRefreshValue('');
                                  setRefreshError(false);
                                }}
                                className="p-1 text-white/25 hover:text-emerald-300 transition-colors"
                              >
                                <RefreshCw size={12} />
                              </button>
                              <button
                                onClick={() => squad.remove(entry.memberId!)}
                                className="p-1 text-white/25 hover:text-red-400 transition-colors"
                              >
                                <X size={12} />
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                      {refreshingMemberId === entry.memberId && (
                        <div className="mt-2.5 pt-2.5 border-t border-white/5">
                          <textarea
                            value={refreshValue}
                            onChange={e => { setRefreshValue(e.target.value); setRefreshError(false); }}
                            placeholder="Paste their updated Rival Check code…"
                            rows={2}
                            className={clsx(
                              'w-full px-2.5 py-1.5 bg-white/[0.04] border rounded-lg text-white text-[11px] placeholder:text-white/25 focus:outline-none transition-all resize-none font-mono',
                              refreshError ? 'border-red-500/50' : 'border-white/10 focus:border-emerald-500/50'
                            )}
                          />
                          {refreshError && (
                            <p className="text-[10px] text-red-400 mt-1">That code didn&apos;t decode.</p>
                          )}
                          <button
                            onClick={() => handleRefreshMember(entry.memberId!)}
                            disabled={!refreshValue.trim()}
                            className="mt-1.5 w-full py-1.5 rounded-lg bg-white/10 text-white/70 text-[11px] font-semibold hover:bg-white/15 disabled:opacity-30 transition-colors"
                          >
                            Update stats
                          </button>
                        </div>
                      )}
                      <div className="grid grid-cols-4 gap-1.5 mt-2.5">
                        {SQUAD_STATS.map(stat => (
                          <div key={stat.key} className="text-center">
                            <p className={clsx(
                              'text-[10px] font-semibold tabular-nums',
                              entry.bestStats.includes(stat.key) ? 'text-emerald-300' : 'text-white/50'
                            )}>
                              {stat.format(entry.snapshot)}
                            </p>
                            <p className="text-[8px] text-white/20 uppercase tracking-wide">{stat.label}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {(squad.members.length > 0 || squadChallenge.challenge) && (
                <div className="rounded-xl border border-white/5 bg-white/[0.025] p-3.5">
                  {squadChallenge.challenge && challengeStatus ? (
                    <>
                      <div className="flex items-center justify-between gap-2 mb-3">
                        <div className="flex items-center gap-1.5">
                          <Swords size={13} className="text-orange-400" />
                          <p className="text-xs font-bold text-white/90">
                            {getChallengeMetric(squadChallenge.challenge.metric).shortLabel} Challenge
                          </p>
                        </div>
                        <span className={clsx(
                          'text-[10px] font-semibold px-2 py-0.5 rounded-full',
                          challengeStatus.isOver
                            ? 'bg-white/10 text-white/40'
                            : challengeStatus.daysLeft <= 1
                              ? 'bg-red-500/15 text-red-300'
                              : 'bg-orange-500/15 text-orange-300'
                        )}>
                          {challengeStatus.isOver ? 'Final' : challengeStatus.daysLeft <= 1 ? 'Last day' : `${challengeStatus.daysLeft}d left`}
                        </span>
                      </div>
                      <div className="space-y-1.5">
                        {challengeStandings.map((row, idx) => (
                          <div key={row.id} className="flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg bg-white/[0.03]">
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="text-[10px] font-bold text-white/40 w-3.5 shrink-0">{idx + 1}</span>
                              {challengeStatus.isOver && row.isLeader && <Crown size={11} className="text-yellow-300 shrink-0" />}
                              <p className="text-[11px] font-semibold text-white/80 truncate">
                                {row.name}{row.isMe && ' (You)'}
                              </p>
                            </div>
                            <span className={clsx(
                              'text-[11px] font-bold tabular-nums shrink-0',
                              row.isLeader ? 'text-emerald-300' : 'text-white/50'
                            )}>
                              {row.formattedDelta}
                            </span>
                          </div>
                        ))}
                      </div>
                      {challengeStatus.isOver ? (
                        <button
                          onClick={() => squadChallenge.end()}
                          className="mt-3 w-full py-2 rounded-lg bg-orange-500/15 text-orange-300 text-xs font-semibold hover:bg-orange-500/20 transition-colors"
                        >
                          Start a new challenge
                        </button>
                      ) : (
                        <p className="text-[10px] text-white/25 mt-2.5 leading-relaxed">
                          Standings update live as everyone&apos;s stats change — refresh a rival&apos;s code above if their numbers look stale.
                        </p>
                      )}
                    </>
                  ) : showStartChallenge ? (
                    <>
                      <p className="text-xs font-bold text-white/90 mb-2.5">Start a Squad Challenge</p>
                      <div className="grid grid-cols-2 gap-1.5">
                        {CHALLENGE_METRICS.map(m => (
                          <button
                            key={m.key}
                            onClick={() => setChallengeMetric(m.key)}
                            className={clsx(
                              'px-2 py-2 rounded-lg text-[11px] font-semibold transition-colors text-left',
                              challengeMetric === m.key
                                ? 'bg-orange-500/15 text-orange-300 border border-orange-500/30'
                                : 'bg-white/[0.03] text-white/50 border border-white/5 hover:bg-white/[0.06]'
                            )}
                          >
                            {m.shortLabel}
                          </button>
                        ))}
                      </div>
                      <p className="text-[10px] text-white/25 mt-2 leading-relaxed">
                        {getChallengeMetric(challengeMetric).description}
                      </p>
                      <p className="text-[10px] text-white/25 font-bold uppercase tracking-wider mt-3 mb-1.5">Duration</p>
                      <div className="grid grid-cols-3 gap-1.5">
                        {[7, 14, 30].map(d => (
                          <button
                            key={d}
                            onClick={() => setChallengeDuration(d)}
                            className={clsx(
                              'py-1.5 rounded-lg text-[11px] font-semibold transition-colors',
                              challengeDuration === d ? 'bg-white/15 text-white' : 'bg-white/[0.03] text-white/40 hover:bg-white/[0.06]'
                            )}
                          >
                            {d} days
                          </button>
                        ))}
                      </div>
                      <div className="flex items-center gap-2 mt-3">
                        <button
                          onClick={() => setShowStartChallenge(false)}
                          className="flex-1 py-2 rounded-lg bg-white/[0.04] text-white/50 text-xs font-semibold hover:bg-white/[0.08] transition-colors"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={handleStartChallenge}
                          className="flex-1 py-2 rounded-lg bg-orange-500/15 text-orange-300 text-xs font-semibold hover:bg-orange-500/20 transition-colors"
                        >
                          Start challenge
                        </button>
                      </div>
                    </>
                  ) : (
                    <button
                      onClick={() => setShowStartChallenge(true)}
                      className="w-full flex items-center justify-center gap-2 py-2 text-xs font-semibold text-white/50 hover:text-white/80 transition-colors"
                    >
                      <Swords size={14} /> Start a Squad Challenge
                    </button>
                  )}
                </div>
              )}
            </div>
          ) : !rival ? (
            /* ── Setup: share my code + paste a friend's ── */
            <div className="p-4 space-y-5 pb-8">
              <p className="text-xs text-white/40 leading-relaxed">
                Compare libraries with a friend — no accounts, no servers. Share your code,
                paste theirs back, see who wins.
              </p>

              <div>
                <label className="block text-[10px] text-white/25 font-bold uppercase tracking-wider mb-1.5">
                  Your name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  maxLength={24}
                  placeholder="Player"
                  className="w-full px-3 py-2 bg-white/[0.04] border border-white/10 rounded-lg text-white text-sm placeholder:text-white/25 focus:outline-none focus:border-emerald-500/50 transition-all"
                />
              </div>

              <div className="rounded-xl border border-white/5 bg-white/[0.025] p-3">
                <p className="text-[10px] text-white/25 font-bold uppercase tracking-wider mb-2">Your code</p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 min-w-0 text-[11px] text-white/60 bg-black/30 rounded-lg px-2.5 py-2 truncate font-mono">
                    {myCode || '—'}
                  </code>
                  <button
                    onClick={handleCopy}
                    disabled={!myCode}
                    className={clsx(
                      'flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors shrink-0',
                      copied ? 'bg-emerald-500/15 text-emerald-300' : 'bg-white/10 text-white/70 hover:bg-white/15'
                    )}
                  >
                    {copied ? <Check size={13} /> : <Copy size={13} />}
                    {copied ? 'Copied' : 'Copy'}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[10px] text-white/25 font-bold uppercase tracking-wider mb-1.5">
                  Paste a friend&apos;s code
                </label>
                <textarea
                  value={pasteValue}
                  onChange={e => { setPasteValue(e.target.value); setPasteError(false); }}
                  placeholder="Paste their Rival Check code here…"
                  rows={3}
                  className={clsx(
                    'w-full px-3 py-2 bg-white/[0.04] border rounded-lg text-white text-xs placeholder:text-white/25 focus:outline-none transition-all resize-none font-mono',
                    pasteError ? 'border-red-500/50' : 'border-white/10 focus:border-emerald-500/50'
                  )}
                />
                {pasteError && (
                  <p className="text-[11px] text-red-400 mt-1.5">
                    That doesn&apos;t look like a valid Rival Check code. Ask your friend to copy theirs again.
                  </p>
                )}
                <button
                  onClick={handleCompare}
                  disabled={!pasteValue.trim()}
                  className="mt-3 w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-emerald-500/15 text-emerald-300 text-sm font-semibold hover:bg-emerald-500/20 disabled:opacity-30 disabled:hover:bg-emerald-500/15 transition-colors"
                >
                  <ClipboardPaste size={14} /> Compare
                </button>
              </div>
            </div>
          ) : (
            /* ── Comparison view ── */
            <div className="p-4 space-y-5 pb-8">
              {/* Names row */}
              <div className="grid grid-cols-[1fr_32px_1fr] items-center gap-2">
                <div className="text-center">
                  <p className="text-xs font-semibold text-white/90 truncate">{mySnapshot.name}</p>
                  <p className="text-[10px] text-white/30">You</p>
                </div>
                <div className="flex items-center justify-center">
                  <ArrowLeftRight size={14} className="text-white/20" />
                </div>
                <div className="text-center">
                  <p className="text-xs font-semibold text-white/90 truncate">{rival.name}</p>
                  <p className="text-[10px] text-white/30">Rival</p>
                </div>
              </div>

              {/* Winner banner */}
              {contested > 0 && (
                <div className={clsx(
                  'flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold',
                  overall === 'me' ? 'bg-emerald-500/15 text-emerald-300' :
                  overall === 'rival' ? 'bg-blue-500/15 text-blue-300' :
                  'bg-white/5 text-white/40'
                )}>
                  {overall === 'tie' ? (
                    <>🤝 Dead heat</>
                  ) : (
                    <>
                      <Trophy size={14} />
                      {overall === 'me' ? mySnapshot.name : rival.name} wins {Math.max(winsMe, winsRival)}/{contested} categories
                    </>
                  )}
                </div>
              )}

              {/* Stats table */}
              <div className="rounded-xl overflow-hidden border border-white/5">
                <div className="grid grid-cols-[auto_1fr_1fr] bg-white/[0.025]">
                  <div className="w-28 px-3 py-2 text-[9px] text-white/25 font-bold uppercase tracking-wider">Stat</div>
                  <div className="px-3 py-2 text-[9px] text-emerald-400/60 font-bold uppercase tracking-wider text-right truncate">
                    {mySnapshot.name}
                  </div>
                  <div className="px-3 py-2 text-[9px] text-blue-400/60 font-bold uppercase tracking-wider text-right truncate">
                    {rival.name}
                  </div>
                </div>

                {stats.map((row, i) => {
                  const winner = rowWinner(row);
                  return (
                    <div
                      key={row.label}
                      className={clsx('grid grid-cols-[auto_1fr_1fr] items-center', i > 0 && 'border-t border-white/5')}
                    >
                      <div className="w-28 px-3 py-2.5 text-xs text-white/35">{row.label}</div>
                      <div className={clsx(
                        'px-3 py-2.5 text-right text-xs font-semibold tabular-nums',
                        winner === 'me' ? 'text-emerald-300' : winner === 'tie' ? 'text-white/45' : 'text-white/25'
                      )}>
                        {row.meDisplay}
                        {winner === 'me' && <span className="ml-1 text-[9px] opacity-60">✓</span>}
                      </div>
                      <div className={clsx(
                        'px-3 py-2.5 text-right text-xs font-semibold tabular-nums',
                        winner === 'rival' ? 'text-blue-300' : winner === 'tie' ? 'text-white/45' : 'text-white/25'
                      )}>
                        {row.rivalDisplay}
                        {winner === 'rival' && <span className="ml-1 text-[9px] opacity-60">✓</span>}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Highlights — not head-to-head, just fun context */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-xl bg-white/[0.025] border border-white/5">
                  <p className="text-[9px] text-white/25 uppercase tracking-wider mb-1.5">{mySnapshot.name}&apos;s top game</p>
                  <p className="text-xs font-bold text-emerald-300 leading-tight truncate">
                    {mySnapshot.topGame ? mySnapshot.topGame.name : '—'}
                  </p>
                  {mySnapshot.topGame && (
                    <p className="text-[9px] text-white/25 mt-1">{formatHours(mySnapshot.topGame.hours)}</p>
                  )}
                </div>
                <div className="p-3 rounded-xl bg-white/[0.025] border border-white/5">
                  <p className="text-[9px] text-white/25 uppercase tracking-wider mb-1.5">{rival.name}&apos;s top game</p>
                  <p className="text-xs font-bold text-blue-300 leading-tight truncate">
                    {rival.topGame ? rival.topGame.name : '—'}
                  </p>
                  {rival.topGame && (
                    <p className="text-[9px] text-white/25 mt-1">{formatHours(rival.topGame.hours)}</p>
                  )}
                </div>
              </div>

              <button
                onClick={() => { setRival(null); setPasteValue(''); }}
                className="w-full py-2.5 rounded-lg bg-white/5 text-white/50 text-xs font-medium hover:bg-white/10 transition-colors"
              >
                Check a different rival
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
