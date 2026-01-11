'use client';

import { Gamepad2, Clock, TrendingUp, TrendingDown, Minus, Trophy, Zap, Calendar, Target, Flame, Award, Star, DollarSign, Film, Book, Tv } from 'lucide-react';
import { WeekInReviewData } from '../lib/calculations';
import { DailyActivityChart } from './DailyActivityChart';
import { GameBreakdownChart } from './GameBreakdownChart';
import clsx from 'clsx';

interface WeekInReviewProps {
  data: WeekInReviewData;
}

export function WeekInReview({ data }: WeekInReviewProps) {
  if (data.totalHours === 0) {
    return (
      <div className="p-8 bg-gradient-to-br from-purple-500/10 to-blue-500/10 rounded-2xl border border-purple-500/20 text-center">
        <Calendar size={48} className="mx-auto mb-4 text-white/20" />
        <h3 className="text-xl font-bold text-white mb-2">No Gaming Activity Last Week</h3>
        <p className="text-white/50 text-sm">{data.weekLabel}</p>
        <p className="text-white/30 text-sm mt-2">Start logging play sessions to see your Week in Review!</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Hero Header */}
      <div className="relative overflow-hidden p-8 bg-gradient-to-br from-purple-600/20 via-blue-600/20 to-cyan-600/20 rounded-2xl border border-purple-500/30">
        <div className="relative z-10 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 rounded-full mb-4">
            <Calendar size={16} className="text-purple-300" />
            <span className="text-sm font-medium text-purple-200">{data.weekLabel}</span>
          </div>
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-3">
            Your Week in Gaming
          </h2>
          <p className="text-2xl font-semibold text-purple-300">{data.weekVibe}</p>
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-[#1a1a24] via-transparent to-transparent opacity-50" />
      </div>

      {/* Core Stats - The Big 4 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          icon={<Gamepad2 size={24} />}
          label="Games Played"
          value={data.uniqueGames}
          gradient="from-purple-500/20 to-purple-600/20"
          iconColor="text-purple-400"
          valueColor="text-purple-400"
        />
        <StatCard
          icon={<Clock size={24} />}
          label="Total Hours"
          value={`${data.totalHours.toFixed(1)}h`}
          gradient="from-blue-500/20 to-blue-600/20"
          iconColor="text-blue-400"
          valueColor="text-blue-400"
        />
        <StatCard
          icon={<Target size={24} />}
          label="Sessions"
          value={data.totalSessions}
          subValue={`${(data.totalSessions / 7).toFixed(1)}/day avg`}
          gradient="from-cyan-500/20 to-cyan-600/20"
          iconColor="text-cyan-400"
          valueColor="text-cyan-400"
        />
        <StatCard
          icon={<Flame size={24} />}
          label="Day Streak"
          value={data.currentStreak}
          subValue={data.perfectWeek ? "Perfect Week!" : `${data.currentStreak} day${data.currentStreak !== 1 ? 's' : ''}`}
          gradient="from-orange-500/20 to-orange-600/20"
          iconColor="text-orange-400"
          valueColor="text-orange-400"
        />
      </div>

      {/* Daily Breakdown */}
      <Section title="Daily Activity" icon={<Calendar size={20} />}>
        <DailyActivityChart
          dailyData={data.dailyHours}
          busiestDay={data.busiestDay?.day || null}
        />

        {/* Daily Insights */}
        <div className="mt-4 flex flex-wrap gap-3">
          {data.busiestDay && (
            <InsightBadge
              icon={<Zap size={14} />}
              label={`Busiest: ${data.busiestDay.day}`}
              value={`${data.busiestDay.hours.toFixed(1)}h`}
              color="purple"
            />
          )}
          {data.restDays.length > 0 && (
            <InsightBadge
              label={`Rest days: ${data.restDays.join(', ')}`}
              color="gray"
            />
          )}
          {data.perfectWeek && (
            <InsightBadge
              icon={<Trophy size={14} />}
              label="Perfect Week!"
              value="Played all 7 days"
              color="emerald"
            />
          )}
        </div>
      </Section>

      {/* Games Breakdown */}
      <Section title="Games This Week" icon={<Gamepad2 size={20} />}>
        <GameBreakdownChart gamesPlayed={data.gamesPlayed} maxGamesToShow={5} />
      </Section>

      {/* Top Game Spotlight */}
      {data.topGame && (
        <div className="relative overflow-hidden rounded-2xl border border-purple-500/30">
          {/* Background */}
          {data.topGame.game.thumbnail && (
            <div
              className="absolute inset-0 opacity-10 bg-cover bg-center blur-xl scale-110"
              style={{ backgroundImage: `url(${data.topGame.game.thumbnail})` }}
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-br from-purple-900/80 via-blue-900/80 to-purple-900/80" />

          {/* Content */}
          <div className="relative z-10 p-8">
            <div className="flex items-start gap-6">
              {data.topGame.game.thumbnail ? (
                <img
                  src={data.topGame.game.thumbnail}
                  alt={data.topGame.game.name}
                  className="w-32 h-32 rounded-xl object-cover border-2 border-purple-400/30 shadow-2xl shrink-0"
                />
              ) : (
                <div className="w-32 h-32 rounded-xl bg-white/10 border-2 border-purple-400/30 shrink-0" />
              )}

              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <Trophy size={20} className="text-amber-400" />
                  <span className="text-sm font-medium text-amber-300 uppercase tracking-wide">
                    Your Obsession
                  </span>
                </div>
                <h3 className="text-3xl md:text-4xl font-bold text-white mb-3">
                  {data.topGame.game.name}
                </h3>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <div className="text-3xl font-bold text-purple-300">
                      {data.topGame.hours.toFixed(1)}h
                    </div>
                    <div className="text-sm text-white/50">Time Played</div>
                  </div>
                  <div>
                    <div className="text-3xl font-bold text-blue-300">
                      {data.topGame.percentage.toFixed(0)}%
                    </div>
                    <div className="text-sm text-white/50">Of Your Week</div>
                  </div>
                  <div>
                    <div className="text-3xl font-bold text-cyan-300">
                      {data.topGame.sessions}
                    </div>
                    <div className="text-sm text-white/50">Sessions</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Session Analytics */}
      <Section title="Session Insights" icon={<Clock size={20} />}>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <MiniStatCard
            label="Avg Length"
            value={`${data.avgSessionLength.toFixed(1)}h`}
            color="purple"
          />
          <MiniStatCard
            label="Marathons"
            value={data.marathonSessions}
            subValue="3h+ sessions"
            color="blue"
          />
          <MiniStatCard
            label="Power"
            value={data.powerSessions}
            subValue="1-3h sessions"
            color="cyan"
          />
          <MiniStatCard
            label="Quick"
            value={data.quickSessions}
            subValue="<1h sessions"
            color="emerald"
          />
        </div>

        {data.longestSession && (
          <div className="mt-4 p-4 bg-gradient-to-r from-purple-500/10 to-blue-500/10 rounded-xl border border-purple-500/20">
            <div className="flex items-center gap-3">
              {data.longestSession.game.thumbnail && (
                <img
                  src={data.longestSession.game.thumbnail}
                  alt={data.longestSession.game.name}
                  className="w-12 h-12 rounded-lg object-cover"
                />
              )}
              <div className="flex-1">
                <p className="text-sm text-white/50 mb-1">Longest Session</p>
                <p className="font-semibold text-white">{data.longestSession.game.name}</p>
                <p className="text-sm text-purple-400">
                  {data.longestSession.hours.toFixed(1)} hours on {data.longestSession.day}
                </p>
              </div>
              <Award size={32} className="text-amber-400 opacity-50" />
            </div>
          </div>
        )}

        {data.mostConsistentGame && (
          <div className="mt-3 p-4 bg-gradient-to-r from-blue-500/10 to-cyan-500/10 rounded-xl border border-blue-500/20">
            <div className="flex items-center gap-3">
              {data.mostConsistentGame.game.thumbnail && (
                <img
                  src={data.mostConsistentGame.game.thumbnail}
                  alt={data.mostConsistentGame.game.name}
                  className="w-12 h-12 rounded-lg object-cover"
                />
              )}
              <div className="flex-1">
                <p className="text-sm text-white/50 mb-1">Most Consistent</p>
                <p className="font-semibold text-white">{data.mostConsistentGame.game.name}</p>
                <p className="text-sm text-blue-400">
                  Played {data.mostConsistentGame.daysPlayed} out of 7 days
                </p>
              </div>
              <Target size={32} className="text-blue-400 opacity-50" />
            </div>
          </div>
        )}
      </Section>

      {/* Patterns & Habits */}
      <Section title="Gaming Patterns" icon={<TrendingUp size={20} />}>
        <div className="grid md:grid-cols-2 gap-4">
          {/* Weekday vs Weekend */}
          <div className="p-4 bg-white/[0.02] rounded-xl border border-white/5">
            <h4 className="text-sm font-medium text-white/60 mb-3">Weekday vs Weekend</h4>
            <div className="space-y-3">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-white/70">Weekdays</span>
                  <span className="text-sm font-semibold text-blue-400">
                    {data.weekdayHours.toFixed(1)}h ({data.weekdayPercentage.toFixed(0)}%)
                  </span>
                </div>
                <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-blue-500 to-blue-400 rounded-full"
                    style={{ width: `${data.weekdayPercentage}%` }}
                  />
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-white/70">Weekend</span>
                  <span className="text-sm font-semibold text-purple-400">
                    {data.weekendHours.toFixed(1)}h ({data.weekendPercentage.toFixed(0)}%)
                  </span>
                </div>
                <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-purple-500 to-purple-400 rounded-full"
                    style={{ width: `${data.weekendPercentage}%` }}
                  />
                </div>
              </div>
            </div>
            {data.weekendWarrior && (
              <p className="mt-3 text-xs text-purple-400">🎉 Weekend Warrior!</p>
            )}
            {data.weekdayGrind && (
              <p className="mt-3 text-xs text-blue-400">💼 Weekday Grind!</p>
            )}
          </div>

          {/* Gaming Style */}
          <div className="p-4 bg-white/[0.02] rounded-xl border border-white/5">
            <h4 className="text-sm font-medium text-white/60 mb-3">Gaming Style</h4>
            <div className="text-center py-4">
              <div className="text-4xl mb-2">
                {data.gamingStyle === 'Monogamous' && '🎯'}
                {data.gamingStyle === 'Dabbler' && '🎮'}
                {data.gamingStyle === 'Variety Seeker' && '🌈'}
                {data.gamingStyle === 'Juggler' && '🤹'}
              </div>
              <p className="text-lg font-semibold text-white mb-1">{data.gamingStyle}</p>
              <p className="text-sm text-white/50">
                {data.gamingStyle === 'Monogamous' && 'All-in on one game'}
                {data.gamingStyle === 'Dabbler' && 'Focused on a few favorites'}
                {data.gamingStyle === 'Variety Seeker' && 'Enjoying the variety'}
                {data.gamingStyle === 'Juggler' && 'So many games!'}
              </p>
              <div className="mt-3 pt-3 border-t border-white/5">
                <p className="text-xs text-white/40">Focus Score</p>
                <p className="text-2xl font-bold text-purple-400">{data.focusScore}%</p>
              </div>
            </div>
          </div>
        </div>

        {/* Genre */}
        {data.favoriteGenre && (
          <div className="mt-4 p-4 bg-gradient-to-r from-emerald-500/10 to-cyan-500/10 rounded-xl border border-emerald-500/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-white/50 mb-1">Favorite Genre This Week</p>
                <p className="text-xl font-bold text-emerald-400">{data.favoriteGenre.genre}</p>
                <p className="text-sm text-white/50 mt-1">
                  {data.favoriteGenre.hours.toFixed(1)}h ({data.favoriteGenre.percentage.toFixed(0)}% of week)
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm text-white/40">Genre Diversity</p>
                <p className="text-2xl font-bold text-cyan-400">{data.genreDiversityScore}</p>
                <p className="text-xs text-white/30">
                  {data.genreDiversityScore === 1 ? 'genre' : 'genres'}
                </p>
              </div>
            </div>
          </div>
        )}
      </Section>

      {/* Achievements & Milestones */}
      {(data.completedGames.length > 0 || data.newGamesStarted.length > 0 || data.milestonesReached.length > 0) && (
        <Section title="Achievements This Week" icon={<Trophy size={20} />}>
          <div className="space-y-3">
            {data.completedGames.length > 0 && (
              <AchievementCard
                icon="✅"
                title="Games Completed"
                count={data.completedGames.length}
                items={data.completedGames.map(g => g.name)}
                color="emerald"
              />
            )}
            {data.newGamesStarted.length > 0 && (
              <AchievementCard
                icon="🆕"
                title="New Games Started"
                count={data.newGamesStarted.length}
                items={data.newGamesStarted.map(g => g.name)}
                color="blue"
              />
            )}
            {data.milestonesReached.length > 0 && (
              <AchievementCard
                icon="🏆"
                title="Milestones Reached"
                count={data.milestonesReached.length}
                items={data.milestonesReached.map(m => `${m.game.name} - ${m.milestone}`)}
                color="amber"
              />
            )}
          </div>
        </Section>
      )}

      {/* Comparisons */}
      <Section title="Week Comparison" icon={<TrendingUp size={20} />}>
        <div className="grid md:grid-cols-2 gap-4">
          {/* vs Last Week */}
          <div className="p-4 bg-white/[0.02] rounded-xl border border-white/5">
            <h4 className="text-sm font-medium text-white/60 mb-3">vs Last Week</h4>
            <div className="space-y-2">
              <ComparisonRow
                label="Hours"
                diff={data.vsLastWeek.hoursDiff}
                unit="h"
                trend={data.vsLastWeek.trend}
              />
              <ComparisonRow
                label="Games"
                diff={data.vsLastWeek.gamesDiff}
                unit=""
                trend={data.vsLastWeek.trend}
              />
              <ComparisonRow
                label="Sessions"
                diff={data.vsLastWeek.sessionsDiff}
                unit=""
                trend={data.vsLastWeek.trend}
              />
            </div>
          </div>

          {/* vs Average */}
          <div className="p-4 bg-white/[0.02] rounded-xl border border-white/5">
            <h4 className="text-sm font-medium text-white/60 mb-3">vs 4-Week Average</h4>
            <div className="text-center py-2">
              <div className="text-4xl font-bold mb-2" style={{
                color: data.vsAverage.percentage >= 100 ? '#10b981' : data.vsAverage.percentage >= 80 ? '#3b82f6' : '#f59e0b'
              }}>
                {data.vsAverage.percentage.toFixed(0)}%
              </div>
              <p className="text-sm text-white/50 mb-1">of your average week</p>
              <p className="text-xs text-white/40">
                {data.vsAverage.hoursDiff >= 0 ? '+' : ''}{data.vsAverage.hoursDiff.toFixed(1)}h from average
              </p>
            </div>
          </div>
        </div>
      </Section>

      {/* Fun Equivalents */}
      <Section title="Fun Comparisons" icon={<Star size={20} />}>
        <div className="grid grid-cols-3 gap-4">
          <EquivalentCard
            icon={<Film size={24} />}
            value={data.movieEquivalent}
            label="Movies"
            subLabel="2hr each"
            color="purple"
          />
          <EquivalentCard
            icon={<Book size={24} />}
            value={data.bookEquivalent}
            label="Books"
            subLabel="8hr each"
            color="blue"
          />
          <EquivalentCard
            icon={<Tv size={24} />}
            value={data.tvEpisodeEquivalent}
            label="TV Episodes"
            subLabel="45min each"
            color="cyan"
          />
        </div>

        {data.bestValueGame && (
          <div className="mt-4 p-4 bg-gradient-to-r from-emerald-500/10 to-green-500/10 rounded-xl border border-emerald-500/20">
            <div className="flex items-center gap-3">
              <DollarSign size={32} className="text-emerald-400" />
              <div className="flex-1">
                <p className="text-sm text-white/50 mb-1">Best Value This Week</p>
                <p className="font-semibold text-white">{data.bestValueGame.game.name}</p>
                <p className="text-sm text-emerald-400">
                  ${data.bestValueGame.costPerHour.toFixed(2)} per hour
                </p>
              </div>
            </div>
          </div>
        )}
      </Section>
    </div>
  );
}

// Helper Components

function Section({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="p-6 bg-white/[0.02] rounded-xl border border-white/5">
      <div className="flex items-center gap-2 mb-4">
        <span className="text-purple-400">{icon}</span>
        <h3 className="text-lg font-semibold text-white">{title}</h3>
      </div>
      {children}
    </div>
  );
}

function StatCard({ icon, label, value, subValue, gradient, iconColor, valueColor }: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  subValue?: string;
  gradient: string;
  iconColor: string;
  valueColor: string;
}) {
  return (
    <div className={clsx('p-4 rounded-xl border border-white/10 bg-gradient-to-br', gradient)}>
      <div className={clsx('mb-3', iconColor)}>{icon}</div>
      <div className={clsx('text-3xl font-bold mb-1', valueColor)}>{value}</div>
      <div className="text-sm text-white/60">{label}</div>
      {subValue && <div className="text-xs text-white/40 mt-1">{subValue}</div>}
    </div>
  );
}

function MiniStatCard({ label, value, subValue, color }: {
  label: string;
  value: string | number;
  subValue?: string;
  color: 'purple' | 'blue' | 'cyan' | 'emerald';
}) {
  const colors = {
    purple: 'text-purple-400 border-purple-500/20',
    blue: 'text-blue-400 border-blue-500/20',
    cyan: 'text-cyan-400 border-cyan-500/20',
    emerald: 'text-emerald-400 border-emerald-500/20',
  };

  return (
    <div className={clsx('p-3 rounded-lg border bg-white/[0.02]', colors[color])}>
      <div className={clsx('text-2xl font-bold mb-1', colors[color].split(' ')[0])}>{value}</div>
      <div className="text-xs text-white/60">{label}</div>
      {subValue && <div className="text-[10px] text-white/40 mt-0.5">{subValue}</div>}
    </div>
  );
}

function InsightBadge({ icon, label, value, color }: {
  icon?: React.ReactNode;
  label: string;
  value?: string;
  color: 'purple' | 'blue' | 'emerald' | 'gray';
}) {
  const colors = {
    purple: 'bg-purple-500/20 border-purple-500/30 text-purple-300',
    blue: 'bg-blue-500/20 border-blue-500/30 text-blue-300',
    emerald: 'bg-emerald-500/20 border-emerald-500/30 text-emerald-300',
    gray: 'bg-white/5 border-white/10 text-white/50',
  };

  return (
    <div className={clsx('flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm', colors[color])}>
      {icon}
      <span>{label}</span>
      {value && <span className="font-semibold">{value}</span>}
    </div>
  );
}

function AchievementCard({ icon, title, count, items, color }: {
  icon: string;
  title: string;
  count: number;
  items: string[];
  color: 'emerald' | 'blue' | 'amber';
}) {
  const colors = {
    emerald: 'from-emerald-500/10 to-green-500/10 border-emerald-500/20',
    blue: 'from-blue-500/10 to-cyan-500/10 border-blue-500/20',
    amber: 'from-amber-500/10 to-orange-500/10 border-amber-500/20',
  };

  return (
    <div className={clsx('p-4 rounded-xl border bg-gradient-to-r', colors[color])}>
      <div className="flex items-start gap-3">
        <div className="text-3xl">{icon}</div>
        <div className="flex-1">
          <h4 className="font-semibold text-white mb-1">{title}</h4>
          <p className="text-sm text-white/60 mb-2">{count} {count === 1 ? 'game' : 'games'}</p>
          <ul className="space-y-1">
            {items.slice(0, 3).map((item, i) => (
              <li key={i} className="text-sm text-white/70 truncate">• {item}</li>
            ))}
            {items.length > 3 && (
              <li className="text-xs text-white/40">+{items.length - 3} more</li>
            )}
          </ul>
        </div>
      </div>
    </div>
  );
}

function ComparisonRow({ label, diff, unit, trend }: {
  label: string;
  diff: number;
  unit: string;
  trend: 'up' | 'down' | 'same';
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-white/70">{label}</span>
      <div className="flex items-center gap-1.5">
        {trend === 'up' && <TrendingUp size={14} className="text-emerald-400" />}
        {trend === 'down' && <TrendingDown size={14} className="text-red-400" />}
        {trend === 'same' && <Minus size={14} className="text-white/40" />}
        <span className={clsx(
          'text-sm font-semibold',
          trend === 'up' && 'text-emerald-400',
          trend === 'down' && 'text-red-400',
          trend === 'same' && 'text-white/40'
        )}>
          {diff > 0 ? '+' : ''}{diff.toFixed(1)}{unit}
        </span>
      </div>
    </div>
  );
}

function EquivalentCard({ icon, value, label, subLabel, color }: {
  icon: React.ReactNode;
  value: number;
  label: string;
  subLabel: string;
  color: 'purple' | 'blue' | 'cyan';
}) {
  const colors = {
    purple: 'text-purple-400',
    blue: 'text-blue-400',
    cyan: 'text-cyan-400',
  };

  return (
    <div className="p-4 bg-white/[0.02] rounded-xl border border-white/5 text-center">
      <div className={clsx('mb-2', colors[color])}>{icon}</div>
      <div className="text-2xl font-bold text-white mb-1">{value}</div>
      <div className="text-sm text-white/60">{label}</div>
      <div className="text-xs text-white/30 mt-1">{subLabel}</div>
    </div>
  );
}
