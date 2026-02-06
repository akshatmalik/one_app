'use client';

import { useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Cell, LineChart, Line, ScatterChart, Scatter, ZAxis, AreaChart, Area,
} from 'recharts';
import {
  Brain, Calendar, Skull, Grid3X3, TrendingDown,
} from 'lucide-react';
import { Game } from '../lib/types';
import {
  getGenreSatisfactionMatrix,
  getPlayPatterns,
  getAbandonmentAutopsy,
  GenreSatisfactionPoint,
} from '../lib/calculations';
import clsx from 'clsx';

interface AnalyticsPanelProps {
  games: Game[];
}

const QUADRANT_COLORS: Record<GenreSatisfactionPoint['quadrant'], string> = {
  'Love & Play': '#10b981',
  'Love but Skip': '#f59e0b',
  'Guilty Pleasure': '#8b5cf6',
  'Why Buy These?': '#ef4444',
};

export function AnalyticsPanel({ games }: AnalyticsPanelProps) {
  const genreMatrix = useMemo(() => getGenreSatisfactionMatrix(games), [games]);
  const patterns = useMemo(() => getPlayPatterns(games), [games]);
  const autopsy = useMemo(() => getAbandonmentAutopsy(games), [games]);

  const ownedGames = games.filter(g => g.status !== 'Wishlist');
  if (ownedGames.length === 0) return null;

  const hasPlayLogs = games.some(g => g.playLogs && g.playLogs.length > 0);

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-medium text-white/50 flex items-center gap-2">
        <Brain size={14} className="text-cyan-400" />
        Advanced Analytics
      </h3>

      {/* Genre Satisfaction Matrix */}
      {genreMatrix.length >= 3 && (
        <div className="p-4 bg-gradient-to-br from-indigo-500/10 to-purple-500/10 border border-indigo-500/20 rounded-xl">
          <h4 className="text-sm font-medium text-white/70 flex items-center gap-2 mb-3">
            <Grid3X3 size={14} className="text-indigo-400" />
            Genre Satisfaction Matrix
          </h4>

          <div className="h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 10, right: 10, bottom: 20, left: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis
                  type="number"
                  dataKey="avgHours"
                  name="Avg Hours"
                  tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 10 }}
                  label={{ value: 'Avg Hours', position: 'bottom', fill: 'rgba(255,255,255,0.3)', fontSize: 10 }}
                />
                <YAxis
                  type="number"
                  dataKey="avgRating"
                  name="Avg Rating"
                  domain={[0, 10]}
                  tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 10 }}
                  label={{ value: 'Avg Rating', angle: -90, position: 'insideLeft', fill: 'rgba(255,255,255,0.3)', fontSize: 10 }}
                />
                <ZAxis type="number" dataKey="count" range={[60, 300]} />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload?.[0]) {
                      const data = payload[0].payload as GenreSatisfactionPoint;
                      return (
                        <div className="bg-[#1a1a24] border border-white/10 rounded-lg px-3 py-2 text-xs">
                          <p className="text-white/90 font-medium">{data.genre}</p>
                          <p className="text-white/60">Rating: {data.avgRating}/10 | Hours: {data.avgHours}h</p>
                          <p className="text-white/60">{data.count} games | ${data.totalSpent} spent</p>
                          <p className="mt-1" style={{ color: QUADRANT_COLORS[data.quadrant] }}>{data.quadrant}</p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Scatter data={genreMatrix}>
                  {genreMatrix.map((entry, i) => (
                    <Cell key={i} fill={QUADRANT_COLORS[entry.quadrant]} fillOpacity={0.8} />
                  ))}
                </Scatter>
              </ScatterChart>
            </ResponsiveContainer>
          </div>

          {/* Quadrant legend */}
          <div className="flex flex-wrap gap-3 mt-3 justify-center">
            {Object.entries(QUADRANT_COLORS).map(([label, color]) => {
              const count = genreMatrix.filter(g => g.quadrant === label).length;
              if (count === 0) return null;
              return (
                <div key={label} className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
                  <span className="text-[10px] text-white/40">{label} ({count})</span>
                </div>
              );
            })}
          </div>

          {/* Genre insights */}
          {genreMatrix.length > 0 && (
            <div className="mt-3 space-y-1">
              {(() => {
                const lovePlay = genreMatrix.filter(g => g.quadrant === 'Love & Play').sort((a, b) => b.avgRating - a.avgRating);
                const whyBuy = genreMatrix.filter(g => g.quadrant === 'Why Buy These?');
                return (
                  <>
                    {lovePlay.length > 0 && (
                      <div className="text-[11px] text-white/40">
                        <span className="text-emerald-400">Sweet spot:</span> {lovePlay.map(g => g.genre).join(', ')}
                      </div>
                    )}
                    {whyBuy.length > 0 && (
                      <div className="text-[11px] text-white/40">
                        <span className="text-red-400">Reconsider:</span> {whyBuy.map(g => g.genre).join(', ')}
                      </div>
                    )}
                  </>
                );
              })()}
            </div>
          )}
        </div>
      )}

      {/* Day-of-Week & Seasonal Patterns */}
      {hasPlayLogs && patterns.dayOfWeek.some(d => d.sessions > 0) && (
        <div className="p-4 bg-gradient-to-br from-cyan-500/10 to-teal-500/10 border border-cyan-500/20 rounded-xl">
          <h4 className="text-sm font-medium text-white/70 flex items-center gap-2 mb-3">
            <Calendar size={14} className="text-cyan-400" />
            Play Patterns
          </h4>

          {/* Pattern label */}
          <div className="text-center mb-3">
            <div className="text-lg font-bold text-cyan-400">{patterns.patternLabel}</div>
            <div className="text-xs text-white/40">
              {patterns.weekendWarriorScore}% of sessions on weekends
              {patterns.busiestDay !== 'N/A' && ` | Peak day: ${patterns.busiestDay}`}
            </div>
          </div>

          {/* Day of week chart */}
          <div className="h-[160px] mb-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={patterns.dayOfWeek}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis
                  dataKey="day"
                  tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 10 }}
                />
                <YAxis
                  tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 9 }}
                  tickFormatter={v => `${v}h`}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload?.[0]) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-[#1a1a24] border border-white/10 rounded-lg px-3 py-2 text-xs">
                          <p className="text-white/90 font-medium">{data.day}</p>
                          <p className="text-white/60">{data.sessions} sessions | {data.totalHours}h total</p>
                          <p className="text-white/60">Avg: {data.avgSessionLength}h per session</p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar dataKey="totalHours" radius={[4, 4, 0, 0]}>
                  {patterns.dayOfWeek.map((entry, i) => (
                    <Cell
                      key={i}
                      fill={entry.dayIndex === 0 || entry.dayIndex === 6 ? '#06b6d4' : '#3b82f6'}
                      fillOpacity={entry.totalHours > 0 ? 0.8 : 0.2}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Weekday vs Weekend split */}
          <div className="grid grid-cols-2 gap-2 mb-4">
            <div className="p-2 bg-white/5 rounded-lg text-center">
              <div className="text-sm font-bold text-blue-400">{patterns.weekdayVsWeekendHours.weekday}h</div>
              <div className="text-[10px] text-white/40">weekdays</div>
            </div>
            <div className="p-2 bg-white/5 rounded-lg text-center">
              <div className="text-sm font-bold text-cyan-400">{patterns.weekdayVsWeekendHours.weekend}h</div>
              <div className="text-[10px] text-white/40">weekends</div>
            </div>
          </div>

          {/* Seasonal chart */}
          {patterns.seasonal.some(s => s.totalHours > 0) && (
            <>
              <div className="text-[10px] text-white/40 uppercase tracking-wider mb-2">Seasonal Trends</div>
              <div className="h-[140px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={patterns.seasonal}>
                    <defs>
                      <linearGradient id="seasonalGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="month" tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 9 }} />
                    <YAxis tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 9 }} tickFormatter={v => `${v}h`} />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (active && payload?.[0]) {
                          const data = payload[0].payload;
                          return (
                            <div className="bg-[#1a1a24] border border-white/10 rounded-lg px-3 py-2 text-xs">
                              <p className="text-white/90 font-medium">{data.month}</p>
                              <p className="text-white/60">{data.totalHours}h played | {data.sessions} sessions</p>
                              {data.gamesPurchased > 0 && <p className="text-emerald-400">{data.gamesPurchased} purchased</p>}
                              {data.gamesStarted > 0 && <p className="text-blue-400">{data.gamesStarted} started</p>}
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Area type="monotone" dataKey="totalHours" stroke="#06b6d4" strokeWidth={2} fill="url(#seasonalGrad)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
              {patterns.busiestMonth !== 'N/A' && (
                <div className="mt-2 text-center text-xs text-white/40">
                  Peak gaming month: <span className="text-cyan-400">{patterns.busiestMonth}</span>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Abandonment Autopsy */}
      {autopsy.totalAbandoned > 0 && (
        <div className="p-4 bg-gradient-to-br from-red-500/10 to-pink-500/10 border border-red-500/20 rounded-xl">
          <h4 className="text-sm font-medium text-white/70 flex items-center gap-2 mb-3">
            <Skull size={14} className="text-red-400" />
            Abandonment Autopsy
          </h4>

          {/* Summary stats */}
          <div className="grid grid-cols-3 gap-2 mb-3">
            <div className="p-2 bg-white/5 rounded-lg text-center">
              <div className="text-lg font-bold text-red-400">{autopsy.totalAbandoned}</div>
              <div className="text-[10px] text-white/40">abandoned</div>
            </div>
            <div className="p-2 bg-white/5 rounded-lg text-center">
              <div className="text-lg font-bold text-orange-400">${autopsy.totalWasted}</div>
              <div className="text-[10px] text-white/40">wasted</div>
            </div>
            <div className="p-2 bg-white/5 rounded-lg text-center">
              <div className="text-lg font-bold text-yellow-400">{autopsy.avgHoursBeforeAbandon}h</div>
              <div className="text-[10px] text-white/40">avg before quit</div>
            </div>
          </div>

          {/* Abandonment reasons breakdown */}
          <div className="space-y-2 mb-3">
            {autopsy.reasons.map(reason => (
              <div key={reason.label} className="flex items-center gap-2">
                <div className="w-20 text-xs text-white/60">{reason.label}</div>
                <div className="flex-1 h-4 bg-white/5 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-red-500/60 rounded-full"
                    style={{ width: `${reason.percentage}%` }}
                  />
                </div>
                <div className="text-xs text-white/40 w-14 text-right">
                  {reason.count} ({reason.percentage}%)
                </div>
              </div>
            ))}
          </div>

          {/* Survival curve */}
          {autopsy.survivalCurve.length > 2 && (
            <div className="mb-3">
              <div className="text-[10px] text-white/40 uppercase tracking-wider mb-2">Survival Curve</div>
              <div className="h-[120px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={autopsy.survivalCurve}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="hours" tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 9 }} />
                    <YAxis
                      tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 9 }}
                      tickFormatter={v => `${v}%`}
                      domain={[0, 100]}
                    />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (active && payload?.[0]) {
                          return (
                            <div className="bg-[#1a1a24] border border-white/10 rounded-lg px-3 py-2 text-xs">
                              <p className="text-white/60">{payload[0].payload.surviving}% still playing at {payload[0].payload.hours}</p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="surviving"
                      stroke="#ef4444"
                      strokeWidth={2}
                      dot={{ r: 3, fill: '#ef4444' }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              {autopsy.dropOffPoint && (
                <div className="text-center text-xs text-white/40 mt-1">
                  {autopsy.dropOffPoint}
                </div>
              )}
            </div>
          )}

          {/* Risk genres */}
          {autopsy.riskGenres.length > 0 && (
            <div className="mt-3 pt-3 border-t border-white/10">
              <div className="text-[10px] text-white/40 uppercase tracking-wider mb-2">High-Risk Genres</div>
              <div className="flex flex-wrap gap-2">
                {autopsy.riskGenres.slice(0, 5).map(g => (
                  <div key={g.genre} className="px-2 py-1 bg-red-500/10 rounded-full text-xs text-red-400">
                    {g.genre} ({g.abandonRate}%)
                  </div>
                ))}
              </div>
              {autopsy.riskPriceRange && (
                <div className="mt-2 text-xs text-white/40">
                  Highest abandon rate in <span className="text-red-400">{autopsy.riskPriceRange}</span> price range
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
