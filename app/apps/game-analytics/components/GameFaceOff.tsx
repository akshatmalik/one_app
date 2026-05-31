'use client';

import { useState, useMemo } from 'react';
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ResponsiveContainer, Tooltip, Legend,
} from 'recharts';
import { X, Swords, Trophy, Minus, ArrowUp, ArrowDown, Search, ChevronDown } from 'lucide-react';
import { Game } from '../lib/types';
import {
  getFaceOffData,
  getTotalHours,
  getCardRarity,
  getRelationshipStatus,
  FaceOffData,
  FaceOffStat,
} from '../lib/calculations';
import clsx from 'clsx';

interface GameFaceOffProps {
  games: Game[];
  onClose: () => void;
}

// Simple game picker dropdown with search
function GamePicker({
  games,
  selected,
  onSelect,
  label,
  accentColor,
}: {
  games: Game[];
  selected: Game | null;
  onSelect: (g: Game) => void;
  label: string;
  accentColor: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? games.filter(g => g.name.toLowerCase().includes(q) || (g.genre ?? '').toLowerCase().includes(q)) : games;
  }, [games, query]);

  return (
    <div className="relative flex-1">
      <button
        onClick={() => setOpen(o => !o)}
        className={clsx(
          'w-full flex items-center gap-3 p-3 rounded-xl border transition-all text-left',
          selected
            ? 'bg-white/[0.04] border-white/15'
            : 'bg-white/[0.02] border-dashed border-white/10 hover:border-white/20',
        )}
        style={selected ? { borderColor: `${accentColor}40` } : {}}
      >
        {selected ? (
          <>
            {selected.thumbnail ? (
              <img src={selected.thumbnail} alt={selected.name}
                className="w-10 h-10 rounded-lg object-cover shrink-0" />
            ) : (
              <div className="w-10 h-10 rounded-lg bg-white/5 shrink-0 flex items-center justify-center text-xl">
                🎮
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">{selected.name}</p>
              <p className="text-xs text-white/40">{selected.genre ?? selected.status}</p>
            </div>
          </>
        ) : (
          <span className="text-sm text-white/30">{label}</span>
        )}
        <ChevronDown size={14} className={clsx('text-white/30 shrink-0 transition-transform', open && 'rotate-180')} />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => { setOpen(false); setQuery(''); }} />
          <div className="absolute left-0 top-full mt-2 w-full z-50 bg-[#13131f] border border-white/10 rounded-xl shadow-2xl overflow-hidden">
            <div className="p-2 border-b border-white/5">
              <div className="relative">
                <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-white/30" />
                <input
                  autoFocus
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  placeholder="Search…"
                  className="w-full pl-7 pr-3 py-1.5 bg-white/5 rounded-lg text-xs text-white placeholder:text-white/25 focus:outline-none"
                />
              </div>
            </div>
            <div className="max-h-56 overflow-y-auto">
              {filtered.length === 0 ? (
                <p className="text-center text-xs text-white/30 py-4">No games found</p>
              ) : filtered.map(g => (
                <button
                  key={g.id}
                  onClick={() => { onSelect(g); setOpen(false); setQuery(''); }}
                  className={clsx(
                    'w-full flex items-center gap-2.5 px-3 py-2.5 text-left hover:bg-white/5 transition-colors',
                    selected?.id === g.id && 'bg-white/5',
                  )}
                >
                  {g.thumbnail ? (
                    <img src={g.thumbnail} alt={g.name} className="w-8 h-8 rounded-md object-cover shrink-0" />
                  ) : (
                    <div className="w-8 h-8 rounded-md bg-white/5 shrink-0 flex items-center justify-center text-base">🎮</div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-white truncate">{g.name}</p>
                    <p className="text-[10px] text-white/35">{g.genre ?? g.status}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function WinnerIndicator({ stat, side }: { stat: FaceOffStat; side: 1 | 2 }) {
  if (stat.winner === 'tie') return <Minus size={11} className="text-white/25" />;
  const won = stat.winner === side;
  return won
    ? <ArrowUp size={11} className="text-emerald-400" />
    : <ArrowDown size={11} className="text-red-400/60" />;
}

const RARITY_BORDER: Record<string, string> = {
  legendary: '#fbbf24',
  epic: '#a855f7',
  rare: '#3b82f6',
  uncommon: '#22c55e',
  common: '#ffffff30',
};

// Badge for rarity
function RarityBadge({ game }: { game: Game }) {
  const rarity = getCardRarity(game);
  const color = RARITY_BORDER[rarity.tier];
  return (
    <span
      className="text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider"
      style={{ color, backgroundColor: `${color}18`, border: `1px solid ${color}40` }}
    >
      {rarity.label}
    </span>
  );
}

// Mini sparkline showing recent 30-day sessions as dots
function RecentActivity({ game, accentColor }: { game: Game; accentColor: string }) {
  const now = new Date();
  // Build a 30-day grid
  const days = 30;
  const cells: { day: number; hours: number }[] = Array.from({ length: days }, (_, i) => ({ day: i, hours: 0 }));

  for (const log of game.playLogs ?? []) {
    const logDate = new Date(log.date + 'T12:00:00');
    const diff = Math.floor((now.getTime() - logDate.getTime()) / 86400000);
    if (diff >= 0 && diff < days) {
      cells[days - 1 - diff].hours += log.hours;
    }
  }

  const maxH = Math.max(...cells.map(c => c.hours), 0.1);

  return (
    <div className="flex items-end gap-0.5 h-8">
      {cells.map((c, i) => (
        <div
          key={i}
          className="flex-1 rounded-sm min-h-[2px] transition-all"
          style={{
            height: c.hours > 0 ? `${Math.max(20, (c.hours / maxH) * 100)}%` : '4px',
            backgroundColor: c.hours > 0 ? accentColor : 'rgba(255,255,255,0.06)',
            opacity: c.hours > 0 ? 0.85 : 1,
          }}
          title={c.hours > 0 ? `${c.hours.toFixed(1)}h` : undefined}
        />
      ))}
    </div>
  );
}

const GAME1_COLOR = '#8b5cf6'; // purple
const GAME2_COLOR = '#f59e0b'; // amber

export function GameFaceOff({ games, onClose }: GameFaceOffProps) {
  const [game1, setGame1] = useState<Game | null>(null);
  const [game2, setGame2] = useState<Game | null>(null);

  const eligibleGames = useMemo(
    () => games.filter(g => g.status !== 'Wishlist').sort((a, b) => a.name.localeCompare(b.name)),
    [games],
  );

  const faceOff: FaceOffData | null = useMemo(() => {
    if (!game1 || !game2 || game1.id === game2.id) return null;
    return getFaceOffData(game1, game2);
  }, [game1, game2]);

  const rel1 = useMemo(() => game1 ? getRelationshipStatus(game1, games) : null, [game1, games]);
  const rel2 = useMemo(() => game2 ? getRelationshipStatus(game2, games) : null, [game2, games]);

  const h1 = game1 ? getTotalHours(game1) : 0;
  const h2 = game2 ? getTotalHours(game2) : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm p-0 sm:p-4">
      <div
        className="w-full sm:max-w-2xl bg-[#0e0e18] border border-white/10 rounded-t-2xl sm:rounded-2xl shadow-2xl flex flex-col"
        style={{ maxHeight: '95dvh' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-white/5 shrink-0">
          <div className="flex items-center gap-2">
            <Swords size={18} className="text-purple-400" />
            <span className="text-base font-bold text-white">Game Face-Off</span>
          </div>
          <button onClick={onClose} className="p-1.5 text-white/30 hover:text-white/70 transition-colors">
            <X size={16} />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="overflow-y-auto flex-1 p-5 space-y-5">

          {/* Game Selectors */}
          <div className="flex gap-3">
            <GamePicker
              games={eligibleGames.filter(g => g.id !== game2?.id)}
              selected={game1}
              onSelect={setGame1}
              label="Pick game 1…"
              accentColor={GAME1_COLOR}
            />
            <div className="flex items-center text-white/20 font-bold text-sm">vs</div>
            <GamePicker
              games={eligibleGames.filter(g => g.id !== game1?.id)}
              selected={game2}
              onSelect={setGame2}
              label="Pick game 2…"
              accentColor={GAME2_COLOR}
            />
          </div>

          {/* Prompt when not ready */}
          {(!game1 || !game2 || game1.id === game2.id) && (
            <div className="text-center py-10 text-white/30 text-sm">
              {!game1 && !game2
                ? 'Select two games from your library to compare them head-to-head.'
                : !game2
                ? 'Now pick a second game to face off against.'
                : 'Pick two different games.'}
            </div>
          )}

          {/* Main comparison */}
          {faceOff && game1 && game2 && (
            <>
              {/* Relationship status + rarity badges */}
              <div className="grid grid-cols-2 gap-3">
                {[
                  { game: game1, rel: rel1, color: GAME1_COLOR, wins: faceOff.game1Wins, side: 1 as const },
                  { game: game2, rel: rel2, color: GAME2_COLOR, wins: faceOff.game2Wins, side: 2 as const },
                ].map(({ game, rel, color, wins, side }) => (
                  <div
                    key={game.id}
                    className={clsx(
                      'rounded-xl p-3 border transition-all',
                      faceOff.overallWinner === side
                        ? 'border-opacity-40'
                        : 'border-white/5 bg-white/[0.02]',
                    )}
                    style={faceOff.overallWinner === side ? {
                      borderColor: `${color}50`,
                      backgroundColor: `${color}08`,
                    } : {}}
                  >
                    <div className="flex items-start gap-2 mb-2">
                      {game.thumbnail ? (
                        <img src={game.thumbnail} alt={game.name}
                          className="w-12 h-12 rounded-lg object-cover shrink-0" />
                      ) : (
                        <div className="w-12 h-12 rounded-lg bg-white/5 shrink-0 flex items-center justify-center text-2xl">🎮</div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-white truncate leading-tight">{game.name}</p>
                        <p className="text-[10px] text-white/35 mt-0.5">{game.genre ?? game.status}</p>
                        <div className="mt-1.5 flex flex-wrap gap-1">
                          <RarityBadge game={game} />
                          {faceOff.overallWinner === side && (
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider text-yellow-400 bg-yellow-400/10 border border-yellow-400/30 flex items-center gap-0.5">
                              <Trophy size={8} /> Winner
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    {rel && (
                      <div
                        className="text-[10px] font-medium px-1.5 py-0.5 rounded-md inline-block"
                        style={{ color: rel.color, backgroundColor: `${rel.color}18` }}
                      >
                        {rel.label}
                      </div>
                    )}
                    <div className="text-[10px] text-white/30 mt-1.5">
                      {getTotalHours(game) > 0
                        ? `${getTotalHours(game).toFixed(1)}h · ${game.playLogs?.length ?? 0} sessions`
                        : 'Not played yet'}
                    </div>
                    <div className="mt-2">
                      <p className="text-[9px] text-white/25 mb-1">Last 30 days</p>
                      <RecentActivity game={game} accentColor={color} />
                    </div>
                  </div>
                ))}
              </div>

              {/* Radar chart */}
              <div className="bg-white/[0.02] border border-white/5 rounded-xl p-4">
                <p className="text-xs font-medium text-white/50 mb-3">Radar Comparison</p>
                <div className="h-[220px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart data={faceOff.radarPoints} cx="50%" cy="50%" outerRadius="72%">
                      <PolarGrid stroke="rgba(255,255,255,0.06)" />
                      <PolarAngleAxis
                        dataKey="axis"
                        tick={{ fill: 'rgba(255,255,255,0.45)', fontSize: 10, fontWeight: 500 }}
                      />
                      <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
                      <Radar
                        name={game1.name}
                        dataKey="game1"
                        stroke={GAME1_COLOR}
                        fill={GAME1_COLOR}
                        fillOpacity={0.18}
                        strokeWidth={2}
                      />
                      <Radar
                        name={game2.name}
                        dataKey="game2"
                        stroke={GAME2_COLOR}
                        fill={GAME2_COLOR}
                        fillOpacity={0.18}
                        strokeWidth={2}
                      />
                      <Tooltip
                        content={({ active, payload }) => {
                          if (!active || !payload?.length) return null;
                          const axis = (payload[0]?.payload as { axis: string })?.axis ?? '';
                          return (
                            <div className="bg-[#1a1a24] border border-white/10 rounded-lg px-3 py-2 text-xs shadow-lg">
                              <p className="text-white/60 font-medium mb-1">{axis}</p>
                              <p style={{ color: GAME1_COLOR }}>{game1.name}: {payload.find(p => p.dataKey === 'game1')?.value ?? 0}</p>
                              <p style={{ color: GAME2_COLOR }}>{game2.name}: {payload.find(p => p.dataKey === 'game2')?.value ?? 0}</p>
                            </div>
                          );
                        }}
                      />
                      <Legend
                        iconType="circle"
                        iconSize={8}
                        formatter={(value) => (
                          <span className="text-[11px] text-white/60">{value}</span>
                        )}
                      />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Stat table */}
              <div className="bg-white/[0.02] border border-white/5 rounded-xl overflow-hidden">
                <p className="text-xs font-medium text-white/50 px-4 py-3 border-b border-white/5">Stat-by-Stat</p>
                <div className="divide-y divide-white/[0.04]">
                  {faceOff.stats.map((stat) => (
                    <div key={stat.label} className="grid grid-cols-[1fr_auto_1fr] items-center px-4 py-2.5">
                      {/* Game 1 value */}
                      <div className={clsx(
                        'flex items-center gap-1.5 text-xs',
                        stat.winner === 1 ? 'font-semibold' : 'text-white/50',
                      )}>
                        <WinnerIndicator stat={stat} side={1} />
                        <span style={stat.winner === 1 ? { color: GAME1_COLOR } : {}}>{stat.value1}</span>
                      </div>

                      {/* Centre label */}
                      <div className="text-center px-3">
                        <span className="text-[9px] text-white/30 uppercase tracking-wider font-medium">
                          {stat.icon} {stat.label}
                        </span>
                      </div>

                      {/* Game 2 value */}
                      <div className={clsx(
                        'flex items-center justify-end gap-1.5 text-xs',
                        stat.winner === 2 ? 'font-semibold' : 'text-white/50',
                      )}>
                        <span style={stat.winner === 2 ? { color: GAME2_COLOR } : {}}>{stat.value2}</span>
                        <WinnerIndicator stat={stat} side={2} />
                      </div>
                    </div>
                  ))}
                </div>

                {/* Win count footer */}
                <div className="grid grid-cols-2 border-t border-white/5">
                  <div className="flex items-center justify-center gap-1.5 py-3"
                    style={{ backgroundColor: `${GAME1_COLOR}08` }}>
                    <span className="text-2xl font-black" style={{ color: GAME1_COLOR }}>{faceOff.game1Wins}</span>
                    <span className="text-[10px] text-white/30">wins</span>
                  </div>
                  <div className="flex items-center justify-center gap-1.5 py-3"
                    style={{ backgroundColor: `${GAME2_COLOR}08` }}>
                    <span className="text-[10px] text-white/30">wins</span>
                    <span className="text-2xl font-black" style={{ color: GAME2_COLOR }}>{faceOff.game2Wins}</span>
                  </div>
                </div>
              </div>

              {/* Verdict */}
              <div
                className="rounded-xl p-4 border"
                style={{
                  borderColor: faceOff.overallWinner === 'tie'
                    ? 'rgba(255,255,255,0.08)'
                    : `${faceOff.overallWinner === 1 ? GAME1_COLOR : GAME2_COLOR}35`,
                  backgroundColor: faceOff.overallWinner === 'tie'
                    ? 'rgba(255,255,255,0.02)'
                    : `${faceOff.overallWinner === 1 ? GAME1_COLOR : GAME2_COLOR}0a`,
                }}
              >
                <div className="flex items-center gap-2 mb-1.5">
                  {faceOff.overallWinner === 'tie' ? (
                    <Minus size={14} className="text-white/40" />
                  ) : (
                    <Trophy size={14} style={{ color: faceOff.overallWinner === 1 ? GAME1_COLOR : GAME2_COLOR }} />
                  )}
                  <span className="text-xs font-semibold text-white/70">Verdict</span>
                </div>
                <p className="text-sm text-white/80 leading-relaxed">{faceOff.verdictLine}</p>

                {/* Recent activity note */}
                {(faceOff.recentSessions1 > 0 || faceOff.recentSessions2 > 0) && (
                  <p className="text-[11px] text-white/35 mt-2 leading-relaxed">
                    Last 30 days:
                    {' '}<span style={{ color: GAME1_COLOR }}>{game1.name}</span>{' '}
                    {faceOff.recentSessions1 > 0
                      ? `${faceOff.recentSessions1} session${faceOff.recentSessions1 !== 1 ? 's' : ''} (${faceOff.recentHours1.toFixed(1)}h)`
                      : 'no sessions'}
                    {' '}vs{' '}
                    <span style={{ color: GAME2_COLOR }}>{game2.name}</span>{' '}
                    {faceOff.recentSessions2 > 0
                      ? `${faceOff.recentSessions2} session${faceOff.recentSessions2 !== 1 ? 's' : ''} (${faceOff.recentHours2.toFixed(1)}h)`
                      : 'no sessions'}
                    .
                  </p>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
